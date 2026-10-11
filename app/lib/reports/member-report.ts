import {
  calculateWorkoutMetrics,
  createCalendarDateRange,
  getCalendarDateInTimeZone,
} from "@/app/lib/reports";
import type { CalendarDateRange, WorkoutSetInput } from "@/app/lib/reports";

export function parseMemberReportRange(searchParams: URLSearchParams): CalendarDateRange {
  const from = searchParams.get("from");
  const to = searchParams.get("to");
  const timezone = searchParams.get("timezone");

  if (!from || !to || !timezone) {
    throw new RangeError("from, to, and timezone are required");
  }

  return createCalendarDateRange(from, to, timezone);
}

export function buildMemberReportWhere(
  userId: string,
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
