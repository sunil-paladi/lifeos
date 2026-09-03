import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

import { auth } from "@/app/lib/auth";

interface RouteParams {
  planId: string;
  phaseId: string;
  weekId: string;
  dayId: string;
}

/* =========================================================
   GET PROGRAM EXERCISES
   ========================================================= */

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

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      planId,
      phaseId,
      weekId,
      dayId,
    } = await params;

    const workoutDay =
      await prisma.workoutDay.findFirst({
        where: {
          id: dayId,
          weekId,
          week: {
            id: weekId,
            phaseId,
            phase: {
              id: phaseId,
              trainingPlanId: planId,
              trainingPlan: {
                id: planId,
                userId: session.user.id,
              },
            },
          },
        },
        include: {
          programExercises: {
            include: {
              exercise: true,
            },
            orderBy: {
              exerciseOrder: "asc",
            },
          },
        },
      });

    if (!workoutDay) {
      return NextResponse.json(
        { error: "Workout day not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      programExercises:
        workoutDay.programExercises,
    });
  } catch (error) {
    console.error(
      "Failed to load program exercises:",
      error
    );

    return NextResponse.json(
      { error: "Failed to load program exercises" },
      { status: 500 }
    );
  }
}

/* =========================================================
   CREATE PROGRAM EXERCISE
   ========================================================= */

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

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const {
      planId,
      phaseId,
      weekId,
      dayId,
    } = await params;

    /*
     * Verify that this WorkoutDay belongs to the
     * authenticated user's TrainingPlan.
     */
    const workoutDay =
      await prisma.workoutDay.findFirst({
        where: {
          id: dayId,
          weekId,
          week: {
            id: weekId,
            phaseId,
            phase: {
              id: phaseId,
              trainingPlanId: planId,
              trainingPlan: {
                id: planId,
                userId: session.user.id,
              },
            },
          },
        },
      });

    if (!workoutDay) {
      return NextResponse.json(
        { error: "Workout day not found" },
        { status: 404 }
      );
    }

    const body = await request.json();

    const exerciseId = String(
      body.exerciseId ?? ""
    );

    const sets = Number(body.sets);
    const minReps = Number(
      body.minReps ?? body.reps
    );
    const maxReps = Number(
      body.maxReps ?? body.reps
    );

    const restSeconds =
      body.restSeconds === null ||
      body.restSeconds === undefined
        ? null
        : Number(body.restSeconds);

    if (!exerciseId) {
      return NextResponse.json(
        { error: "exerciseId is required" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(sets) ||
      sets <= 0
    ) {
      return NextResponse.json(
        { error: "sets must be a positive integer" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(minReps) ||
      minReps <= 0
    ) {
      return NextResponse.json(
        { error: "minReps must be a positive integer" },
        { status: 400 }
      );
    }

    if (
      !Number.isInteger(maxReps) ||
      maxReps <= 0 ||
      maxReps < minReps
    ) {
      return NextResponse.json(
        {
          error:
            "maxReps must be a positive integer greater than or equal to minReps",
        },
        { status: 400 }
      );
    }

    if (
      restSeconds !== null &&
      (!Number.isInteger(restSeconds) ||
        restSeconds < 0)
    ) {
      return NextResponse.json(
        {
          error:
            "restSeconds must be a non-negative integer",
        },
        { status: 400 }
      );
    }

    /*
     * Make sure the selected exercise exists.
     */
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

    /*
     * Put the new exercise at the end of the
     * current WorkoutDay.
     */
    const latest =
      await prisma.programExercise.aggregate({
        where: {
          workoutDayId: workoutDay.id,
        },
        _max: {
          exerciseOrder: true,
        },
      });

    const exerciseOrder =
      (latest._max.exerciseOrder ?? 0) + 1;

    const programExercise =
      await prisma.programExercise.create({
        data: {
          workoutDayId: workoutDay.id,
          exerciseId,
          exerciseOrder,
          sets,
          minReps,
          maxReps,
          restSeconds,
        },
        include: {
          exercise: true,
        },
      });

    return NextResponse.json(
      { programExercise },
      { status: 201 }
    );
  } catch (error) {
    console.error(
      "Failed to create program exercise:",
      error
    );

    return NextResponse.json(
      { error: "Failed to create program exercise" },
      { status: 500 }
    );
  }
}
