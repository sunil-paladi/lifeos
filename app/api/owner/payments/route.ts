import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { parseDateOnly, parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

const PAYMENT_METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER", "ONLINE"] as const;
const PAYMENT_PROVIDERS = ["MANUAL", "STRIPE", "RAZORPAY", "OTHER"] as const;
const PAYMENT_STATUSES = ["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"] as const;
const PAYMENT_TYPES = ["MEMBERSHIP", "PT_SESSION"] as const;
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

function isValidCurrency(value: unknown) {
  return typeof value === "string" && /^[A-Za-z]{3}$/.test(value.trim());
}

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.some((option) => option === value);
}

export async function GET(request: Request) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

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

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const memberId = searchParams.get("memberMembershipId");
  const paymentType = searchParams.get("paymentType");
  const from = searchParams.get("from");
  const to = searchParams.get("to");

  if (status !== null && !isOneOf(status, PAYMENT_STATUSES)) {
    return NextResponse.json({ error: "Invalid payment status filter" }, { status: 400 });
  }
  if (paymentType !== null && !isOneOf(paymentType, PAYMENT_TYPES)) {
    return NextResponse.json({ error: "Invalid payment type filter" }, { status: 400 });
  }
  if (memberId !== null && (!memberId.trim() || memberId.length > 128)) {
    return NextResponse.json({ error: "memberMembershipId must be a valid ID" }, { status: 400 });
  }

  const fromDate = from === null ? null : parseDateOnly(from);
  const toDate = to === null ? null : parseDateOnly(to);
  if ((from !== null && !fromDate) || (to !== null && !toDate)) {
    return NextResponse.json({ error: "from and to must be valid YYYY-MM-DD dates" }, { status: 400 });
  }
  if (fromDate && toDate && fromDate > toDate) {
    return NextResponse.json({ error: "from must be on or before to" }, { status: 400 });
  }

  const where: Record<string, unknown> = { gymId: ownerMembership.gymId };

  if (status !== null) where.status = status;
  if (memberId !== null) where.memberMembershipId = memberId;
  if (paymentType !== null) where.paymentType = paymentType;
  if (fromDate || toDate) {
    where.paidAt = {
      ...(fromDate ? { gte: fromDate } : {}),
      ...(toDate ? { lte: new Date(toDate.getTime() + 24 * 60 * 60 * 1000 - 1) } : {}),
    };
  }

  const payments = await prisma.payment.findMany({
    where,
    orderBy: [{ paidAt: "desc" }, { createdAt: "desc" }],
    include: {
      memberMembership: {
        select: {
          user: { select: { name: true } },
          role: true,
        },
      },
      membershipPlan: { select: { name: true } },
      ptSession: { select: { id: true } },
    },
  });

  return NextResponse.json({
    payments: payments.map((payment) => ({
      ...payment,
      amount: payment.amount.toString(),
    })),
  });
}

