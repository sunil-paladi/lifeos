import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { getActiveAttendanceMembership } from "@/app/lib/attendance";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
};

export async function POST(_request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId } = await context.params;
  const membership = await getActiveAttendanceMembership(user.id, gymId);

  if (!membership || membership.role !== "MEMBER") {
    return NextResponse.json({ error: "An active member membership is required to check in" }, { status: 403 });
  }

  try {
    const attendance = await prisma.$transaction(async (transaction) => {
      const activeAttendance = await transaction.gymAttendance.findFirst({
        where: {
          gymId,
          memberMembershipId: membership.id,
          checkedOutAt: null,
        },
        select: { id: true },
      });

      if (activeAttendance) return null;

      return transaction.gymAttendance.create({
        data: {
          gymId,
          memberMembershipId: membership.id,
        },
      });
    }, { isolationLevel: "Serializable" });

    if (!attendance) {
      return NextResponse.json({ error: "You are already checked in" }, { status: 409 });
    }

    return NextResponse.json({ attendance }, { status: 201 });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2034") {
      return NextResponse.json({ error: "You are already checked in" }, { status: 409 });
    }
    throw error;
  }
}