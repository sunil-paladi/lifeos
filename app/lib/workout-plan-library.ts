import { exercises } from "@/app/data/exercises";
import type {
  GeneratedWorkout,
  GeneratedWorkoutDay,
  WorkoutDayName,
} from "@/app/lib/ai-workout-types";
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  WORKOUT_LOCATIONS,
} from "@/app/lib/ai-workout-types";

type ExercisePrescription = readonly [exerciseId: number, sets: number, reps: number];
export type WorkoutPlanGoal = (typeof FITNESS_GOALS)[number];
export type WorkoutPlanExperience = (typeof EXPERIENCE_LEVELS)[number];
export type WorkoutPlanLocation = (typeof WORKOUT_LOCATIONS)[number];

interface WorkoutPlanSeed {
  id: string;
  name: string;
  focus: string;
  goal: WorkoutPlanGoal;
  experienceLevels: readonly WorkoutPlanExperience[];
  location: WorkoutPlanLocation;
  description: string;
  days: readonly {
    day: WorkoutDayName;
    exercises: readonly ExercisePrescription[];
  }[];
}

export interface WorkoutPlanPreview extends Omit<WorkoutPlanSeed, "days"> {
  workout: GeneratedWorkout;
  daysPerWeek: number;
  days: {
    day: WorkoutDayName;
    exercises: {
      exerciseId: number;
      name: string;
      sets: number;
      reps: number;
      restSeconds: number;
      exerciseOrder: number;
    }[];
  }[];
}

export interface WorkoutPlanFilters {
  goal?: WorkoutPlanGoal;
  experienceLevel?: WorkoutPlanExperience;
  location?: WorkoutPlanLocation;
  daysPerWeek?: number;
}

const DEFAULT_REST_SECONDS = 90;

