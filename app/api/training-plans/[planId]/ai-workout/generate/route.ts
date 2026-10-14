import OpenAI from "openai";
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import {
  AiWorkoutConfigurationError,
  AiWorkoutInvalidJsonError,
  AiWorkoutProviderError,
  AiWorkoutValidationError,
  generateValidatedWorkout,
  getGroqConfiguration,
  getGroqProviderErrorDetails,
  GROQ_BASE_URL,
  parseBoundedJsonObject,
  requireAuthorizedTrainingPlan,
  sanitizeAiWorkoutValidationReason,
  validateWorkoutPreferences,
} from "@/app/lib/ai-workout";
import { jsonError } from "@/app/lib/error-response";
import { getOwnedTrainingPlan } from "@/app/lib/training-plans";

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

    let preferences;
    try {
      preferences = validateWorkoutPreferences(body.preferences);
    } catch (error) {
      if (error instanceof AiWorkoutValidationError) {
        return jsonError(error.message, 400);
      }
      throw error;
    }

    let groqConfiguration;
    try {
      groqConfiguration = getGroqConfiguration(
        process.env.GROQ_API_KEY,
        process.env.GROQ_MODEL,
      );
    } catch (error) {
      if (error instanceof AiWorkoutConfigurationError) {
        return jsonError(
          `Workout generation is not configured. ${error.message}.`,
          503,
        );
      }
      throw error;
    }

    const client = new OpenAI({
      baseURL: GROQ_BASE_URL,
      apiKey: groqConfiguration.apiKey,
      timeout: 30_000,
      maxRetries: 1,
    });
    const workout = await generateValidatedWorkout(preferences, async (prompt) => {
      let content: string | null;
      try {
        const response = await client.chat.completions.create({
          model: groqConfiguration.model,
          temperature: 0.2,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: "You generate structured strength workout templates. Follow the user's safety constraints and output schema exactly.",
            },
            { role: "user", content: prompt },
          ],
        });
        content = response.choices[0]?.message.content ?? null;
      } catch (error) {
        const diagnostics = getGroqProviderErrorDetails(error);
        throw new AiWorkoutProviderError({
          ...diagnostics,
          code: diagnostics.code ?? "provider_request_failed",
        });
      }
      if (!content) {
        throw new AiWorkoutProviderError({ code: "empty_response" });
      }
      return content;
    });

    return NextResponse.json({ workout });
  } catch (error) {
    if (error instanceof AiWorkoutProviderError) {
      console.error("AI workout generation failed", {
        category: "provider",
        ...error.diagnostics,
      });
      return jsonError(
        "The workout service is temporarily unavailable. Please try again.",
        502,
      );
    }
    if (error instanceof AiWorkoutInvalidJsonError) {
      console.error("AI workout generation failed", {
        category: "invalid_json",
      });
      return jsonError(
        "The AI returned an unreadable workout. Please try again.",
        502,
      );
    }
    if (error instanceof AiWorkoutValidationError) {
      console.error("AI workout generation failed", {
        category: "validation",
        reason: sanitizeAiWorkoutValidationReason(error.message),
      });
      return jsonError(
        "The AI returned a workout that could not be validated. Please try again.",
        502,
      );
    }
    console.error("AI workout generation failed", {
      category: "unexpected",
      errorName:
        error instanceof Error && /^[A-Za-z][A-Za-z0-9]{0,63}$/.test(error.name)
          ? error.name
          : "UnknownError",
    });
    return jsonError("Workout generation failed. Please try again.", 502);
  }
}
