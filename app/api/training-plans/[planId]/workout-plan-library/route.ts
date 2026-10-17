import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  getWorkoutPlanById,
} from "@/app/lib/workout-plan-library";
import {
  parseBoundedJsonObject,
  persistGeneratedWorkout,
  requireAuthorizedTrainingPlan,
} from "@/app/lib/ai-workout";
import { jsonError, logServerError } from "@/app/lib/error-response";
import { getOwnedTrainingPlan } from "@/app/lib/training-plans";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    const { planId } = await params;
    const access = await requireAuthorizedTrainingPlan(
      planId,
      session.user.id,
      getOwnedTrainingPlan,
    );
    if (!access.ok) {
      return access.response;
    }

    const body = await parseBoundedJsonObject(request);
    if (!body || typeof body.planTemplateId !== "string") {
      return jsonError("A valid workout plan selection is required", 400);
    }
    const targetWeekNumber = body.targetWeekNumber;
    if (
      typeof targetWeekNumber !== "number" ||
      !Number.isInteger(targetWeekNumber) ||
      targetWeekNumber < 1 ||
      targetWeekNumber > access.plan.totalWeeks
    ) {
      return jsonError("A valid target week is required", 400);
    }

    const template = getWorkoutPlanById(body.planTemplateId);
    if (!template) {
      return jsonError("Workout plan was not found", 404);
    }

    const result = await prisma.$transaction((tx) =>
      persistGeneratedWorkout(
        tx,
        planId,
        access.plan.totalWeeks,
        template.workout,
        targetWeekNumber,
      ),
    );

    return NextResponse.json({
      success: true,
      planId: access.plan.id,
      ...result,
      workout: template.workout,
    });
  } catch (error) {
    logServerError("POST /api/training-plans/[planId]/workout-plan-library", error);
    return jsonError("Failed to apply workout plan", 500);
  }
}
