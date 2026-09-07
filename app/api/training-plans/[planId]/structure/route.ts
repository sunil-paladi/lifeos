import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const DAY_NAMES = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      planId: string;
    }>;
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

    const { planId } = await params;

    const plan = await prisma.trainingPlan.findFirst({
      where: {
        id: planId,
        userId: session.user.id,
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Training plan not found" },
        { status: 404 }
      );
    }

    /*
     * Make sure the plan has Phase 1.
     */
    let phase = await prisma.programPhase.findFirst({
      where: {
        trainingPlanId: plan.id,
        phaseOrder: 1,
      },
    });

    if (!phase) {
      phase = await prisma.programPhase.create({
        data: {
          trainingPlanId: plan.id,
          name: "Phase 1",
          description: null,
          phaseOrder: 1,
          durationWeeks: plan.totalWeeks,
          startWeek: 1,
          endWeek: plan.totalWeeks,
        },
      });
    } else if (
      phase.durationWeeks !== plan.totalWeeks ||
      phase.endWeek !== plan.totalWeeks
    ) {
      phase = await prisma.programPhase.update({
        where: {
          id: phase.id,
        },
        data: {
          durationWeeks: plan.totalWeeks,
          startWeek: 1,
          endWeek: plan.totalWeeks,
        },
      });
    }

    /*
     * Create any missing weeks and their
     * Monday-Sunday workout days.
     *
     * Existing weeks/days are never deleted.
     */
    for (
      let weekNumber = 1;
      weekNumber <= plan.totalWeeks;
      weekNumber++
    ) {
      let week = await prisma.programWeek.findFirst({
        where: {
          phaseId: phase.id,
          weekNumber,
        },
      });

      if (!week) {
        week = await prisma.programWeek.create({
          data: {
            phaseId: phase.id,
            weekNumber,
          },
        });
      }

      const existingDays =
        await prisma.workoutDay.findMany({
          where: {
            weekId: week.id,
          },
          select: {
            dayOfWeek: true,
          },
        });

      const existingDayNumbers = new Set(
        existingDays.map(
          (day) => day.dayOfWeek
        )
      );

      const missingDays = DAY_NAMES
        .map((name, index) => ({
          weekId: week.id,
          dayOfWeek: index + 1,
          name,
          description: null,
          isRestDay: false,
          dayOrder: index + 1,
        }))
        .filter(
          (day) =>
            !existingDayNumbers.has(
              day.dayOfWeek
            )
        );

      if (missingDays.length > 0) {
        await prisma.workoutDay.createMany({
          data: missingDays,
        });
      }
    }

    /*
     * Load the complete structure after syncing.
     */
    const completePlan =
      await prisma.trainingPlan.findFirst({
        where: {
          id: plan.id,
          userId: session.user.id,
        },
        include: {
          phases: {
            orderBy: {
              phaseOrder: "asc",
            },
            include: {
              weeks: {
                orderBy: {
                  weekNumber: "asc",
                },
                include: {
                  workoutDays: {
                    orderBy: {
                      dayOrder: "asc",
                    },
                    include: {
                      programExercises: {
                        orderBy: {
                          exerciseOrder: "asc",
                        },
                        include: {
                          exercise: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

    if (!completePlan) {
      return NextResponse.json(
        { error: "Training plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      plan: {
        id: completePlan.id,
        name: completePlan.name,
        totalWeeks: completePlan.totalWeeks,
      },
      phases: completePlan.phases,
    });
  } catch (error) {
    console.error(
      "GET TRAINING PLAN STRUCTURE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error:
          "Failed to load training plan structure",
      },
      { status: 500 }
    );
  }
}
