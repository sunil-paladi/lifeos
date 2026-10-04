import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER", "ONLINE"] as const;
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;
const MAX_AMOUNT = 99_999_999.99;

function parseAmount(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 && value <= MAX_AMOUNT ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 && parsed <= MAX_AMOUNT ? parsed : null;
  }

  return null;
}

function isValidCurrency(value: unknown): value is string {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value.trim());
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.some((option) => option === value);
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
    select: { id: true, memberMembershipId: true, membershipPlanId: true, ptSessionId: true, amount: true, gymId: true },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const payload = await parseJsonObject(request);
  if (!payload) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};

  if (payload.amount !== undefined) {
    const amount = parseAmount(payload.amount);
    if (amount === null) return NextResponse.json({ error: "Payment amount must be positive and within the supported range" }, { status: 400 });
    updateData.amount = new Prisma.Decimal(amount.toString());
  }

  if (payload.currency !== undefined) {
    if (!isValidCurrency(payload.currency)) {
      return NextResponse.json({ error: "Currency is required" }, { status: 400 });
    }
    updateData.currency = payload.currency.trim().toUpperCase();
  }

  if (payload.status !== undefined) {
    if (!isOneOf(payload.status, PAYMENT_STATUSES)) {
      return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
    }
    updateData.status = payload.status;
  }

  if (payload.paymentMethod !== undefined) {
    if (!isOneOf(payload.paymentMethod, PAYMENT_METHODS)) {
      return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
    }
    updateData.paymentMethod = payload.paymentMethod;
  }

  if (payload.notes !== undefined) {
    if (payload.notes !== null && (typeof payload.notes !== "string" || payload.notes.length > 2000)) {
      return NextResponse.json({ error: "notes must be a string of at most 2000 characters or null" }, { status: 400 });
    }
    updateData.notes = typeof payload.notes === "string" ? payload.notes.trim() || null : null;
  }

  if (payload.paidAt !== undefined) {
    const date = payload.paidAt === null ? null : typeof payload.paidAt === "string" ? new Date(payload.paidAt) : null;
    if (payload.paidAt !== null && (!date || Number.isNaN(date.getTime()))) {
      return NextResponse.json({ error: "paidAt must be a valid date string or null" }, { status: 400 });
    }
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
