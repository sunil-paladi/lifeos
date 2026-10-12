import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { writeAuditLog } from "@/app/lib/batch5-events";
import { parseJsonObject } from "@/app/lib/input-validation";
import {
  activeOwnerPaymentScope,
  canTransitionPaymentStatus,
  isOneOf,
  isValidPaymentCurrency,
  PAYMENT_METHODS,
  PAYMENT_STATUSES,
  parsePaymentAmount,
} from "@/app/lib/payments";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { id } = await context.params;
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

  const payment = await prisma.payment.findFirst({
    where: {
      id,
      gymId: ownerMembership.gymId,
      memberMembership: { is: { gymId: ownerMembership.gymId, role: "MEMBER" } },
    },
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
      ...activeOwnerPaymentScope(user.id),
    },
    orderBy: { joinedAt: "desc" },
    select: { gymId: true },
  });

  if (!ownerMembership) {
    return NextResponse.json({ error: "You are not an active owner of this gym" }, { status: 403 });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      id,
      gymId: ownerMembership.gymId,
      memberMembership: { is: { gymId: ownerMembership.gymId, role: "MEMBER" } },
    },
    select: {
      id: true,
      memberMembershipId: true,
      membershipPlanId: true,
      ptSessionId: true,
      amount: true,
      gymId: true,
      status: true,
      paidAt: true,
      ptSession: {
        select: {
          ptPricing: {
            select: { gymId: true, price: true, currency: true },
          },
        },
      },
    },
  });

  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }

  const payload = await parseJsonObject(request);
  if (!payload) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = {};
  const nextStatus = payload.status === undefined ? payment.status : payload.status;
  if (payload.status !== undefined && !isOneOf(payload.status, PAYMENT_STATUSES)) {
    return NextResponse.json({ error: "Invalid payment status" }, { status: 400 });
  }
  if (
    payload.status !== undefined &&
    !canTransitionPaymentStatus(payment.status, nextStatus as typeof payment.status)
  ) {
    return NextResponse.json(
      { error: `Payment status cannot change from ${payment.status} to ${String(nextStatus)}` },
      { status: 409 }
    );
  }

  const linkedPricing = payment.ptSession?.ptPricing ?? null;
  if (linkedPricing && linkedPricing.gymId !== ownerMembership.gymId) {
    return NextResponse.json({ error: "PT pricing does not belong to this gym" }, { status: 400 });
  }

  if (linkedPricing && (payload.amount !== undefined || payload.currency !== undefined)) {
    return NextResponse.json({ error: "PT session payment amounts and currency cannot be changed after recording" }, { status: 400 });
  }

  if (payload.amount !== undefined && !linkedPricing) {
    const amount = parsePaymentAmount(payload.amount);
    if (amount === null) return NextResponse.json({ error: "Payment amount must be positive and within the supported range" }, { status: 400 });
    updateData.amount = new Prisma.Decimal(amount.toString());
  }

  if (payload.currency !== undefined && !linkedPricing) {
    if (!isValidPaymentCurrency(payload.currency)) {
      return NextResponse.json({ error: "Currency is required" }, { status: 400 });
    }
    updateData.currency = payload.currency.trim().toUpperCase();
  }

  if (payload.status !== undefined) {
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
    if (nextStatus !== "PAID" || payload.paidAt === null) {
      return NextResponse.json({ error: "paidAt can only be changed while the payment is paid" }, { status: 400 });
    }
    updateData.paidAt = date;
  }
  if (nextStatus === "PAID" && payment.status !== "PAID") {
    updateData.paidAt = payload.paidAt ? new Date(payload.paidAt as string) : new Date();
  } else if (nextStatus !== "PAID" && payment.status === "PENDING") {
    updateData.paidAt = null;
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "No valid fields provided" }, { status: 400 });
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.payment.updateMany({
      where: {
        id,
        gymId: ownerMembership.gymId,
        memberMembershipId: payment.memberMembershipId,
        status: payment.status,
      },
      data: updateData,
    });
    if (result.count === 0) return null;

    const updatedPayment = await tx.payment.findFirst({
      where: {
        id,
        gymId: ownerMembership.gymId,
        memberMembership: { is: { gymId: ownerMembership.gymId, role: "MEMBER" } },
      },
      include: {
        memberMembership: { select: { user: { select: { name: true } } } },
        membershipPlan: { select: { name: true } },
        ptSession: { select: { id: true } },
      },
    });
    if (!updatedPayment) throw new Error("Updated payment could not be read");

    await writeAuditLog(tx, {
      gymId: ownerMembership.gymId,
      actorUserId: user.id,
      action: "PAYMENT_UPDATED",
      subjectType: "Payment",
      subjectId: updatedPayment.id,
      metadata: {
        fields: Object.keys(updateData),
      },
    });

    return updatedPayment;
  });

  if (!updated) {
    return NextResponse.json({ error: "Payment changed concurrently; reload it and try again" }, { status: 409 });
  }

  return NextResponse.json({ payment: { ...updated, amount: updated.amount.toString() } });
}
