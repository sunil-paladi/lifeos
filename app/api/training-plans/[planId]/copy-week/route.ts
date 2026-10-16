import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { jsonError, logServerError } from "@/app/lib/error-response";
import { parseJsonObject } from "@/app/lib/input-validation";
import { getOwnedTrainingPlan } from "@/app/lib/training-plans";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ planId: string }> },
) {
  try {
    const session = await auth.api.getSession({
      headers: await headers(),
    });

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { planId } = await params;
    const access = await getOwnedTrainingPlan(planId, session.user.id);
    if (!access.ok) {
      return access.response;
    }

    const body = await parseJsonObject(request);
    const { sourceWeekNumber, destinationWeekNumber } = body ?? {};
    if (
      !body ||
      typeof sourceWeekNumber !== "number" ||
      !Number.isInteger(sourceWeekNumber) ||
      typeof destinationWeekNumber !== "number" ||
      !Number.isInteger(destinationWeekNumber) ||
      (body.overwrite !== undefined && typeof body.overwrite !== "boolean")
    ) {
      return NextResponse.json(
        { error: "Valid source and destination week numbers are required" },
        { status: 400 },
      );
    }

    if (
      sourceWeekNumber < 1 ||
      destinationWeekNumber < 1 ||
      sourceWeekNumber > access.plan.totalWeeks ||
      destinationWeekNumber > access.plan.totalWeeks ||
      sourceWeekNumber === destinationWeekNumber
    ) {
      return NextResponse.json(
        { error: "Choose two different weeks within the program duration" },
        { status: 400 },
      );
    }

    const phase = await prisma.programPhase.findFirst({
      where: {
        trainingPlanId: access.plan.id,
        phaseOrder: 1,
      },
      select: { id: true },
    });

    if (!phase) {
      return NextResponse.json(
        { error: "Program phase not found" },
        { status: 404 },
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      const sourceWeek = await tx.programWeek.findFirst({
        where: { phaseId: phase.id, weekNumber: sourceWeekNumber },
        select: {
          id: true,
          workoutDays: {
            select: {
              dayOfWeek: true,
              programExercises: {
                select: {
                  exerciseId: true,
                  exerciseOrder: true,
                  sets: true,
                  minReps: true,
                  maxReps: true,
                  restSeconds: true,
                  targetWeight: true,
                  notes: true,
                },
              },
            },
          },
        },
      });
      const destinationWeek = await tx.programWeek.findFirst({
        where: {
          phaseId: phase.id,
          weekNumber: destinationWeekNumber,
        },
        select: {
          id: true,
          workoutDays: {
            select: {
              id: true,
              dayOfWeek: true,
              programExercises: { select: { id: true } },
            },
          },
        },
      });

      if (!sourceWeek || !destinationWeek) {
        return { error: "Program week not found", status: 404 };
      }

      const destinationIsNotEmpty = destinationWeek.workoutDays.some(
        (day) => day.programExercises.length > 0,
      );
      if (destinationIsNotEmpty && body.overwrite !== true) {
        return {
          error: "Destination week is not empty; confirm before overwriting",
          status: 409,
        };
      }

      const destinationDayIds = new Map(
        destinationWeek.workoutDays.map((day) => [day.dayOfWeek, day.id]),
      );
      const sourceDays = new Map(
        sourceWeek.workoutDays.map((day) => [day.dayOfWeek, day]),
      );
      if (
        destinationDayIds.size !== 7 ||
        sourceDays.size !== 7 ||
        Array.from({ length: 7 }, (_, index) => index + 1).some(
          (dayOfWeek) =>
            !destinationDayIds.has(dayOfWeek) || !sourceDays.has(dayOfWeek),
        )
      ) {
        return { error: "Program week is missing workout days", status: 409 };
      }

      await tx.programExercise.deleteMany({
        where: { workoutDayId: { in: Array.from(destinationDayIds.values()) } },
      });

      const copiedExercises = sourceWeek.workoutDays.flatMap((sourceDay) => {
        const workoutDayId = destinationDayIds.get(sourceDay.dayOfWeek);
        if (!workoutDayId) {
          return [];
        }

        return sourceDay.programExercises.map((exercise) => ({
          ...exercise,
          workoutDayId,
        }));
      });

      if (copiedExercises.length > 0) {
        await tx.programExercise.createMany({ data: copiedExercises });
      }

      return { success: true };
    });

    if ("error" in result) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status },
      );
    }

    return NextResponse.json(result);
  } catch (error) {
    logServerError("POST /api/training-plans/[planId]/copy-week", error);
    return jsonError("Failed to copy program week", 500);
  }
}
