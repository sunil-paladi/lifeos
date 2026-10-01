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
    select: {
      id: true,
      role: true,
      gymId: true,
      membershipPlan: {
        select: {
          id: true,
          name: true,
          price: true,
          currency: true,
          durationDays: true,
          description: true,
        },
      },
      membershipStartDate: true,
      membershipEndDate: true,
      gym: {
        select: { name: true },
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "No active gym membership found" }, { status: 404 });
  }

  return NextResponse.json({
    membership: {
      ...membership,
      membershipPlan: membership.membershipPlan ? {
        ...membership.membershipPlan,
        price: membership.membershipPlan.price.toString(),
      } : null,
    },
  });
}
