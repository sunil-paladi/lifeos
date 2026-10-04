import { NextResponse } from "next/server";
import { Prisma } from "@/app/generated/prisma/client";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

function parseMoney(value: unknown): number | null {
  if (typeof value === "number") {
    return Number.isFinite(value) && value > 0 && value <= 99_999_999.99 ? value : null;
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) && parsed > 0 && parsed <= 99_999_999.99 ? parsed : null;
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

  const pricing = await prisma.pTPricing.findMany({
    where: { gymId: ownerMembership.gymId },
    orderBy: [{ isActive: "desc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({
    pricing: pricing.map((item) => ({
      ...item,
      price: item.price.toString(),
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
  const currency = typeof payload.currency === "string" ? payload.currency.trim().toUpperCase() : "";
  const description = typeof payload.description === "string" ? payload.description.trim() || null : null;
  const amount = parseMoney(payload.price);
  const duration = parsePositiveInt(payload.durationMinutes);

  if (payload.description !== undefined && payload.description !== null && typeof payload.description !== "string") {
    return NextResponse.json({ error: "description must be a string or null" }, { status: 400 });
  }

  if (!name || name.length > 120) {
    return NextResponse.json({ error: "Pricing name is required" }, { status: 400 });
  }

  if (amount === null) {
    return NextResponse.json({ error: "Price must be a positive number" }, { status: 400 });
  }

  if (!/^[A-Z]{3}$/.test(currency)) {
    return NextResponse.json({ error: "Currency must be a three-letter currency code" }, { status: 400 });
  }

  if (duration === null || duration > 480) {
    return NextResponse.json({ error: "durationMinutes must be an integer from 1 to 480" }, { status: 400 });
  }

  if (description !== null && description.length > 2000) {
    return NextResponse.json({ error: "description must be at most 2000 characters" }, { status: 400 });
  }

  if (payload.isActive !== undefined && typeof payload.isActive !== "boolean") {
    return NextResponse.json({ error: "isActive must be a boolean" }, { status: 400 });
  }

  const record = await prisma.pTPricing.create({
    data: {
      gymId: ownerMembership.gymId,
      name,
      description,
      price: new Prisma.Decimal(amount.toString()),
      currency,
      durationMinutes: duration,
      isActive: payload.isActive === undefined ? true : payload.isActive,
    },
  });

  return NextResponse.json({
    pricing: {
      ...record,
      price: record.price.toString(),
    },
  }, { status: 201 });
}
