import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
                },
              },
            },
          },
        },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "Training plan not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      plan: {
        id: plan.id,
        name: plan.name,
        totalWeeks: plan.totalWeeks,
      },
      phases: plan.phases,
    });
  } catch (error) {
    console.error(
      "GET TRAINING PLAN STRUCTURE ERROR:",
      error
    );

    return NextResponse.json(
      {
        error: "Failed to load training plan structure",
      },
      { status: 500 }
    );
  }
}
