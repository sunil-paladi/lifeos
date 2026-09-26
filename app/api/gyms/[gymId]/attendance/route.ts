import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import {
  attendanceRecordSelect,
  getActiveAttendanceMembership,
  parseAttendanceDate,
} from "@/app/lib/attendance";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId } = await context.params;
  const membership = await getActiveAttendanceMembership(user.id, gymId);

  if (!membership) {
    return NextResponse.json({ error: "You are not an active member of this gym" }, { status: 403 });
  }

  const url = new URL(request.url);
  const membershipIds = url.searchParams.getAll("memberMembershipId");
  if (membershipIds.length > 1 || (membershipIds.length === 1 && !membershipIds[0].trim())) {
    return NextResponse.json({ error: "memberMembershipId must be supplied once as a non-empty value" }, { status: 400 });
  }
  const requestedMembershipId = membershipIds[0] ?? null;
  const fromValue = url.searchParams.get("from");
  const toValue = url.searchParams.get("to");
  const from = parseAttendanceDate(fromValue);
  const to = parseAttendanceDate(toValue, true);

  if (from.invalid || to.invalid || (from.date && to.date && from.date > to.date)) {
    return NextResponse.json({ error: "Invalid attendance date range" }, { status: 400 });
  }

  let targetMembershipId = membership.id;

  if (membership.role === "OWNER" || membership.role === "TRAINER") {
    if (requestedMembershipId) {
      const targetMembership = await prisma.gymMembership.findFirst({
        where: {
          id: requestedMembershipId,
          gymId,
          role: "MEMBER",
          status: "ACTIVE",
        },
        select: { id: true },
      });

      if (!targetMembership) {
        return NextResponse.json({ error: "Active gym member not found" }, { status: 404 });
      }

      if (membership.role === "TRAINER") {
        const assignment = await prisma.trainerClient.findUnique({
          where: {
            gymId_trainerMembershipId_clientMembershipId: {
              gymId,
              trainerMembershipId: membership.id,
              clientMembershipId: targetMembership.id,
            },
          },
          select: { id: true },
        });

        if (!assignment) {
          return NextResponse.json({ error: "You are not assigned to this member" }, { status: 403 });
        }
      }

      targetMembershipId = targetMembership.id;
    }
  } else if (requestedMembershipId && requestedMembershipId !== membership.id) {
    return NextResponse.json({ error: "You can only view your own attendance" }, { status: 403 });
  }

  let allowedMembershipIds = [targetMembershipId];

  if (membership.role === "OWNER" && !requestedMembershipId) {
    const gymMembers = await prisma.gymMembership.findMany({
      where: { gymId, role: "MEMBER" },
      select: { id: true },
    });
    allowedMembershipIds = gymMembers.map(({ id }) => id);
  } else if (membership.role === "TRAINER" && !requestedMembershipId) {
    const assignments = await prisma.trainerClient.findMany({
      where: {
        gymId,
        trainerMembershipId: membership.id,
        clientMembership: {
          is: { gymId, role: "MEMBER", status: "ACTIVE" },
        },
      },
      select: { clientMembershipId: true },
    });
    allowedMembershipIds = assignments.map(({ clientMembershipId }) => clientMembershipId);
  }

  const attendance = await prisma.gymAttendance.findMany({
    where: {
      gymId,
      memberMembershipId: { in: allowedMembershipIds },
      checkedInAt: {
        ...(from.date ? { gte: from.date } : {}),
        ...(to.date ? { lte: to.date } : {}),
      },
    },
    select: attendanceRecordSelect,
    orderBy: { checkedInAt: "desc" },
  });

  return NextResponse.json({ attendance });
}