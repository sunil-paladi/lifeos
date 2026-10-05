import type { DayName } from "@/app/context/ProgramContext";

export const WORKOUT_HISTORY_KEY = "lifeos-workout-history";
export const WORKOUT_HISTORY_UPDATED_EVENT =
  "lifeos:workout-history-updated";

export interface WorkoutSetRecord {
  weight?: string | number;
  reps?: string | number;
  completed?: boolean;
}

export interface WorkoutHistoryEntry {
  sessionId?: string;
  day?: string;
  date?: string;
  completed?: boolean;
  completedAt?: string | null;
  setData?: Record<
    string,
    Record<string, WorkoutSetRecord>
  >;
}

export interface WorkoutWeekRange {
  start: string;
  end: string;
  previousStart: string;
  previousEnd: string;
}

export interface WorkoutWeekDay {
  date: string;
  day: DayName;
}

const dayNamesByUtcWeekday: DayName[] = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export interface ExerciseComparison {
  exerciseId: string;
  name: string;
  previous: string;
  current: string;
  improvement: string | null;
}

function parseCalendarDate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const datePart = value.match(/^(\d{4}-\d{2}-\d{2})/)?.[1];
  if (!datePart) {
    return null;
  }

  const date = new Date(`${datePart}T00:00:00.000Z`);
  return Number.isFinite(date.getTime()) &&
    date.toISOString().slice(0, 10) === datePart
    ? datePart
    : null;
}

function shiftCalendarDate(date: string, offset: number) {
  const shifted = new Date(`${date}T00:00:00.000Z`);
  shifted.setUTCDate(shifted.getUTCDate() + offset);
  return shifted.toISOString().slice(0, 10);
}

export function getWorkoutWeekRange(
  programStartDate: string | null,
  weekIndex: number,
): WorkoutWeekRange | null {
  const startDate = parseCalendarDate(programStartDate);
  if (!startDate || !Number.isInteger(weekIndex) || weekIndex < 0) {
    return null;
  }

  const start = shiftCalendarDate(startDate, weekIndex * 7);
  const end = shiftCalendarDate(start, 6);

  return {
    start,
    end,
    previousStart: shiftCalendarDate(start, -7),
    previousEnd: shiftCalendarDate(start, -1),
  };
}

export function formatWorkoutWeekRange(start: string, end: string) {
  const firstDate = new Date(`${start}T00:00:00.000Z`);
  const lastDate = new Date(`${end}T00:00:00.000Z`);
  const monthFormatter = new Intl.DateTimeFormat(undefined, {
    month: "short",
    timeZone: "UTC",
  });
  const firstMonth = monthFormatter.format(firstDate);
  const lastMonth = monthFormatter.format(lastDate);
  const sameMonth =
    firstDate.getUTCMonth() === lastDate.getUTCMonth() &&
    firstDate.getUTCFullYear() === lastDate.getUTCFullYear();

  if (sameMonth) {
    return `${firstDate.getUTCDate()}–${lastDate.getUTCDate()} ${firstMonth}`;
  }

  const firstYear = firstDate.getUTCFullYear();
  const lastYear = lastDate.getUTCFullYear();
  const firstLabel = `${firstDate.getUTCDate()} ${firstMonth}`;
  const lastLabel = `${lastDate.getUTCDate()} ${lastMonth}`;

  return firstYear === lastYear
    ? `${firstLabel} – ${lastLabel}`
    : `${firstLabel} ${firstYear} – ${lastLabel} ${lastYear}`;
}

export function getWorkoutWeekDays(
  range: WorkoutWeekRange,
): WorkoutWeekDay[] {
  return Array.from({ length: 7 }, (_, index) => {
    const date = shiftCalendarDate(range.start, index);
    const weekday = new Date(`${date}T00:00:00.000Z`).getUTCDay();

    return {
      date,
      day: dayNamesByUtcWeekday[weekday],
    };
  });
}

export function getWorkoutHistoryDate(workout: WorkoutHistoryEntry) {
  return (
    parseCalendarDate(workout.date) ??
    parseCalendarDate(workout.completedAt)
  );
}

export function getCompletedWorkoutDays(
  history: WorkoutHistoryEntry[],
  plannedDays: string[],
  range: WorkoutWeekRange,
) {
  const planned = new Set(plannedDays);
  const weekDayByDate = new Map(
    getWorkoutWeekDays(range).map(({ date, day }) => [date, day]),
  );

  return new Set(
    history.flatMap((workout) => {
      if (!workout.completed) {
        return [];
      }

      const date = getWorkoutHistoryDate(workout);
      const scheduledDay = date ? weekDayByDate.get(date) : undefined;

      return scheduledDay && planned.has(scheduledDay)
        ? [scheduledDay]
        : [];
    }),
  );
}

interface ExercisePerformance {
  completedSets: number;
  volume: number;
  weightedSets: number;
  bestSet: {
    weight: number;
    reps: number;
  } | null;
}

