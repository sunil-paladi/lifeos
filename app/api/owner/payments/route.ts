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

function parseDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isValidCurrency(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function isValidPaymentType(value: unknown) {
  return value === "MEMBERSHIP" || value === "PT_SESSION";
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

  const where: Record<string, unknown> = { gymId: ownerMembership.gymId };

  if (status) where.status = status;
  if (memberId) where.memberMembershipId = memberId;
  if (paymentType) where.paymentType = paymentType;
  if (from || to) {
    where.paidAt = {
      ...(from ? { gte: parseDate(from) ?? undefined } : {}),
      ...(to ? { lte: parseDate(to) ?? undefined } : {}),
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
  const memberMembershipId = typeof payload.memberMembershipId === "string" ? payload.memberMembershipId : "";
  const membershipPlanId = typeof payload.membershipPlanId === "string" ? payload.membershipPlanId : null;
  const ptSessionId = typeof payload.ptSessionId === "string" ? payload.ptSessionId : null;
  const amount = parseAmount(payload.amount);
  const currency = typeof payload.currency === "string" ? payload.currency.trim() : "";
  const paymentType = payload.paymentType;
  const paymentMethod = (payload.paymentMethod ?? "CASH") as string;
  const provider = (payload.provider ?? "MANUAL") as string;
  const status = (payload.status ?? "PAID") as string;
  const notes = typeof payload.notes === "string" ? payload.notes.trim() || null : null;
  const providerPaymentId = typeof payload.providerPaymentId === "string" ? payload.providerPaymentId.trim() || null : null;
  const paidAt = typeof payload.paidAt === "string" ? new Date(payload.paidAt) : null;

  if (!memberMembershipId) {
    return NextResponse.json({ error: "memberMembershipId is required" }, { status: 400 });
  }

  if (amount === null || amount <= 0) {
    return NextResponse.json({ error: "Payment amount must be positive" }, { status: 400 });
  }

  if (!isValidCurrency(currency)) {
    return NextResponse.json({ error: "Currency is required" }, { status: 400 });
  }

  if (!isValidPaymentType(paymentType)) {
    return NextResponse.json({ error: "paymentType must be MEMBERSHIP or PT_SESSION" }, { status: 400 });
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
      paymentType: paymentType as "MEMBERSHIP" | "PT_SESSION",
      paymentMethod: paymentMethod as "CASH" | "CARD" | "UPI" | "BANK_TRANSFER" | "OTHER" | "ONLINE",
      provider: provider as "MANUAL" | "STRIPE" | "RAZORPAY" | "OTHER",
      status: status as "PENDING" | "PAID" | "FAILED" | "REFUNDED" | "CANCELLED",
      providerPaymentId,
      notes,
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
