import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const membership = await prisma.gymMembership.findFirst({
    where: {
      userId: user.id,
      status: "ACTIVE",
    },
    orderBy: { joinedAt: "desc" },
    select: { id: true },
  });

  if (!membership) {
    return NextResponse.json({ error: "No active gym membership found" }, { status: 404 });
  }

  const payments = await prisma.payment.findMany({
    where: { memberMembershipId: membership.id },
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
