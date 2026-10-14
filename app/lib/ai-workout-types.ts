import { exercises } from "@/app/data/exercises";

export const WORKOUT_DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export const DEFAULT_WORKOUT_TRAINING_DAYS = ["Monday"] as const;

export const FITNESS_GOALS = [
  "Strength",
  "Muscle gain",
  "General fitness",
  "Fat loss",
] as const;

export const EXPERIENCE_LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
] as const;

export const WORKOUT_LOCATIONS = ["Gym", "Home", "Both"] as const;
export const WORKOUT_SPLITS = [
  "Let AI decide",
  "Single muscle group per day",
  "Combined muscle groups",
  "Full body",
  "Upper / Lower",
] as const;

export type WorkoutDayName = (typeof WORKOUT_DAYS)[number];
export type WorkoutLocation = (typeof WORKOUT_LOCATIONS)[number];
export type WorkoutSplit = (typeof WORKOUT_SPLITS)[number];

export interface WorkoutPreferences {
  fitnessGoal: (typeof FITNESS_GOALS)[number];
  experienceLevel: (typeof EXPERIENCE_LEVELS)[number];
  workoutLocation?: WorkoutLocation;
  workoutSplit?: WorkoutSplit;
  availableEquipment?: string[];
  trainingDays: WorkoutDayName[];
  limitations: string;
}

export interface GeneratedWorkoutExercise {
  exerciseId: number;
  sets: number;
  reps: number;
  restSeconds: number;
  exerciseOrder: number;
}

export interface GeneratedWorkoutDay {
  day: WorkoutDayName;
  exercises: GeneratedWorkoutExercise[];
}

export interface GeneratedWorkout {
  days: GeneratedWorkoutDay[];
}

export const STRENGTH_EQUIPMENT = [
  ...new Set(
    Object.values(exercises)
      .flat()
      .filter((exercise) => exercise.type !== "cardio")
      .map((exercise) => exercise.equipment),
  ),
].sort();
