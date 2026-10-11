import { NextResponse } from "next/server";
import { getAuthenticatedUser, requireRole } from "@/app/lib/authorization";
import {
  buildMemberReportWhere,
  parseMemberReportRange,
  summarizeMemberReport,
} from "@/app/lib/reports/member-report";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { user, response } = await getAuthenticatedUser();
    if (!user) {
      return response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const forbidden = requireRole(user, ["USER"]);
    if (forbidden) {
      return forbidden;
    }

    let range;
    try {
      range = parseMemberReportRange(new URL(request.url).searchParams);
    } catch (error) {
      if (error instanceof RangeError) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
      throw error;
    }

    const filters = buildMemberReportWhere(user.id, range);
    const [workouts, nutritionDays, weightEntries, bodyMeasurements, nutritionTarget] =
      await Promise.all([
      prisma.workoutSession.findMany({
        where: filters.workouts,
        orderBy: { startedAt: "desc" },
        select: {
          id: true,
          startedAt: true,
          completedAt: true,
          status: true,
          durationSeconds: true,
          workoutSessionExercises: {
            orderBy: { exerciseOrder: "asc" },
            select: {
              id: true,
              name: true,
              workoutSets: {
                orderBy: { setNumber: "asc" },
                select: {
                  id: true,
                  setNumber: true,
                  weight: true,
                  reps: true,
                  completed: true,
                },
              },
            },
          },
        },
      }),
      prisma.nutritionDay.findMany({
        where: filters.nutritionDays,
        orderBy: { date: "asc" },
        select: {
          id: true,
          date: true,
          meals: {
            orderBy: { createdAt: "asc" },
            select: {
              id: true,
              calories: true,
              protein: true,
              carbs: true,
              fat: true,
            },
          },
        },
      }),
      prisma.weightEntry.findMany({
        where: filters.weightEntries,
        orderBy: { recordedAt: "asc" },
        select: { id: true, weight: true, recordedAt: true },
      }),
      prisma.bodyMeasurement.findMany({
        where: filters.bodyMeasurements,
        orderBy: { recordedAt: "asc" },
        select: {
          id: true,
          chest: true,
          waist: true,
          arms: true,
          thighs: true,
          recordedAt: true,
        },
      }),
      prisma.nutritionTarget.findFirst({
        where: filters.nutritionTargets,
        orderBy: { updatedAt: "desc" },
        select: {
          calories: true,
          protein: true,
          carbs: true,
          fat: true,
        },
      }),
      ]);

    return NextResponse.json({
      range: {
        from: range.from,
        to: range.to,
        timezone: range.timezone,
      },
      workouts,
      nutritionDays,
      nutritionTarget,
      weightEntries,
      bodyMeasurements,
      summary: summarizeMemberReport(workouts, weightEntries, range.timezone),
      sources: {
        workouts: "database",
        nutrition: "database",
        weight: "database",
        bodyMeasurements: "database",
        habits: "localStorage",
        hydration: "localStorage",
        journal: "localStorage",
      },
    });
  } catch (error) {
    console.error("Failed to generate member report:", error);
    return NextResponse.json(
      { error: "Unable to load member report" },
      { status: 500 },
    );
  }
}
