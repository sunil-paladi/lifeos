import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getWorkoutPlanLibrary } from "@/app/lib/workout-plan-library";
import { jsonError, logServerError } from "@/app/lib/error-response";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const session = await auth.api.getSession({ headers: await headers() });
    if (!session) {
      return jsonError("Unauthorized", 401);
    }

    return NextResponse.json({ plans: getWorkoutPlanLibrary() });
  } catch (error) {
    logServerError("GET /api/workout-plans/library", error);
    return jsonError("Failed to load workout plan library", 500);
  }
}
