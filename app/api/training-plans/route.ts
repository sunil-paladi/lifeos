import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// GET TRAINING PLANS
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

  const plans = await prisma.trainingPlan.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    plans,
  });
}

// ========================================
// CREATE TRAINING PLAN
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

  if (!body.name || !body.totalWeeks) {
    return NextResponse.json(
      {
        error: "name and totalWeeks are required",
      },
      { status: 400 }
    );
  }

  const plan = await prisma.trainingPlan.create({
    data: {
      userId: session.user.id,
      name: body.name,
      description: body.description ?? null,
      totalWeeks: Number(body.totalWeeks),
      startDate: body.startDate
        ? new Date(body.startDate)
        : null,
      endDate: body.endDate
        ? new Date(body.endDate)
        : null,
      isActive: body.isActive ?? false,
    },
  });

  return NextResponse.json(
    {
      success: true,
      plan,
    },
    { status: 201 }
  );
}