const WORKOUT_PLAN_SEEDS: readonly WorkoutPlanSeed[] = [
  {
    id: "beginner-full-body",
    name: "Beginner Full-Body",
    focus: "Full body",
    goal: "General fitness",
    experienceLevels: ["Beginner"],
    location: "Gym",
    description: "A simple full-body routine using familiar machine and dumbbell movements.",
    days: [
      { day: "Monday", exercises: [[3, 3, 10], [101, 3, 10], [202, 3, 10], [701, 3, 12]] },
      { day: "Wednesday", exercises: [[2, 3, 10], [102, 3, 10], [206, 3, 8], [702, 3, 30]] },
      { day: "Friday", exercises: [[7, 3, 10], [101, 3, 10], [207, 3, 8], [703, 3, 10]] },
    ],
  },
  {
    id: "upper-lower",
    name: "Upper / Lower",
    focus: "Upper and lower body",
    goal: "Muscle gain",
    experienceLevels: ["Beginner", "Intermediate"],
    location: "Gym",
    description: "Alternates upper-body sessions with lower-body sessions for a balanced week.",
    days: [
      { day: "Monday", exercises: [[3, 3, 10], [101, 3, 10], [301, 3, 10], [402, 3, 12]] },
      { day: "Tuesday", exercises: [[201, 3, 10], [204, 3, 12], [208, 3, 12], [701, 3, 12]] },
      { day: "Thursday", exercises: [[2, 3, 10], [102, 3, 10], [303, 3, 12], [501, 3, 12]] },
      { day: "Friday", exercises: [[202, 3, 10], [205, 3, 12], [206, 3, 8], [702, 3, 30]] },
    ],
  },
  {
    id: "push-pull-legs",
    name: "Push / Pull / Legs",
    focus: "Push, pull, legs",
    goal: "Muscle gain",
    experienceLevels: ["Intermediate"],
    location: "Gym",
    description: "Groups pressing, pulling, and lower-body movements into separate sessions.",
    days: [
      { day: "Monday", exercises: [[3, 4, 8], [301, 3, 10], [501, 3, 12]] },
      { day: "Wednesday", exercises: [[101, 4, 8], [102, 3, 10], [402, 3, 12], [605, 3, 30]] },
      { day: "Friday", exercises: [[201, 4, 10], [204, 3, 12], [207, 3, 8], [208, 3, 12]] },
    ],
  },
  {
    id: "combined-muscle-groups",
    name: "Combined Muscle Groups",
    focus: "Chest + triceps, back + biceps",
    goal: "Strength",
    experienceLevels: ["Beginner", "Intermediate"],
    location: "Gym",
    description: "Pairs complementary upper-body muscle groups across two sessions.",
    days: [
      { day: "Monday", exercises: [[3, 3, 10], [7, 3, 10], [501, 3, 12], [502, 3, 12]] },
      { day: "Thursday", exercises: [[101, 3, 10], [102, 3, 10], [402, 3, 12], [403, 3, 12]] },
    ],
  },
  {
    id: "home-bodyweight",
    name: "Home Bodyweight Starter",
    focus: "Bodyweight",
    goal: "General fitness",
    experienceLevels: ["Beginner"],
    location: "Both",
    description: "A minimal-equipment upper-body and core routine using the current bodyweight catalog.",
    days: [
      { day: "Monday", exercises: [[7, 3, 8], [701, 3, 12], [703, 3, 10]] },
      { day: "Thursday", exercises: [[7, 3, 8], [702, 3, 30], [705, 3, 12]] },
    ],
  },
  {
    id: "upper-lower-five-day",
    name: "Upper / Lower (5 days)",
    focus: "Upper and lower body",
    goal: "Muscle gain",
    experienceLevels: ["Intermediate"],
    location: "Gym",
    description: "Three upper and two lower sessions, with recovery gaps between repeated muscle groups.",
    days: [
      { day: "Monday", exercises: [[3, 3, 10], [104, 3, 10], [301, 3, 10], [402, 3, 12], [501, 3, 12]] },
      { day: "Tuesday", exercises: [[201, 3, 10], [204, 3, 12], [208, 3, 12], [702, 3, 30]] },
      { day: "Thursday", exercises: [[2, 3, 10], [103, 3, 10], [303, 3, 12], [403, 3, 12], [502, 3, 12]] },
      { day: "Friday", exercises: [[202, 3, 12], [205, 3, 12], [207, 3, 8], [701, 3, 15]] },
      { day: "Saturday", exercises: [[1, 3, 8], [105, 3, 8], [305, 3, 15], [401, 3, 12], [503, 3, 10]] },
    ],
  },
  {
    id: "push-pull-legs-five-day",
    name: "Push / Pull / Legs (5 days)",
    focus: "Push, pull, legs + upper/lower",
    goal: "Muscle gain",
    experienceLevels: ["Intermediate"],
    location: "Gym",
    description: "A five-session PPL hybrid with a second upper/lower exposure and a midweek recovery day.",
    days: [
      { day: "Monday", exercises: [[1, 3, 8], [301, 3, 10], [501, 3, 12]] },
      { day: "Tuesday", exercises: [[101, 3, 10], [104, 3, 10], [305, 3, 15], [402, 3, 12]] },
      { day: "Wednesday", exercises: [[201, 3, 10], [204, 3, 12], [208, 3, 12]] },
      { day: "Friday", exercises: [[2, 3, 10], [103, 3, 10], [303, 3, 12], [403, 3, 12], [502, 3, 12]] },
      { day: "Saturday", exercises: [[202, 3, 12], [206, 3, 10], [207, 3, 8], [701, 3, 15]] },
    ],
  },
  {
    id: "push-pull-legs-six-day",
    name: "Push / Pull / Legs (6 days)",
    focus: "Push, pull, legs",
    goal: "Muscle gain",
    experienceLevels: ["Advanced"],
    location: "Gym",
    description: "Alternates two distinct push, pull, and leg sessions across six training days.",
    days: [
      { day: "Monday", exercises: [[1, 3, 8], [301, 3, 10], [501, 3, 12]] },
      { day: "Tuesday", exercises: [[101, 3, 10], [104, 3, 10], [402, 3, 12]] },
      { day: "Wednesday", exercises: [[201, 3, 10], [204, 3, 12], [208, 3, 12]] },
      { day: "Thursday", exercises: [[2, 3, 10], [303, 3, 12], [502, 3, 12]] },
      { day: "Friday", exercises: [[102, 3, 10], [105, 3, 8], [403, 3, 12]] },
      { day: "Saturday", exercises: [[202, 3, 12], [205, 3, 12], [206, 3, 10], [207, 3, 8]] },
    ],
  },
  {
    id: "body-part-split-five-day",
    name: "Body-Part Split (5 days)",
    focus: "Chest, legs, back, shoulders, arms",
    goal: "Muscle gain",
    experienceLevels: ["Intermediate"],
    location: "Gym",
    description: "Focused muscle-group days with a rest day before the final shoulder and arm sessions.",
    days: [
      { day: "Monday", exercises: [[1, 3, 8], [2, 3, 10], [4, 3, 12]] },
      { day: "Tuesday", exercises: [[201, 3, 10], [204, 3, 12], [206, 3, 10], [208, 3, 12]] },
      { day: "Wednesday", exercises: [[101, 3, 10], [102, 3, 10], [104, 3, 10]] },
      { day: "Friday", exercises: [[303, 3, 12], [305, 3, 15], [306, 3, 15]] },
      { day: "Saturday", exercises: [[402, 3, 12], [403, 3, 12], [501, 3, 12], [502, 3, 12], [701, 3, 15]] },
    ],
  },
  {
    id: "body-part-split-six-day",
    name: "Body-Part Split (6 days)",
    focus: "Chest, legs, back, arms, shoulders, core",
    goal: "Muscle gain",
    experienceLevels: ["Advanced"],
    location: "Gym",
    description: "A focused six-day split with separate arm, shoulder, and core sessions.",
    days: [
      { day: "Monday", exercises: [[1, 3, 8], [2, 3, 10], [4, 3, 12]] },
      { day: "Tuesday", exercises: [[201, 3, 10], [204, 3, 12], [206, 3, 10], [208, 3, 12]] },
      { day: "Wednesday", exercises: [[101, 3, 10], [102, 3, 10], [105, 3, 8]] },
      { day: "Thursday", exercises: [[401, 3, 12], [402, 3, 12], [501, 3, 12], [502, 3, 12]] },
      { day: "Friday", exercises: [[303, 3, 12], [305, 3, 15], [306, 3, 15]] },
      { day: "Saturday", exercises: [[701, 3, 15], [702, 3, 30], [703, 3, 10], [601, 3, 15]] },
    ],
  },
  {
    id: "home-dumbbell-bodyweight-five-day",
    name: "Home Dumbbell & Bodyweight (5 days)",
    focus: "Dumbbell and bodyweight split",
    goal: "General fitness",
    experienceLevels: ["Beginner", "Intermediate"],
    location: "Home",
    description: "A home-friendly split using only cataloged dumbbell and bodyweight exercises.",
    days: [
      { day: "Monday", exercises: [[7, 3, 10], [502, 3, 12]] },
      { day: "Tuesday", exercises: [[104, 3, 10], [402, 3, 12], [403, 3, 12]] },
      { day: "Wednesday", exercises: [[202, 3, 12], [206, 3, 10], [703, 3, 10]] },
      { day: "Friday", exercises: [[301, 3, 10], [303, 3, 12], [305, 3, 15]] },
      { day: "Saturday", exercises: [[702, 3, 30], [705, 3, 12]] },
    ],
  },
];

