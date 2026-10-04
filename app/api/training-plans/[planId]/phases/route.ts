import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getOwnedTrainingPlan } from "@/app/lib/training-plans";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// CREATE PROGRAM PHASE
// ========================================

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> }
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

  const { planId } = await params;
  const body = await parseJsonObject(request);

  if (!body) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const access = await getOwnedTrainingPlan(
    planId,
    session.user.id
  );

  if (!access.ok) {
    return access.response;
  }

  if (
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.phaseOrder === undefined ||
    body.durationWeeks === undefined ||
    body.startWeek === undefined ||
    body.endWeek === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "name, phaseOrder, durationWeeks, startWeek and endWeek are required",
      },
      { status: 400 }
    );
  }

  const { phaseOrder, durationWeeks, startWeek, endWeek } = body;
  const description = body.description;
  if (body.name.trim().length > 120 ||
      (description !== undefined && description !== null && (typeof description !== "string" || description.length > 2000))) {
    return NextResponse.json({ error: "Phase name or description is too long or invalid" }, { status: 400 });
  }

  if (
    typeof phaseOrder !== "number" || !Number.isInteger(phaseOrder) || phaseOrder < 1 || phaseOrder > access.plan.totalWeeks ||
    typeof durationWeeks !== "number" || !Number.isInteger(durationWeeks) || durationWeeks < 1 || durationWeeks > access.plan.totalWeeks ||
    typeof startWeek !== "number" || !Number.isInteger(startWeek) || startWeek < 1 || startWeek > access.plan.totalWeeks ||
    typeof endWeek !== "number" || !Number.isInteger(endWeek) || endWeek < startWeek || endWeek > access.plan.totalWeeks ||
    durationWeeks !== endWeek - startWeek + 1
  ) {
    return NextResponse.json({ error: "Phase week values must be valid integers within the training plan" }, { status: 400 });
  }

  const phase = await prisma.programPhase.create({
    data: {
      trainingPlanId: access.plan.id,
      name: body.name.trim(),
      description: typeof description === "string" ? description.trim() || null : null,
      phaseOrder,
      durationWeeks,
      startWeek,
      endWeek,
    },
  });

  return NextResponse.json(
    {
      success: true,
      phase,
    },
    { status: 201 }
  );
}
