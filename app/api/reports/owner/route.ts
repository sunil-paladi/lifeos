import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireRole } from "@/app/lib/authorization";
import { parseMemberReportRange } from "@/app/lib/reports/member-report";
import {
  buildOwnerReportWhere,
  summarizeOwnerGymReport,
} from "@/app/lib/reports/owner-report";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await getAuthenticatedUser();
    if (!user) {
      return response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forbidden = requireRole(user, ["OWNER"]);
    if (forbidden) return forbidden;

    let range;
    try {
      range = parseMemberReportRange(new URL(request.url).searchParams);
    } catch (error) {
      if (error instanceof RangeError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const ownerMemberships = await prisma.gymMembership.findMany({
      where: {
        userId: user.id,
        role: "OWNER",
        status: "ACTIVE",
        gym: { is: { ownerId: user.id } },
      },
      select: {
        gymId: true,
        gym: { select: { name: true } },
      },
      orderBy: { joinedAt: "asc" },
    });
    const authorizedGymIds = [...new Set(
      ownerMemberships.map(({ gymId }) => gymId),
    )];

    if (!authorizedGymIds.length) {
      return NextResponse.json({
        range: { from: range.from, to: range.to, timezone: range.timezone },
        gyms: [],
      });
    }

    const filters = buildOwnerReportWhere(authorizedGymIds, range);
    const [memberships, payments, attendance, statusChanges] =
      await Promise.all([
        prisma.gymMembership.findMany({
          where: filters.memberships,
          select: {
            id: true,
            gymId: true,
            status: true,
            joinedAt: true,
            statusHistory: {
              where: {
                gymId: { in: authorizedGymIds },
                changedAt: { lt: range.endExclusiveAt },
              },
              orderBy: { changedAt: "asc" },
              select: { status: true, changedAt: true },
            },
          },
        }),
        prisma.payment.findMany({
          where: filters.membershipPayments,
          select: {
            gymId: true,
            amount: true,
            currency: true,
          },
        }),
        prisma.gymAttendance.findMany({
          where: filters.attendance,
          select: {
            gymId: true,
            memberMembershipId: true,
          },
        }),
        prisma.gymMembershipStatusHistory.findMany({
          where: filters.statusChanges,
          select: { gymId: true, status: true, changedAt: true },
        }),
      ]);
    const reportPayments = payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
    }));

    return NextResponse.json({
      range: { from: range.from, to: range.to, timezone: range.timezone },
      gyms: ownerMemberships.map(({ gymId, gym }) => ({
        id: gymId,
        name: gym.name,
        ...summarizeOwnerGymReport(
          gymId,
          range,
          memberships,
          reportPayments,
          attendance,
          statusChanges,
        ),
      })),
    });
  } catch (error) {
    console.error("Failed to generate owner report:", error);
    return NextResponse.json(
      { error: "Unable to load owner report" },
      { status: 500 },
    );
  }
}
