import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { activeMemberPaymentMembershipScope, memberPaymentQueryScope } from "@/app/lib/payments";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const membership = await prisma.gymMembership.findFirst({
    where: {
      ...activeMemberPaymentMembershipScope(user.id),
    },
    orderBy: { joinedAt: "desc" },
    select: { id: true, gymId: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "No active gym membership found" }, { status: 404 });
  }

  const payments = await prisma.payment.findMany({
    where: {
      ...memberPaymentQueryScope(membership.id),
      gymId: membership.gymId,
    },
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    include: {
      membershipPlan: { select: { name: true } },
      ptSession: { select: { id: true, status: true } },
    },
  });

  return NextResponse.json({
    payments: payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
    })),
  });
}
