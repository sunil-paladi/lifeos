import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonObject } from "@/app/lib/input-validation";
import { isValidProgramDuration } from "@/app/lib/program-builder-state";
import { getOwnedTrainingPlan } from "@/app/lib/training-plans";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// GET ONE TRAINING PLAN
// ========================================

export async function GET(
  _request: Request,
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

  const access = await getOwnedTrainingPlan(
    planId,
    session.user.id
  );

  if (!access.ok) {
    return access.response;
  }

  return NextResponse.json({
    plan: access.plan,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 },
    );
  }

  const { planId } = await params;
  const access = await getOwnedTrainingPlan(planId, session.user.id);
  if (!access.ok) {
    return access.response;
  }

  const body = await parseJsonObject(request);
  if (!body || !isValidProgramDuration(body.totalWeeks)) {
    return NextResponse.json(
      { error: "totalWeeks must be an integer from 1 to 52" },
      { status: 400 },
    );
  }

  const plan = await prisma.trainingPlan.update({
    where: { id: access.plan.id },
    data: { totalWeeks: body.totalWeeks },
    select: { id: true, totalWeeks: true },
  });

  return NextResponse.json({ success: true, plan });
}
