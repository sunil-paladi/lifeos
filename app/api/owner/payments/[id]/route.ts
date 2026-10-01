import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

function parseAmount(value: unknown): number | null {
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

function isValidCurrency(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
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

  const payment = await prisma.payment.findFirst({
    where: { id, gymId: ownerMembership.gymId },
    include: {
      memberMembership: {
        select: { user: { select: { name: true } }, role: true },
      },
      membershipPlan: { select: { name: true } },
      ptSession: { select: { id: true } },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  return NextResponse.json({ payment: { ...payment, amount: payment.amount.toString() } });
}

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

  const payment = await prisma.payment.findFirst({
    where: { id, gymId: ownerMembership.gymId },
    select: { id: true, memberMembershipId: true, membershipPlanId: true, ptSessionId: true, amount: true, paymentType: true, gymId: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
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

  if (payload.amount !== undefined) {
    const amount = parseAmount(payload.amount);
    if (amount === null) return NextResponse.json({ error: "Payment amount must be positive" }, { status: 400 });
    updateData.amount = new Prisma.Decimal(amount.toString());
  }

  if (payload.currency !== undefined) {
    if (!isValidCurrency(payload.currency)) {
      return NextResponse.json({ error: "Currency is required" }, { status: 400 });
    }
    updateData.currency = String(payload.currency).trim().toUpperCase();
  }

  if (payload.status !== undefined) {
    const status = payload.status as string;
    if (!["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"].includes(status)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    updateData.status = status;
  }

  if (payload.paymentMethod !== undefined) {
    const method = payload.paymentMethod as string;
    if (!["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER", "ONLINE"].includes(method)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }
    updateData.paymentMethod = method;
  }

  if (payload.notes !== undefined) {
    updateData.notes = typeof payload.notes === "string" ? payload.notes.trim() || null : null;
  }

  if (payload.paidAt !== undefined) {
    const date = typeof payload.paidAt === "string" ? new Date(payload.paidAt) : null;
    if (date && Number.isNaN(date.getTime())) return NextResponse.json({ error: "paidAt must be a valid date" }, { status: 400 });
    updateData.paidAt = date;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const updated = await prisma.payment.update({
    where: { id },
    data: updateData,
    include: {
      memberMembership: { select: { user: { select: { name: true } } } },
      membershipPlan: { select: { name: true } },
      ptSession: { select: { id: true } },
    },
  });

  return NextResponse.json({ payment: { ...updated, amount: updated.amount.toString() } });
}
