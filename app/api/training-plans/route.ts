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

  const totalWeeks = Number(body.totalWeeks);

  if (!Number.isInteger(totalWeeks) || totalWeeks < 1) {
    return NextResponse.json(
      {
        error: "totalWeeks must be a positive integer",
      },
      { status: 400 }
    );
  }

  const plan = await prisma.$transaction(async (tx) => {
    const trainingPlan = await tx.trainingPlan.create({
      data: {
        userId: session.user.id,
        name: body.name,
        description: body.description ?? null,
        totalWeeks,
        startDate: body.startDate
          ? new Date(body.startDate)
          : null,
        endDate: body.endDate
          ? new Date(body.endDate)
          : null,
        isActive: body.isActive ?? false,
      },
    });

    const phase = await tx.programPhase.create({
      data: {
        trainingPlanId: trainingPlan.id,
        name: "Phase 1",
        description: null,
        phaseOrder: 1,
        durationWeeks: totalWeeks,
        startWeek: 1,
        endWeek: totalWeeks,
      },
    });

    const dayNames = [
      "Monday",
      "Tuesday",
      "Wednesday",
      "Thursday",
      "Friday",
      "Saturday",
      "Sunday",
    ];

    for (let weekNumber = 1; weekNumber <= totalWeeks; weekNumber++) {
      const week = await tx.programWeek.create({
        data: {
          phaseId: phase.id,
          weekNumber,
        },
      });

      await tx.workoutDay.createMany({
        data: dayNames.map((name, index) => ({
          weekId: week.id,
          dayOfWeek: index + 1,
          name,
          description: null,
          isRestDay: false,
          dayOrder: index + 1,
        })),
      });
    }

    return trainingPlan;
  });

  return NextResponse.json(
    {
      success: true,
      plan,
    },
    { status: 201 }
  );
}