export async function POST(request: Request) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

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

  const payload = await parseJsonObject(request);
  if (!payload) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const memberMembershipId = typeof payload.memberMembershipId === "string" ? payload.memberMembershipId.trim() : "";
  const membershipPlanId = typeof payload.membershipPlanId === "string" ? payload.membershipPlanId.trim() || null : null;
  const ptSessionId = typeof payload.ptSessionId === "string" ? payload.ptSessionId.trim() || null : null;
  const amount = parseAmount(payload.amount);
  const currency = typeof payload.currency === "string" ? payload.currency.trim() : "";
  const paymentType = payload.paymentType;
  const paymentMethod = payload.paymentMethod === undefined ? "CASH" : payload.paymentMethod;
  const provider = payload.provider === undefined ? "MANUAL" : payload.provider;
  const status = payload.status === undefined ? "PAID" : payload.status;
  const notes = payload.notes;
  const providerPaymentId = payload.providerPaymentId;
  const paidAt = typeof payload.paidAt === "string" ? new Date(payload.paidAt) : null;

  if (!memberMembershipId || memberMembershipId.length > 128) {
    return NextResponse.json({ error: "memberMembershipId is required and must be a valid ID" }, { status: 400 });
  }
  if (
    (payload.membershipPlanId !== undefined && payload.membershipPlanId !== null && typeof payload.membershipPlanId !== "string") ||
    (payload.ptSessionId !== undefined && payload.ptSessionId !== null && typeof payload.ptSessionId !== "string") ||
    (membershipPlanId !== null && membershipPlanId.length > 128) ||
    (ptSessionId !== null && ptSessionId.length > 128)
  ) {
    return NextResponse.json({ error: "membershipPlanId and ptSessionId must be valid IDs or null" }, { status: 400 });
  }

  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: "Payment amount must be positive and within the supported range" }, { status: 400 });
  }

  if (!isValidCurrency(currency)) {
    return NextResponse.json({ error: "Currency must be a three-letter currency code" }, { status: 400 });
  }

  if (!isOneOf(paymentType, PAYMENT_TYPES)) {
    return NextResponse.json({ error: "paymentType must be MEMBERSHIP or PT_SESSION" }, { status: 400 });
  }

  if (!isOneOf(paymentMethod, PAYMENT_METHODS)) {
    return NextResponse.json({ error: "Invalid payment method" }, { status: 400 });
  }
  if (!isOneOf(provider, PAYMENT_PROVIDERS)) {
    return NextResponse.json({ error: "Invalid payment provider" }, { status: 400 });
  }
  if (!isOneOf(status, PAYMENT_STATUSES)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }
  if (
    (payload.paymentMethod !== undefined && typeof payload.paymentMethod !== "string") ||
    (payload.provider !== undefined && typeof payload.provider !== "string") ||
    (payload.status !== undefined && typeof payload.status !== "string")
  ) {
    return NextResponse.json({ error: "Payment enums must be strings" }, { status: 400 });
  }
  if (notes !== undefined && notes !== null && (typeof notes !== "string" || notes.length > 2000)) {
    return NextResponse.json({ error: "notes must be a string of at most 2000 characters" }, { status: 400 });
  }
  if (
    providerPaymentId !== undefined &&
    providerPaymentId !== null &&
    (typeof providerPaymentId !== "string" || !providerPaymentId.trim() || providerPaymentId.length > 255)
  ) {
    return NextResponse.json({ error: "providerPaymentId must be a non-empty string of at most 255 characters or null" }, { status: 400 });
  }
  if (
    payload.paidAt !== undefined &&
    payload.paidAt !== null &&
    (typeof payload.paidAt !== "string" || !paidAt || Number.isNaN(paidAt.getTime()))
  ) {
    return NextResponse.json({ error: "paidAt must be a valid date string or null" }, { status: 400 });
  }

  if (membershipPlanId && ptSessionId) {
    return NextResponse.json({ error: "A payment cannot reference both a membership plan and a PT session" }, { status: 400 });
  }

  if (!membershipPlanId && !ptSessionId) {
    return NextResponse.json({ error: "A payment must reference either a membership plan or PT session" }, { status: 400 });
  }
  
  if (paymentType === "MEMBERSHIP" && !membershipPlanId) {
  return NextResponse.json(
    { error: "Membership payment requires a membership plan" },
    { status: 400 },
  );
}

if (paymentType === "PT_SESSION" && !ptSessionId) {
  return NextResponse.json(
    { error: "PT payment requires a PT session" },
    { status: 400 },
  );
}
  const memberMembership = await prisma.gymMembership.findFirst({
    where: {
      id: memberMembershipId,
      gymId: ownerMembership.gymId,
    },
    select: { id: true, userId: true, role: true, gymId: true },
  });

 

  if (!memberMembership) {
    return NextResponse.json({ error: "Selected member membership not found in this gym" }, { status: 404 });
  }

  if (membershipPlanId) {
    const plan = await prisma.gymMembershipPlan.findFirst({
      where: {
        id: membershipPlanId,
        gymId: ownerMembership.gymId,
      },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Membership plan does not belong to this gym" }, { status: 400 });
    }
  }

  if (ptSessionId) {
    const session = await prisma.pTSession.findFirst({
      where: {
        id: ptSessionId,
        gymId: ownerMembership.gymId,
      },
      select: { id: true, clientMembershipId: true, ptPricingId: true },
    });

    if (!session) {
      return NextResponse.json({ error: "PT session does not belong to this gym" }, { status: 400 });
    }

    if (session.clientMembershipId !== memberMembershipId) {
      return NextResponse.json({ error: "PT payment member must match the PT session client" }, { status: 400 });
    }
  }

  const payment = await prisma.payment.create({
    data: {
      gymId: ownerMembership.gymId,
      memberMembershipId,
      membershipPlanId,
      ptSessionId,
      amount: new Prisma.Decimal(amount.toString()),
      currency: currency.toUpperCase(),
      paymentType,
      paymentMethod,
      provider,
      status,
      providerPaymentId: typeof providerPaymentId === "string" ? providerPaymentId.trim() || null : null,
      notes: typeof notes === "string" ? notes.trim() || null : null,
      paidAt: paidAt && !Number.isNaN(paidAt.getTime()) ? paidAt : null,
    },
    include: {
      memberMembership: {
        select: { user: { select: { name: true } } },
      },
      membershipPlan: { select: { name: true } },
      ptSession: { select: { id: true } },
    },
  });

  return NextResponse.json({
    payment: {
      ...payment,
      amount: payment.amount.toString(),
    },
  }, { status: 201 });
}
