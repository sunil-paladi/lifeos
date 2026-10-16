import type { DayWorkout, MuscleGroup, ProgramExercise } from "@/app/context/ProgramContext";

export const MIN_PROGRAM_DURATION_WEEKS = 1;
export const MAX_PROGRAM_DURATION_WEEKS = 52;

export interface StoredProgramState {
  weeks: DayWorkout[];
  durationWeeks: number;
}

const dayNames: readonly (keyof DayWorkout)[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function isValidProgramDuration(weeks: unknown): weeks is number {
  return (
    typeof weeks === "number" &&
    Number.isInteger(weeks) &&
    weeks >= MIN_PROGRAM_DURATION_WEEKS &&
    weeks <= MAX_PROGRAM_DURATION_WEEKS
  );
}

export function parseStoredProgram(
  serialized: string | null,
  defaultDurationWeeks: number,
): StoredProgramState | null {
  if (!serialized) {
    return null;
  }

  let parsed: {
    weeks?: Array<Partial<DayWorkout> | null>;
    durationWeeks?: unknown;
  } | null;
  try {
    parsed = JSON.parse(serialized) as typeof parsed;
  } catch {
    return null;
  }

  if (!parsed || !Array.isArray(parsed.weeks)) {
    return null;
  }

  const weeks = parsed.weeks.map((week): DayWorkout => ({
    Monday: week?.Monday || [],
    Tuesday: week?.Tuesday || [],
    Wednesday: week?.Wednesday || [],
    Thursday: week?.Thursday || [],
    Friday: week?.Friday || [],
    Saturday: week?.Saturday || [],
    Sunday: week?.Sunday || [],
  }));
  const durationWeeks = isValidProgramDuration(parsed.durationWeeks)
    ? parsed.durationWeeks
    : isValidProgramDuration(weeks.length)
      ? weeks.length
      : defaultDurationWeeks;

  return { weeks, durationWeeks };
}

export function serializeStoredProgram(
  weeks: DayWorkout[],
  durationWeeks: number,
) {
  return JSON.stringify({ weeks, durationWeeks });
}

export function isWorkoutWeekEmpty(week: DayWorkout | undefined) {
  return !week || dayNames.every((day) => week[day].length === 0);
}

export function copyWorkoutWeek(week: DayWorkout): DayWorkout {
  const copyDay = (day: keyof DayWorkout) =>
    week[day].map(
      (muscle): MuscleGroup => ({
        id: muscle.id,
        name: muscle.name,
        exercises: muscle.exercises.map(
          (exercise): ProgramExercise => ({
            id: exercise.id,
            ...(exercise.type === undefined ? {} : { type: exercise.type }),
            ...(exercise.sets === undefined ? {} : { sets: exercise.sets }),
            ...(exercise.reps === undefined ? {} : { reps: exercise.reps }),
            ...(exercise.rest === undefined ? {} : { rest: exercise.rest }),
            ...(exercise.duration === undefined ? {} : { duration: exercise.duration }),
          }),
        ),
      }),
    );

  return {
    Monday: copyDay("Monday"),
    Tuesday: copyDay("Tuesday"),
    Wednesday: copyDay("Wednesday"),
    Thursday: copyDay("Thursday"),
    Friday: copyDay("Friday"),
    Saturday: copyDay("Saturday"),
    Sunday: copyDay("Sunday"),
  };
}
