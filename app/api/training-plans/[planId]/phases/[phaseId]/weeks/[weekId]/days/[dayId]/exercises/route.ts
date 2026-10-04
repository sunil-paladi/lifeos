import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { jsonError, logServerError } from "@/app/lib/error-response";
import { parseJsonObject } from "@/app/lib/input-validation";
import { getOwnedTrainingPlan } from "@/app/lib/training-plans";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

interface RouteParams {
  planId: string;
  phaseId: string;
  weekId: string;
  dayId: string;
}

async function getOwnedWorkoutDay(
  params: RouteParams,
  userId: string
) {
  const access = await getOwnedTrainingPlan(
    params.planId,
    userId
  );

  if (!access.ok) {
    return null;
  }

  return prisma.workoutDay.findFirst({
    where: {
      id: params.dayId,
      weekId: params.weekId,
      week: {
        id: params.weekId,
        phaseId: params.phaseId,
        phase: {
          id: params.phaseId,
          trainingPlanId: params.planId,
          trainingPlan: {
            id: params.planId,
            userId,
            gymId: access.plan.gymId,
          },
        },
      },
    },
  });
}

// ========================================
// GET PROGRAM EXERCISES
// ========================================

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    const workoutDay =
      await getOwnedWorkoutDay(
        resolvedParams,
        session.user.id
      );

    if (!workoutDay) {
      return NextResponse.json(
        { error: "Workout day not found" },
        { status: 404 }
      );
    }

    const programExercises =
      await prisma.programExercise.findMany({
        where: {
          workoutDayId: workoutDay.id,
        },
        include: {
          exercise: true,
        },
        orderBy: {
          exerciseOrder: "asc",
        },
      });

    return NextResponse.json({
      programExercises,
    });
  } catch (error) {
    logServerError(
      "GET /api/training-plans/[planId]/phases/[phaseId]/weeks/[weekId]/days/[dayId]/exercises",
      error
    );

    return jsonError("Failed to load exercises", 500);
  }
}

// ========================================
// CREATE PROGRAM EXERCISE
// ========================================

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    const workoutDay =
      await getOwnedWorkoutDay(
        resolvedParams,
        session.user.id
      );

    if (!workoutDay) {
      return NextResponse.json(
        { error: "Workout day not found" },
        { status: 404 }
      );
    }

    const body = await parseJsonObject(request);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be a valid JSON object" },
        { status: 400 }
      );
    }

    const exerciseId = typeof body.exerciseId === "string" ? body.exerciseId.trim() : "";

    const sets = body.sets ?? 3;
    const reps = body.reps ?? 10;
    const restSeconds =
      body.restSeconds == null
        ? 60
        : body.restSeconds;

    if (
      !exerciseId ||
      exerciseId.length > 128 ||
      typeof sets !== "number" ||
      !Number.isInteger(sets) ||
      sets < 1 ||
      sets > 100 ||
      typeof reps !== "number" ||
      !Number.isInteger(reps) ||
      reps < 1 ||
      reps > 1000 ||
      typeof restSeconds !== "number" ||
      !Number.isInteger(restSeconds) ||
      restSeconds < 0 ||
      restSeconds > 3600
    ) {
      return NextResponse.json(
        { error: "Invalid exercise settings" },
        { status: 400 }
      );
    }

    const exercise =
      await prisma.exercise.findUnique({
        where: {
          id: exerciseId,
        },
      });

    if (!exercise) {
      return NextResponse.json(
        { error: "Exercise not found" },
        { status: 404 }
      );
    }

    const existing =
      await prisma.programExercise.findFirst({
        where: {
          workoutDayId: workoutDay.id,
          exerciseId,
        },
      });

    if (existing) {
      return NextResponse.json(
        {
          error:
            "Exercise already exists in this workout day",
        },
        { status: 409 }
      );
    }

    const maxOrder =
      await prisma.programExercise.aggregate({
        where: {
          workoutDayId: workoutDay.id,
        },
        _max: {
          exerciseOrder: true,
        },
      });

    const nextOrder =
      (maxOrder._max.exerciseOrder ?? 0) + 1;

    const programExercise =
      await prisma.programExercise.create({
        data: {
          workoutDayId: workoutDay.id,
          exerciseId,
          exerciseOrder: nextOrder,
          sets,
          minReps: reps,
          maxReps: reps,
          restSeconds,
        },
        include: {
          exercise: true,
        },
      });

    return NextResponse.json(
      {
        success: true,
        programExercise,
      },
      { status: 201 }
    );
  } catch (error) {
    logServerError(
      "POST /api/training-plans/[planId]/phases/[phaseId]/weeks/[weekId]/days/[dayId]/exercises",
      error
    );

    return jsonError("Failed to create exercise", 500);
  }
}