function getExercisePerformance(
  setData: Record<string, WorkoutSetRecord>,
): ExercisePerformance {
  const completedSets = Object.values(setData).filter(
    (set) => set.completed,
  );

  const performance: ExercisePerformance = {
    completedSets: completedSets.length,
    volume: 0,
    weightedSets: 0,
    bestSet: null,
  };

  for (const set of completedSets) {
    const weight = Number(set.weight ?? 0);
    const reps = Number(set.reps ?? 0);

    if (!Number.isFinite(reps) || reps < 0) {
      continue;
    }

    const validWeight = Number.isFinite(weight) && weight > 0
      ? weight
      : 0;
    if (validWeight > 0) {
      performance.volume += validWeight * reps;
      performance.weightedSets += 1;
    }

    if (
      !performance.bestSet ||
      validWeight * reps >
        performance.bestSet.weight * performance.bestSet.reps ||
      (validWeight * reps ===
        performance.bestSet.weight * performance.bestSet.reps &&
        validWeight > performance.bestSet.weight)
    ) {
      performance.bestSet = {
        weight: validWeight,
        reps,
      };
    }
  }

  return performance;
}

function sessionTimestamp(workout: WorkoutHistoryEntry) {
  const timestamp = workout.completedAt ?? workout.date;
  const value = timestamp ? new Date(timestamp).getTime() : 0;
  return Number.isFinite(value) ? value : 0;
}

function formatSet(set: ExercisePerformance["bestSet"]) {
  if (!set) {
    return "no completed sets";
  }

  return set.weight > 0
    ? `${set.weight} kg × ${set.reps}`
    : `${set.reps} reps`;
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? value.toLocaleString()
    : value.toLocaleString(undefined, { maximumFractionDigits: 1 });
}

function comparePerformance(
  previous: ExercisePerformance,
  current: ExercisePerformance,
) {
  const previousBest = previous.bestSet;
  const currentBest = current.bestSet;

  if (
    previousBest &&
    currentBest &&
    currentBest.weight > previousBest.weight
  ) {
    return `weight increased from ${formatSet(previousBest)} to ${formatSet(currentBest)}`;
  }

  if (
    previousBest &&
    currentBest &&
    currentBest.weight === previousBest.weight &&
    currentBest.reps > previousBest.reps
  ) {
    const additionalReps = currentBest.reps - previousBest.reps;
    return previousBest.weight > 0
      ? `${formatNumber(additionalReps)} more reps at ${previousBest.weight} kg`
      : `${formatNumber(additionalReps)} more reps in the best set`;
  }

  if (current.completedSets > previous.completedSets) {
    const additionalSets =
      current.completedSets - previous.completedSets;
    return `${formatNumber(additionalSets)} more completed ${
      additionalSets === 1 ? "set" : "sets"
    } (${previous.completedSets} to ${current.completedSets})`;
  }

  if (
    current.weightedSets > 0 &&
    previous.weightedSets > 0 &&
    current.volume > previous.volume
  ) {
    return `training volume increased from ${formatNumber(previous.volume)} to ${formatNumber(current.volume)} kg·reps`;
  }

  return null;
}

export function getExerciseComparisons(
  history: WorkoutHistoryEntry[],
  range: WorkoutWeekRange,
  getExerciseName: (exerciseId: number) => string,
): ExerciseComparison[] {
  const currentSessions = history
    .filter((workout) => {
      const date = getWorkoutHistoryDate(workout);
      return (
        workout.completed &&
        date !== null &&
        date >= range.start &&
        date <= range.end
      );
    })
    .sort((a, b) => sessionTimestamp(b) - sessionTimestamp(a));

  const previousSessions = history
    .filter((workout) => {
      const date = getWorkoutHistoryDate(workout);
      return (
        workout.completed &&
        date !== null &&
        date >= range.previousStart &&
        date <= range.previousEnd
      );
    })
    .sort((a, b) => sessionTimestamp(b) - sessionTimestamp(a));

  const currentByExercise = new Map<
    string,
    { workout: WorkoutHistoryEntry; sets: Record<string, WorkoutSetRecord> }
  >();
  const previousByExercise = new Map<
    string,
    { workout: WorkoutHistoryEntry; sets: Record<string, WorkoutSetRecord> }
  >();

  for (const workout of currentSessions) {
    for (const [exerciseId, sets] of Object.entries(workout.setData ?? {})) {
      if (
        Object.values(sets).some((set) => set.completed) &&
        !currentByExercise.has(exerciseId)
      ) {
        currentByExercise.set(exerciseId, { workout, sets });
      }
    }
  }

  for (const workout of previousSessions) {
    for (const [exerciseId, sets] of Object.entries(workout.setData ?? {})) {
      if (
        Object.values(sets).some((set) => set.completed) &&
        !previousByExercise.has(exerciseId)
      ) {
        previousByExercise.set(exerciseId, { workout, sets });
      }
    }
  }

  return [...currentByExercise.entries()]
    .flatMap(([exerciseId, currentRecord]) => {
      const previousRecord = previousByExercise.get(exerciseId);
      if (!previousRecord) {
        return [];
      }

      const current = getExercisePerformance(currentRecord.sets);
      const previous = getExercisePerformance(previousRecord.sets);
      const exerciseNumber = Number(exerciseId);

      return [{
        exerciseId,
        name: getExerciseName(exerciseNumber),
        previous: formatSet(previous.bestSet),
        current: formatSet(current.bestSet),
        improvement: comparePerformance(previous, current),
      }];
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
