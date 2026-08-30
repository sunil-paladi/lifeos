import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
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
  const body = await request.json();

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

  if (
    !body.name ||
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

  const phase = await prisma.programPhase.create({
    data: {
      trainingPlanId: plan.id,
      name: body.name,
      description: body.description ?? null,
      phaseOrder: Number(body.phaseOrder),
      durationWeeks: Number(body.durationWeeks),
      startWeek: Number(body.startWeek),
      endWeek: Number(body.endWeek),
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