// ========================================
// UPDATE PROGRAM EXERCISE
// ========================================

export async function PATCH(
  request: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    const workoutDay =
      await getOwnedWorkoutDay(
        resolvedParams,
        session.user.id
      );

    if (!workoutDay) {
      return NextResponse.json(
        { error: "Workout day not found" },
        { status: 404 }
      );
    }

    const body = await parseJsonObject(request);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be a valid JSON object" },
        { status: 400 }
      );
    }

    const exerciseId = typeof body.exerciseId === "string" ? body.exerciseId.trim() : "";
    if (!exerciseId || exerciseId.length > 128) {
      return NextResponse.json({ error: "exerciseId must be a valid ID" }, { status: 400 });
    }

    console.log("🔍 PATCH DEBUG:", {
      planId: resolvedParams.planId,
      phaseId: resolvedParams.phaseId,
      weekId: resolvedParams.weekId,
      dayId: resolvedParams.dayId,
      workoutDayId: workoutDay.id,
      exerciseId,
    });

    const dbExercises =
      await prisma.programExercise.findMany({
        where: {
          workoutDayId: workoutDay.id,
        },
        select: {
          id: true,
          exerciseId: true,
          exerciseOrder: true,
        },
        orderBy: {
          exerciseOrder: "asc",
        },
      });

    console.log(
      "🔍 DB PROGRAM EXERCISES:",
      dbExercises
    );

    const existing =
      await prisma.programExercise.findFirst({
        where: {
          workoutDayId: workoutDay.id,
          exerciseId,
        },
      });

    if (!existing) {
      return NextResponse.json(
        { error: "Program exercise not found" },
        { status: 404 }
      );
    }

    const data: {
      sets?: number;
      minReps?: number;
      maxReps?: number;
      restSeconds?: number | null;
      targetWeight?: number | null;
    } = {};

    if (body.sets !== undefined) {
      const sets = body.sets;

      if (typeof sets !== "number" || !Number.isInteger(sets) || sets < 1 || sets > 100) {
        return NextResponse.json(
          { error: "Invalid sets" },
          { status: 400 }
        );
      }

      data.sets = sets;
    }

    if (body.reps !== undefined) {
      const reps = body.reps;

      if (typeof reps !== "number" || !Number.isInteger(reps) || reps < 1 || reps > 1000) {
        return NextResponse.json(
          { error: "Invalid reps" },
          { status: 400 }
        );
      }

      data.minReps = reps;
      data.maxReps = reps;
    }

    if (body.restSeconds !== undefined) {
      const restSeconds =
        body.restSeconds == null
          ? null
          : body.restSeconds;

      if (
        restSeconds !== null &&
        (typeof restSeconds !== "number" ||
          !Number.isInteger(restSeconds) ||
          restSeconds < 0 ||
          restSeconds > 3600)
      ) {
        return NextResponse.json(
          { error: "Invalid restSeconds" },
          { status: 400 }
        );
      }

      data.restSeconds = restSeconds;
    }

    if (body.targetWeight !== undefined) {
      const targetWeight =
        body.targetWeight == null
          ? null
          : body.targetWeight;

      if (
        targetWeight !== null &&
        (typeof targetWeight !== "number" || !Number.isFinite(targetWeight) || targetWeight < 0 || targetWeight > 1000)
      ) {
        return NextResponse.json(
          { error: "Invalid targetWeight" },
          { status: 400 }
        );
      }

      data.targetWeight = targetWeight;
    }

    const updated =
      await prisma.programExercise.update({
        where: {
          id: existing.id,
        },
        data,
        include: {
          exercise: true,
        },
      });

    return NextResponse.json({
      success: true,
      programExercise: updated,
    });
  } catch (error) {
    logServerError(
      "PATCH /api/training-plans/[planId]/phases/[phaseId]/weeks/[weekId]/days/[dayId]/exercises",
      error
    );

    return jsonError("Failed to update exercise", 500);
  }
}

// ========================================
// DELETE PROGRAM EXERCISE
// ========================================

