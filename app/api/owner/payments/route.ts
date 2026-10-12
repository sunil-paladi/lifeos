import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { writeAuditLog } from "@/app/lib/batch5-events";
import { parseDateOnly, parseJsonObject } from "@/app/lib/input-validation";
import {
  hasPrismaErrorCode,
  activeOwnerPaymentScope,
  isDuplicatePTSessionPayment,
  isOneOf,
  isPTSessionAvailableForPayment,
  isValidPaymentCurrency,
  PAYMENT_METHODS,
  PAYMENT_PROVIDERS,
  PAYMENT_STATUSES,
  PAYMENT_TYPES,
  parsePaymentAmount,
  paymentQueryScope,
  ptSessionPaymentQueryScope,
} from "@/app/lib/payments";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const ownerMembership = await prisma.gymMembership.findFirst({
    where: {
      ...activeOwnerPaymentScope(user.id),
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

  const where: Record<string, unknown> = paymentQueryScope(ownerMembership.gymId);

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
      ...activeOwnerPaymentScope(user.id),
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
  const requestedAmount = parsePaymentAmount(payload.amount);
  const requestedCurrency = typeof payload.currency === "string" ? payload.currency.trim() : "";
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
  if (status === "REFUNDED") {
    return NextResponse.json({ error: "A payment must be recorded as paid before it can be refunded" }, { status: 400 });
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
  if (status !== "PAID" && payload.paidAt != null) {
    return NextResponse.json({ error: "paidAt can only be supplied for a paid payment" }, { status: 400 });
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
      role: "MEMBER",
      status: "ACTIVE",
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
        isActive: true,
      },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "Active membership plan not found in this gym" }, { status: 400 });
    }
  }

  let amount = requestedAmount;
  let currency = requestedCurrency;

  if (ptSessionId) {
    const session = await prisma.pTSession.findFirst({
      where: {
        id: ptSessionId,
        gymId: ownerMembership.gymId,
      },
      select: {
        id: true,
        clientMembershipId: true,
        status: true,
        ptPricing: {
          select: {
            gymId: true,
            price: true,
            currency: true,
          },
        },
      },
    });

    if (!session) {
      return NextResponse.json({ error: "PT session does not belong to this gym" }, { status: 400 });
    }

    if (session.clientMembershipId !== memberMembershipId) {
      return NextResponse.json({ error: "PT payment member must match the PT session client" }, { status: 400 });
    }

    if (!isPTSessionAvailableForPayment(session.status)) {
      return NextResponse.json({ error: "Cancelled or missed PT sessions cannot be paid" }, { status: 409 });
    }

    if (session.ptPricing) {
      if (session.ptPricing.gymId !== ownerMembership.gymId) {
        return NextResponse.json({ error: "PT pricing does not belong to this gym" }, { status: 400 });
      }
      amount = parsePaymentAmount(session.ptPricing.price.toString());
      currency = session.ptPricing.currency;
    }
  }

  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: "Payment amount must be positive and within the supported range" }, { status: 400 });
  }

  if (!isValidPaymentCurrency(currency)) {
    return NextResponse.json({ error: "Currency must be a three-letter currency code" }, { status: 400 });
  }

  const payment = await prisma.$transaction(async (tx) => {
    if (ptSessionId) {
      const existingPayment = await tx.payment.findFirst({
        where: ptSessionPaymentQueryScope(ownerMembership.gymId, ptSessionId),
        select: { id: true },
      });
      if (isDuplicatePTSessionPayment(existingPayment)) return null;
    }
    if (typeof providerPaymentId === "string" && providerPaymentId.trim()) {
      const existingProviderPayment = await tx.payment.findFirst({
        where: {
          gymId: ownerMembership.gymId,
          provider,
          providerPaymentId: providerPaymentId.trim(),
        },
        select: { id: true },
      });
      if (existingProviderPayment) return null;
    }

    const createdPayment = await tx.payment.create({
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
        paidAt: status === "PAID" ? paidAt ?? new Date() : null,
      },
      include: {
        memberMembership: {
          select: { user: { select: { name: true } } },
        },
        membershipPlan: { select: { name: true } },
        ptSession: { select: { id: true } },
      },
    });

    await writeAuditLog(tx, {
      gymId: ownerMembership.gymId,
      actorUserId: user.id,
      action: "PAYMENT_CREATED",
      subjectType: "Payment",
      subjectId: createdPayment.id,
      metadata: { paymentType, status },
    });

    return createdPayment;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }).catch((error: unknown) => {
    if (hasPrismaErrorCode(error, "P2034") || hasPrismaErrorCode(error, "P2002")) return null;
    throw error;
  });

  if (!payment) {
    return NextResponse.json({ error: "A duplicate payment was detected for this session or provider transaction" }, { status: 409 });
  }

  return NextResponse.json({
    payment: {
      ...payment,
      amount: payment.amount.toString(),
    },
  }, { status: 201 });
}
