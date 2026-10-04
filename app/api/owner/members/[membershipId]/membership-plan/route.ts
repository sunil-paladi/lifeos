import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { parseDateOnly } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ membershipId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { membershipId } = await context.params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;
  const planId = typeof payload.membershipPlanId === "string" ? payload.membershipPlanId : "";
  const startDate = parseDateOnly(payload.membershipStartDate);

  if (!planId) {
    return NextResponse.json({ error: "membershipPlanId is required" }, { status: 400 });
  }

  if (!startDate) {
    return NextResponse.json({ error: "membershipStartDate must be a YYYY-MM-DD date" }, { status: 400 });
  }

  const ownerMembership = await prisma.gymMembership.findFirst({
    where: {
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    orderBy: { joinedAt: "desc" },
    select: { gymId: true },
  });

  if (!ownerMembership) {
    return NextResponse.json({ error: "You are not an active owner of this gym" }, { status: 403 });
  }

  const targetMembership = await prisma.gymMembership.findFirst({
    where: {
      id: membershipId,
      gymId: ownerMembership.gymId,
    },
    select: { id: true, gymId: true, role: true },
  });

  if (!targetMembership) {
    return NextResponse.json({ error: "Target membership not found in this gym" }, { status: 404 });
  }

  const plan = await prisma.gymMembershipPlan.findFirst({
    where: {
      id: planId,
      gymId: ownerMembership.gymId,
      isActive: true,
    },
    select: { id: true, durationDays: true, price: true, currency: true, name: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Selected membership plan was not found in this gym" }, { status: 404 });
  }

  const endDate = new Date(startDate);
  endDate.setUTCDate(endDate.getUTCDate() + plan.durationDays);

  const updatedMembership = await prisma.gymMembership.update({
    where: { id: membershipId },
    data: {
      membershipPlanId: plan.id,
      membershipStartDate: startDate,
      membershipEndDate: endDate,
    },
    select: {
      id: true,
      gymId: true,
      membershipPlan: { select: { id: true, name: true, price: true, currency: true, durationDays: true } },
      membershipStartDate: true,
      membershipEndDate: true,
    },
  });

  return NextResponse.json({ membership: updatedMembership });
}
