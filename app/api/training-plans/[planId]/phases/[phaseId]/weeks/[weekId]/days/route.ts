import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// GET WORKOUT DAYS
// ========================================

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      planId: string;
      phaseId: string;
      weekId: string;
    }>;
  }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { planId, phaseId, weekId } =
    await params;

  const week = await prisma.programWeek.findFirst({
    where: {
      id: weekId,
      phaseId,
      phase: {
        id: phaseId,
        trainingPlanId: planId,
        trainingPlan: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!week) {
    return NextResponse.json(
      { error: "Program week not found" },
      { status: 404 }
    );
  }

  const workoutDays =
    await prisma.workoutDay.findMany({
      where: {
        weekId: week.id,
      },
      orderBy: {
        dayOrder: "asc",
      },
    });

  return NextResponse.json({
    workoutDays,
  });
}

// ========================================
// CREATE WORKOUT DAY
// ========================================

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      planId: string;
      phaseId: string;
      weekId: string;
    }>;
  }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { planId, phaseId, weekId } =
    await params;

  const body = await request.json();

  const week = await prisma.programWeek.findFirst({
    where: {
      id: weekId,
      phaseId,
      phase: {
        id: phaseId,
        trainingPlanId: planId,
        trainingPlan: {
          userId: session.user.id,
        },
      },
    },
  });

  if (!week) {
    return NextResponse.json(
      { error: "Program week not found" },
      { status: 404 }
    );
  }

  if (
    body.dayOfWeek === undefined ||
    !body.name ||
    body.dayOrder === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "dayOfWeek, name and dayOrder are required",
      },
      { status: 400 }
    );
  }

  const workoutDay =
    await prisma.workoutDay.create({
      data: {
        weekId: week.id,
        dayOfWeek: Number(body.dayOfWeek),
        name: body.name,
        description:
          body.description ?? null,
        isRestDay:
          body.isRestDay ?? false,
        dayOrder: Number(body.dayOrder),
      },
    });

  return NextResponse.json(
    {
      success: true,
      workoutDay,
    },
    { status: 201 }
  );
}
