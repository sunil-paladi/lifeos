import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
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
  const body = await request.json();

  const phase = await prisma.programPhase.findFirst({
    where: {
      id: phaseId,
      trainingPlanId: planId,
      trainingPlan: {
        userId: session.user.id,
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

  const week = await prisma.programWeek.create({
    data: {
      phaseId: phase.id,
      weekNumber: Number(body.weekNumber),
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
