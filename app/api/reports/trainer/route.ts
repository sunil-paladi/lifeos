import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import {
  buildTrainerReportWhere,
  getTrainerAssignedClients,
  parseMemberReportRange,
  summarizeMemberReport,
} from "@/app/lib/reports/member-report";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function omitReportFields<T extends object, K extends keyof T>(
  record: T,
  fields: readonly K[],
): Omit<T, K> {
  const result = { ...record };
  for (const field of fields) {
    Reflect.deleteProperty(result, field);
  }
  return result;
}

export async function GET(request: Request) {
  try {
    const { user, response } = await getAuthenticatedUser();
    if (!user) {
      return response ?? NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    const trainerMemberships = await prisma.gymMembership.findMany({
      where: {
        userId: user.id,
        role: "TRAINER",
        status: "ACTIVE",
      },
      select: { id: true },
    });

    if (!trainerMemberships.length) {
      return NextResponse.json(
        { error: "An active trainer membership is required" },
        { status: 403 },
      );
    }

    const trainerMembershipIds = trainerMemberships.map(({ id }) => id);
    const assignments = await prisma.trainerClient.findMany({
      where: {
        trainerMembershipId: { in: trainerMembershipIds },
        clientMembership: {
          is: { role: "MEMBER", status: "ACTIVE" },
        },
      },
      select: {
        trainerMembershipId: true,
        clientMembership: {
          select: {
            userId: true,
            role: true,
            status: true,
            user: {
              select: { name: true, username: true },
            },
          },
        },
      },
      orderBy: { assignedAt: "desc" },
    });

    const clients = getTrainerAssignedClients(
      trainerMembershipIds,
      assignments,
    );
    if (!clients.length) {
      return NextResponse.json({
        range: { from: range.from, to: range.to, timezone: range.timezone },
        clients: [],
      });
    }

    const clientUserIds = clients.map(({ id }) => id);
    const filters = buildTrainerReportWhere(clientUserIds, range);
    const [workouts, nutritionDays, weightEntries, bodyMeasurements, nutritionTargets] =
      await Promise.all([
        prisma.workoutSession.findMany({
          where: filters.workouts,
          orderBy: { startedAt: "desc" },
          select: {
            id: true,
            userId: true,
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
            userId: true,
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
          select: { id: true, userId: true, weight: true, recordedAt: true },
        }),
        prisma.bodyMeasurement.findMany({
          where: filters.bodyMeasurements,
          orderBy: { recordedAt: "asc" },
          select: {
            id: true,
            userId: true,
            chest: true,
            waist: true,
            arms: true,
            thighs: true,
            recordedAt: true,
          },
        }),
        prisma.nutritionTarget.findMany({
          where: filters.nutritionTargets,
          orderBy: { updatedAt: "desc" },
          select: {
            userId: true,
            calories: true,
            protein: true,
            carbs: true,
            fat: true,
            updatedAt: true,
          },
        }),
      ]);

    return NextResponse.json({
      range: { from: range.from, to: range.to, timezone: range.timezone },
      clients: clients.map((client) => {
        const clientWorkouts = workouts
          .filter(({ userId }) => userId === client.id)
          .map((workout) => omitReportFields(workout, ["userId"]));
        const clientWeightEntries = weightEntries
          .filter(({ userId }) => userId === client.id)
          .map((entry) => omitReportFields(entry, ["userId"]));
        const clientNutritionDays = nutritionDays
          .filter(({ userId }) => userId === client.id)
          .map((day) => omitReportFields(day, ["userId"]));
        const clientBodyMeasurements = bodyMeasurements
          .filter(({ userId }) => userId === client.id)
          .map((measurement) => omitReportFields(measurement, ["userId"]));
        const nutritionTarget = nutritionTargets.find(
          ({ userId }) => userId === client.id,
        );
        const clientTarget = nutritionTarget
          ? omitReportFields(nutritionTarget, ["userId", "updatedAt"])
          : null;

        return {
          ...client,
          workouts: clientWorkouts,
          nutritionDays: clientNutritionDays,
          nutritionTarget: clientTarget,
          weightEntries: clientWeightEntries,
          bodyMeasurements: clientBodyMeasurements,
          summary: summarizeMemberReport(
            clientWorkouts,
            clientWeightEntries,
            range.timezone,
          ),
        };
      }),
    });
  } catch (error) {
    console.error("Failed to generate trainer report:", error);
    return NextResponse.json(
      { error: "Unable to load trainer report" },
      { status: 500 },
    );
  }
}
