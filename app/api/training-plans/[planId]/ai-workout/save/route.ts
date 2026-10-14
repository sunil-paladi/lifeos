import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  AiWorkoutValidationError,
  parseBoundedJsonObject,
  persistGeneratedWorkout,
  requireAuthorizedTrainingPlan,
  validateGeneratedWorkout,
  validateWorkoutPreferences,
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
    if (!body) {
      return jsonError("Request body is invalid or too large", 400);
    }

    let workout;
    try {
      const preferences = validateWorkoutPreferences(body.preferences);
      workout = validateGeneratedWorkout(body.workout, preferences);
    } catch (error) {
      if (error instanceof AiWorkoutValidationError) {
        return jsonError(error.message, 400);
      }
      throw error;
    }

    const result = await prisma.$transaction((tx) =>
      persistGeneratedWorkout(tx, planId, access.plan.totalWeeks, workout),
    );

    return NextResponse.json({
      success: true,
      planId: access.plan.id,
      ...result,
    });
  } catch (error) {
    logServerError("POST /api/training-plans/[planId]/ai-workout/save", error);
    return jsonError("Failed to save generated workout", 500);
  }
}
