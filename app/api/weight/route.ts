import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";


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

  const body = await request.json();

  const weight = Number(body.weight);

  if (!Number.isFinite(weight) || weight <= 0) {
    return NextResponse.json(
      { error: "Please provide a valid weight." },
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