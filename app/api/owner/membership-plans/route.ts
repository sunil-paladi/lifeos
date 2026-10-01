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

export async function GET() {
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

  const plans = await prisma.gymMembershipPlan.findMany({
    where: { gymId: ownerMembership.gymId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    plans: plans.map((plan) => ({
      ...plan,
      price: plan.price.toString(),
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
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() || null : null;
  const currency = typeof payload.currency === "string" ? payload.currency.trim().toUpperCase() : "";

  const amount = parseMoney(payload.price);
  const durationDays = parsePositiveInt(payload.durationDays);

  if (!name) {
    return NextResponse.json({ error: "Plan name is required" }, { status: 400 });
  }

  if (amount === null) {
    return NextResponse.json({ error: "Plan price must be a positive number" }, { status: 400 });
  }

  if (!currency) {
    return NextResponse.json({ error: "Currency is required" }, { status: 400 });
  }

  if (durationDays === null) {
    return NextResponse.json({ error: "durationDays must be a positive integer" }, { status: 400 });
  }

  const plan = await prisma.gymMembershipPlan.create({
    data: {
      gymId: ownerMembership.gymId,
      name,
      description,
      price: new Prisma.Decimal(amount.toString()),
      currency,
      durationDays,
      isActive: payload.isActive === undefined ? true : Boolean(payload.isActive),
    },
  });

  return NextResponse.json({
    plan: {
      ...plan,
      price: plan.price.toString(),
    },
  }, { status: 201 });
}
