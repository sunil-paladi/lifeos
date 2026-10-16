import { exercises } from "@/app/data/exercises";
import type { GeneratedWorkout } from "@/app/lib/ai-workout-types";
import type { MuscleGroup } from "@/app/context/ProgramContext";
import type { DayWorkout, DayName } from "@/app/context/ProgramContext";

interface StoredWorkoutDay {
  id: string;
  weekId: string;
  name: string;
  programExercises: StoredProgramExercise[];
}

interface StoredProgramWeek {
  id: string;
  phaseId: string;
  weekNumber: number;
  workoutDays: StoredWorkoutDay[];
}

interface StoredProgramPhase {
  id: string;
  phaseOrder: number;
  weeks: StoredProgramWeek[];
}

export interface TrainingPlanStructure {
  plan: {
    id: string;
    totalWeeks: number;
    startDate?: string | null;
    createdAt?: string | null;
  };
  phases: StoredProgramPhase[];
}

export function isCurrentProgramLoad(
  requestVersion: number,
  currentVersion: number,
): boolean {
  return requestVersion === currentVersion;
}

interface StoredProgramExercise {
  workoutDayId: string;
  exerciseId: string;
  exerciseOrder: number;
  sets: number;
  minReps: number;
  maxReps: number;
  restSeconds: number | null;
  exercise: {
    id: string;
    primaryMuscle: string;
  } | null;
}

function findExerciseById(exerciseId: number) {
  for (const groupExercises of Object.values(exercises)) {
    const exercise = groupExercises.find((item) => item.id === exerciseId);
    if (exercise) {
      return exercise;
    }
  }
  return undefined;
}

function findExerciseGroupById(exerciseId: number) {
  for (const [groupName, groupExercises] of Object.entries(exercises)) {
    if (groupExercises.some((exercise) => exercise.id === exerciseId)) {
      return groupName;
    }
  }
  return undefined;
}

export function mapProgramExercisesToMuscleGroups(
  programExercises: readonly StoredProgramExercise[],
): MuscleGroup[] {
  const muscleGroups: MuscleGroup[] = [];

  for (const programExercise of programExercises) {
    const libraryExercise = programExercise.exercise;
    if (!libraryExercise) {
      continue;
    }

    const exerciseId = Number(libraryExercise.id);
    const primaryMuscle = libraryExercise.primaryMuscle;
    const muscleName =
      findExerciseGroupById(exerciseId) ??
      (["Middle Back", "Upper Back", "Lats", "Lower Back", "Back"].includes(
        primaryMuscle,
      )
        ? "Back"
        : primaryMuscle);
    const catalogExercise = findExerciseById(exerciseId);

    let muscle = muscleGroups.find((item) => item.name === muscleName);
    if (!muscle) {
      muscle = {
        id: muscleGroups.length + 1,
        name: muscleName,
        exercises: [],
      };
      muscleGroups.push(muscle);
    }

    muscle.exercises.push({
      id: exerciseId,
      type: catalogExercise?.type === "cardio" ? "cardio" : "strength",
      ...(catalogExercise?.type === "cardio"
        ? {
            duration: catalogExercise.duration ?? 20,
            rest: programExercise.restSeconds ?? 0,
          }
        : {
            sets: programExercise.sets,
            reps: programExercise.minReps,
            rest: programExercise.restSeconds ?? 60,
          }),
    });
  }

  return muscleGroups;
}

const DAY_NAMES: readonly DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

export function mapTrainingPlanStructureToWeeks(
  phases: readonly StoredProgramPhase[],
  totalWeeks: number,
): { weeks: DayWorkout[]; hasExercises: boolean } {
  const weeks = Array.from({ length: totalWeeks }, (): DayWorkout => ({
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  }));
  let hasExercises = false;

  for (const phase of phases) {
    for (const week of phase.weeks) {
      const weekIndex = week.weekNumber - 1;
      if (weekIndex < 0 || weekIndex >= weeks.length) {
        continue;
      }

      for (const day of week.workoutDays) {
        if (!DAY_NAMES.includes(day.name as DayName) || day.programExercises.length === 0) {
          continue;
        }
        hasExercises = true;
        weeks[weekIndex][day.name as DayName] =
          mapProgramExercisesToMuscleGroups(day.programExercises);
      }
    }
  }

  return { weeks, hasExercises };
}

export function verifySavedWorkoutStructure(
  input: unknown,
  expectedPlanId: string,
  workout: GeneratedWorkout,
  expectedWeeks: number,
): TrainingPlanStructure {
  if (
    typeof input !== "object" ||
    input === null ||
    !("plan" in input) ||
    typeof input.plan !== "object" ||
    input.plan === null ||
    !("id" in input.plan) ||
    input.plan.id !== expectedPlanId ||
    !("totalWeeks" in input.plan) ||
    input.plan.totalWeeks !== expectedWeeks ||
    !("phases" in input) ||
    !Array.isArray(input.phases)
  ) {
    throw new Error("Saved workout structure did not match the target plan");
  }

  const structure = input as TrainingPlanStructure;
  const phase = structure.phases.find(({ phaseOrder }) => phaseOrder === 1);
  if (!phase || phase.weeks.length !== expectedWeeks) {
    throw new Error("Saved workout structure is missing plan weeks");
  }

  for (const expectedDay of workout.days) {
    for (const week of phase.weeks) {
      if (week.phaseId !== phase.id) {
        throw new Error("Saved workout week belongs to a different phase");
      }
      const day = week.workoutDays.find(({ name }) => name === expectedDay.day);
      if (
        !day ||
        !day.id ||
        day.weekId !== week.id ||
        !week.id ||
        !phase.id
      ) {
        throw new Error("Saved workout structure is missing a selected day");
      }
      const persisted = day.programExercises;
      if (persisted.length !== expectedDay.exercises.length) {
        throw new Error("Saved workout structure has an unexpected exercise count");
      }

      for (const [index, expectedExercise] of expectedDay.exercises.entries()) {
        const row = persisted.find(
          ({ exerciseId }) => Number(exerciseId) === expectedExercise.exerciseId,
        );
        if (
          !row ||
          row.workoutDayId !== day.id ||
          !row.exercise ||
          row.exercise.id !== String(expectedExercise.exerciseId) ||
          row.exerciseOrder !== index + 1 ||
          row.sets !== expectedExercise.sets ||
          row.minReps !== expectedExercise.reps ||
          row.maxReps !== expectedExercise.reps ||
          row.restSeconds !== expectedExercise.restSeconds
        ) {
          throw new Error("Saved workout structure does not match the generated workout");
        }
      }
    }
  }

  return structure;
}
