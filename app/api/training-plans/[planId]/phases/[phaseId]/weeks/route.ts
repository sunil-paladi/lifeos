import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getOwnedTrainingPlan } from "@/app/lib/training-plans";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// CREATE PROGRAM WEEK
// ========================================

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      planId: string;
      phaseId: string;
    }>;
  }
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

  const { planId, phaseId } = await params;
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

  const phase = await prisma.programPhase.findFirst({
    where: {
      id: phaseId,
      trainingPlanId: planId,
      trainingPlan: {
        id: access.plan.id,
        userId: session.user.id,
        gymId: access.plan.gymId,
      },
    },
  });

  if (!phase) {
    return NextResponse.json(
      { error: "Program phase not found" },
      { status: 404 }
    );
  }

  if (body.weekNumber === undefined) {
    return NextResponse.json(
      { error: "weekNumber is required" },
      { status: 400 }
    );
  }

  if (
    typeof body.weekNumber !== "number" ||
    !Number.isInteger(body.weekNumber) ||
    body.weekNumber < phase.startWeek ||
    body.weekNumber > phase.endWeek
  ) {
    return NextResponse.json(
      { error: "weekNumber must be an integer within this phase's week range" },
      { status: 400 }
    );
  }

  const week = await prisma.programWeek.create({
    data: {
      phaseId: phase.id,
      weekNumber: body.weekNumber,
    },
  });

  return NextResponse.json(
    {
      success: true,
      week,
    },
    { status: 201 }
  );
}
