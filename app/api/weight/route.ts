import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// GET WEIGHT HISTORY
// ========================================

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const weightEntries = await prisma.weightEntry.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      recordedAt: "desc",
    },
  });

  return NextResponse.json({
    weightEntries,
  });
}

// ========================================
// ADD WEIGHT ENTRY
// ========================================

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await parseJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const weight = body.weight;
  if (typeof weight !== "number" || !Number.isFinite(weight) || weight < 1 || weight > 1000) {
    return NextResponse.json(
      { error: "weight must be a number from 1 to 1000" },
      { status: 400 }
    );
  }

  const result = await prisma.$transaction(async (tx) => {
    const weightEntry = await tx.weightEntry.create({
      data: {
        userId: session.user.id,
        weight,
      },
    });

    const user = await tx.user.update({
      where: {
        id: session.user.id,
      },
      data: {
        weight,
      },
    });

    return {
      weightEntry,
      user,
    };
  });

  return NextResponse.json({
    success: true,
    weightEntry: result.weightEntry,
    user: result.user,
  });
}
