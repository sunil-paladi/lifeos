import {
  calculateWorkoutMetrics,
  createCalendarDateRange,
  getCalendarDateInTimeZone,
} from "@/app/lib/reports";
import type { CalendarDateRange, WorkoutSetInput } from "@/app/lib/reports";

export function parseMemberReportRange(searchParams: URLSearchParams): CalendarDateRange {
  const fromValues = searchParams.getAll("from");
  const toValues = searchParams.getAll("to");
  const timezoneValues = searchParams.getAll("timezone");

  if (!fromValues.length || !toValues.length || !timezoneValues.length) {
    throw new RangeError("from, to, and timezone are required");
  }
  if (
    fromValues.length !== 1 ||
    toValues.length !== 1 ||
    timezoneValues.length !== 1
  ) {
    throw new RangeError("from, to, and timezone must each be supplied once");
  }

  return createCalendarDateRange(
    fromValues[0],
    toValues[0],
    timezoneValues[0],
  );
}

export function buildMemberReportWhere(
  userId: string,
  range: CalendarDateRange,
) {
  return buildReportWhere(userId, range);
}

export function buildTrainerReportWhere(
  clientUserIds: readonly string[],
  range: CalendarDateRange,
) {
  return buildReportWhere({ in: [...clientUserIds] }, range);
}

function buildReportWhere(
  userId: string | { in: string[] },
  range: CalendarDateRange,
) {
  const date = {
    gte: range.startAt,
    lt: range.endExclusiveAt,
  };

  return {
    workouts: { userId, startedAt: date },
    nutritionDays: { userId, date },
    weightEntries: { userId, recordedAt: date },
    bodyMeasurements: { userId, recordedAt: date },
    nutritionTargets: { userId },
  };
}

export interface TrainerAssignmentClient {
  trainerMembershipId: string;
  clientMembership: {
    userId: string;
    role: string;
    status: string;
    user: {
      name: string;
      username: string | null;
    };
  };
}

export function getTrainerAssignedClients(
  trainerMembershipIds: readonly string[],
  assignments: readonly TrainerAssignmentClient[],
) {
  const allowedMembershipIds = new Set(trainerMembershipIds);
  const clients = new Map<
    string,
    { id: string; name: string; username: string | null }
  >();

  for (const assignment of assignments) {
    const membership = assignment.clientMembership;
    if (
      !allowedMembershipIds.has(assignment.trainerMembershipId) ||
      membership.role !== "MEMBER" ||
      membership.status !== "ACTIVE"
    ) {
      continue;
    }

    clients.set(membership.userId, {
      id: membership.userId,
      name: membership.user.name,
      username: membership.user.username,
    });
  }

  return [...clients.values()];
}

export function selectTrainerReportClient<T extends { id: string }>(
  clients: readonly T[],
  clientId: string,
): T | null {
  return clients.find((client) => client.id === clientId) ?? null;
}

export interface MemberReportWorkout {
  startedAt: Date;
  status: string;
  durationSeconds: number | null;
  workoutSessionExercises: {
    workoutSets: WorkoutSetInput[];
  }[];
}

export interface MemberReportWeightEntry {
  weight: number;
  recordedAt: Date;
}

export function summarizeMemberReport(
  workouts: readonly MemberReportWorkout[],
  weightEntries: readonly MemberReportWeightEntry[],
  timezone: string,
) {
  const completedWorkouts = workouts.filter(
    (workout) => workout.status === "COMPLETED",
  );
  const sets = completedWorkouts.flatMap((workout) =>
    workout.workoutSessionExercises.flatMap((exercise) => exercise.workoutSets),
  );
  const recordedWeights = [...weightEntries].sort(
    (left, right) => left.recordedAt.getTime() - right.recordedAt.getTime(),
  );
  const firstWeight = recordedWeights[0]?.weight ?? null;
  const latestWeight = recordedWeights.at(-1)?.weight ?? null;

  return {
    workoutCount: completedWorkouts.length,
    workoutDays: new Set(
      completedWorkouts.map((workout) =>
        getCalendarDateInTimeZone(workout.startedAt, timezone),
      ),
    ).size,
    workoutMinutes: Math.round(
      completedWorkouts.reduce(
        (total, workout) => total + (workout.durationSeconds ?? 0),
        0,
      ) / 60,
    ),
    workoutMetrics: calculateWorkoutMetrics(sets),
    firstWeight,
    latestWeight,
    weightChange:
      firstWeight === null || latestWeight === null
        ? null
        : latestWeight - firstWeight,
  };
}
