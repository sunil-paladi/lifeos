import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

function parseMoney(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

function parsePositiveInt(value: unknown): number | null {
  if (typeof value === "number" && Number.isInteger(value) && value > 0) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
  }

  return null;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { id } = await context.params;
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

  const existingPlan = await prisma.gymMembershipPlan.findFirst({
    where: { id, gymId: ownerMembership.gymId },
    select: { id: true },
  });

  if (!existingPlan) {
    return NextResponse.json({ error: "Membership plan not found" }, { status: 404 });
  }

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
  const updateData: Record<string, unknown> = {};

  if (payload.name !== undefined) {
    const name = typeof payload.name === "string" ? payload.name.trim() : "";
    if (!name) return NextResponse.json({ error: "Plan name cannot be empty" }, { status: 400 });
    updateData.name = name;
  }

  if (payload.description !== undefined) {
    updateData.description = typeof payload.description === "string" ? payload.description.trim() || null : null;
  }

  if (payload.price !== undefined) {
    const amount = parseMoney(payload.price);
    if (amount === null) return NextResponse.json({ error: "Plan price must be a positive number" }, { status: 400 });
    updateData.price = new Prisma.Decimal(amount.toString());
  }

  if (payload.currency !== undefined) {
    const value = typeof payload.currency === "string" ? payload.currency.trim().toUpperCase() : "";
    if (!value) return NextResponse.json({ error: "Currency is required" }, { status: 400 });
    updateData.currency = value;
  }

  if (payload.durationDays !== undefined) {
    const days = parsePositiveInt(payload.durationDays);
    if (days === null) return NextResponse.json({ error: "durationDays must be a positive integer" }, { status: 400 });
    updateData.durationDays = days;
  }

  if (payload.isActive !== undefined) {
    if (typeof payload.isActive !== "boolean") {
      return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
    }
    updateData.isActive = payload.isActive;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields were provided" }, { status: 400 });
  }

  const plan = await prisma.gymMembershipPlan.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({
    plan: {
      ...plan,
      price: plan.price.toString(),
    },
  });
}

export async function DELETE(_request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { id } = await context.params;
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

  const plan = await prisma.gymMembershipPlan.findFirst({
    where: { id, gymId: ownerMembership.gymId },
    select: { id: true },
  });

  if (!plan) {
    return NextResponse.json({ error: "Membership plan not found" }, { status: 404 });
  }

  await prisma.gymMembershipPlan.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true, message: "Membership plan deactivated" });
}