export async function DELETE(
  request: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    const workoutDay =
      await getOwnedWorkoutDay(
        resolvedParams,
        session.user.id
      );

    if (!workoutDay) {
      return NextResponse.json(
        { error: "Workout day not found" },
        { status: 404 }
      );
    }

    const body = await parseJsonObject(request);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be a valid JSON object" },
        { status: 400 }
      );
    }

    const exerciseId = typeof body.exerciseId === "string" ? body.exerciseId.trim() : "";
    if (!exerciseId || exerciseId.length > 128) {
      return NextResponse.json({ error: "exerciseId must be a valid ID" }, { status: 400 });
    }

    const existing =
      await prisma.programExercise.findFirst({
        where: {
          workoutDayId: workoutDay.id,
          exerciseId,
        },
      });

    if (!existing) {
      return NextResponse.json(
        { error: "Program exercise not found" },
        { status: 404 }
      );
    }

    await prisma.programExercise.delete({
      where: {
        id: existing.id,
      },
    });

    const remaining =
      await prisma.programExercise.findMany({
        where: {
          workoutDayId: workoutDay.id,
        },
        orderBy: {
          exerciseOrder: "asc",
        },
        select: {
          id: true,
        },
      });

    for (
      let index = 0;
      index < remaining.length;
      index++
    ) {
      await prisma.programExercise.update({
        where: {
          id: remaining[index].id,
        },
        data: {
          exerciseOrder: index + 1,
        },
      });
    }

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logServerError(
      "DELETE /api/training-plans/[planId]/phases/[phaseId]/weeks/[weekId]/days/[dayId]/exercises",
      error
    );

    return jsonError("Failed to delete exercise", 500);
  }
}

// ========================================
// REORDER PROGRAM EXERCISE
// ========================================

export async function PUT(
  request: Request,
  {
    params,
  }: {
    params: Promise<RouteParams>;
  }
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;

    const workoutDay =
      await getOwnedWorkoutDay(
        resolvedParams,
        session.user.id
      );

    if (!workoutDay) {
      return NextResponse.json(
        { error: "Workout day not found" },
        { status: 404 }
      );
    }

    const body = await parseJsonObject(request);
    if (!body) {
      return NextResponse.json(
        { error: "Request body must be a valid JSON object" },
        { status: 400 }
      );
    }

    const exerciseId = typeof body.exerciseId === "string" ? body.exerciseId.trim() : "";
    if (!exerciseId || exerciseId.length > 128) {
      return NextResponse.json({ error: "exerciseId must be a valid ID" }, { status: 400 });
    }

    const direction =
      body.direction === "up" ||
      body.direction === "down"
        ? body.direction
        : null;

    if (!direction) {
      return NextResponse.json(
        { error: "Invalid direction" },
        { status: 400 }
      );
    }

    const current =
      await prisma.programExercise.findFirst({
        where: {
          workoutDayId: workoutDay.id,
          exerciseId,
        },
      });

    if (!current) {
      return NextResponse.json(
        { error: "Program exercise not found" },
        { status: 404 }
      );
    }

    const exercises =
      await prisma.programExercise.findMany({
        where: {
          workoutDayId: workoutDay.id,
        },
        orderBy: {
          exerciseOrder: "asc",
        },
      });

    const currentIndex =
      exercises.findIndex(
        (exercise) =>
          exercise.id === current.id
      );

    const newIndex =
      direction === "up"
        ? currentIndex - 1
        : currentIndex + 1;

    if (
      currentIndex === -1 ||
      newIndex < 0 ||
      newIndex >= exercises.length
    ) {
      return NextResponse.json({
        success: true,
        unchanged: true,
      });
    }

    const other =
      exercises[newIndex];

    await prisma.$transaction([
      prisma.programExercise.update({
        where: {
          id: current.id,
        },
        data: {
          exerciseOrder: 0,
        },
      }),
      prisma.programExercise.update({
        where: {
          id: other.id,
        },
        data: {
          exerciseOrder:
            current.exerciseOrder,
        },
      }),
      prisma.programExercise.update({
        where: {
          id: current.id,
        },
        data: {
          exerciseOrder:
            other.exerciseOrder,
        },
      }),
    ]);

    return NextResponse.json({
      success: true,
    });
  } catch (error) {
    logServerError(
      "PUT /api/training-plans/[planId]/phases/[phaseId]/weeks/[weekId]/days/[dayId]/exercises",
      error
    );

    return jsonError("Failed to reorder exercise", 500);
  }
}