function buildWorkoutDay(
  day: WorkoutPlanSeed["days"][number],
): GeneratedWorkoutDay {
  return {
    day: day.day,
    exercises: day.exercises.map(([exerciseId, sets, reps], index) => ({
      exerciseId,
      sets,
      reps,
      restSeconds: DEFAULT_REST_SECONDS,
      exerciseOrder: index + 1,
    })),
  };
}

function getExerciseName(exerciseId: number): string {
  const exercise = Object.values(exercises)
    .flat()
    .find((item) => item.id === exerciseId);
  if (!exercise) {
    throw new Error(`Workout plan library references an unknown exercise ID: ${exerciseId}`);
  }
  return exercise.name;
}

export function getWorkoutPlanLibrary(): WorkoutPlanPreview[] {
  return WORKOUT_PLAN_SEEDS.map((seed) => {
    const workout = { days: seed.days.map(buildWorkoutDay) };
    return {
      ...seed,
      workout,
      daysPerWeek: seed.days.length,
      days: workout.days.map(({ day, exercises: dayExercises }) => ({
        day,
        exercises: dayExercises.map((exercise) => ({
          ...exercise,
          name: getExerciseName(exercise.exerciseId),
        })),
      })),
    };
  });
}

export function getWorkoutPlanById(id: string): WorkoutPlanPreview | undefined {
  return getWorkoutPlanLibrary().find((plan) => plan.id === id);
}

export function filterWorkoutPlans(
  plans: readonly WorkoutPlanPreview[],
  filters: WorkoutPlanFilters,
): WorkoutPlanPreview[] {
  return plans.filter((plan) =>
    (!filters.goal || plan.goal === filters.goal) &&
    (!filters.experienceLevel || plan.experienceLevels.includes(filters.experienceLevel)) &&
    (!filters.location || plan.location === filters.location || plan.location === "Both") &&
    (!filters.daysPerWeek || plan.daysPerWeek === filters.daysPerWeek),
  );
}
