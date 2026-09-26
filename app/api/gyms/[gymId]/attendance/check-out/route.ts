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
    return NextResponse.json({ error: "An active member membership is required to check out" }, { status: 403 });
  }

  const activeAttendance = await prisma.gymAttendance.findFirst({
    where: {
      gymId,
      memberMembershipId: membership.id,
      checkedOutAt: null,
    },
    orderBy: { checkedInAt: "desc" },
    select: { id: true },
  });

  if (!activeAttendance) {
    return NextResponse.json({ error: "No active check-in was found" }, { status: 409 });
  }

  const checkedOutAt = new Date();
  const result = await prisma.gymAttendance.updateMany({
    where: {
      id: activeAttendance.id,
      gymId,
      memberMembershipId: membership.id,
      checkedOutAt: null,
    },
    data: { checkedOutAt },
  });

  if (result.count === 0) {
    return NextResponse.json({ error: "This check-in has already been checked out" }, { status: 409 });
  }

  const attendance = await prisma.gymAttendance.findFirst({
    where: { id: activeAttendance.id, gymId, memberMembershipId: membership.id },
  });

  return NextResponse.json({ attendance });
}