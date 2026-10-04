import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { getOwnedTrainingPlan } from "@/app/lib/training-plans";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// GET WORKOUT DAYS
// ========================================

export async function GET(
  _request: Request,
  {
    params,
  }: {
    params: Promise<{
      planId: string;
      phaseId: string;
      weekId: string;
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

  const { planId, phaseId, weekId } =
    await params;

  const access = await getOwnedTrainingPlan(
    planId,
    session.user.id
  );

  if (!access.ok) {
    return access.response;
  }

  const week = await prisma.programWeek.findFirst({
    where: {
      id: weekId,
      phaseId,
      phase: {
        id: phaseId,
        trainingPlanId: planId,
        trainingPlan: {
          id: access.plan.id,
          userId: session.user.id,
          gymId: access.plan.gymId,
        },
      },
    },
  });

  if (!week) {
    return NextResponse.json(
      { error: "Program week not found" },
      { status: 404 }
    );
  }

  const workoutDays =
    await prisma.workoutDay.findMany({
      where: {
        weekId: week.id,
      },
      orderBy: {
        dayOrder: "asc",
      },
    });

  return NextResponse.json({
    workoutDays,
  });
}

// ========================================
// CREATE WORKOUT DAY
// ========================================

export async function POST(
  request: Request,
  {
    params,
  }: {
    params: Promise<{
      planId: string;
      phaseId: string;
      weekId: string;
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

  const { planId, phaseId, weekId } =
    await params;

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

  const week = await prisma.programWeek.findFirst({
    where: {
      id: weekId,
      phaseId,
      phase: {
        id: phaseId,
        trainingPlanId: planId,
        trainingPlan: {
          id: access.plan.id,
          userId: session.user.id,
          gymId: access.plan.gymId,
        },
      },
    },
  });

  if (!week) {
    return NextResponse.json(
      { error: "Program week not found" },
      { status: 404 }
    );
  }

  if (
    body.dayOfWeek === undefined ||
    typeof body.name !== "string" ||
    !body.name.trim() ||
    body.dayOrder === undefined
  ) {
    return NextResponse.json(
      {
        error:
          "dayOfWeek, name and dayOrder are required",
      },
      { status: 400 }
    );
  }

  if (
    typeof body.dayOfWeek !== "number" ||
    !Number.isInteger(body.dayOfWeek) ||
    body.dayOfWeek < 1 ||
    body.dayOfWeek > 7 ||
    typeof body.dayOrder !== "number" ||
    !Number.isInteger(body.dayOrder) ||
    body.dayOrder < 1 ||
    body.dayOrder > 7 ||
    body.name.trim().length > 100
  ) {
    return NextResponse.json({ error: "dayOfWeek and dayOrder must be integers from 1 to 7 and name must be at most 100 characters" }, { status: 400 });
  }

  if (body.description !== undefined && body.description !== null && (typeof body.description !== "string" || body.description.length > 2000)) {
    return NextResponse.json({ error: "description must be a string of at most 2000 characters" }, { status: 400 });
  }

  if (body.isRestDay !== undefined && typeof body.isRestDay !== "boolean") {
    return NextResponse.json({ error: "isRestDay must be a boolean" }, { status: 400 });
  }

  const workoutDay =
    await prisma.workoutDay.create({
      data: {
        weekId: week.id,
        dayOfWeek: body.dayOfWeek,
        name: body.name.trim(),
        description:
          typeof body.description === "string" ? body.description.trim() || null : null,
        isRestDay:
          body.isRestDay ?? false,
        dayOrder: body.dayOrder,
      },
    });

  return NextResponse.json(
    {
      success: true,
      workoutDay,
    },
    { status: 201 }
  );
}
