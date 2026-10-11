import type {
  HabitAdherence,
  MetricComparison,
  NutritionAdherence,
  NutritionIntake,
  NutritionTargets,
  WorkoutMetrics,
} from "./types";

export interface WorkoutSetInput {
  completed: boolean;
  weight?: number | string | null;
  reps?: number | string | null;
}

export interface NutritionMealInput {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

const NUTRIENTS = ["calories", "protein", "carbs", "fat"] as const;

export function calculateNutritionIntake(
  meals: readonly NutritionMealInput[],
): NutritionIntake {
  return meals.reduce<NutritionIntake>(
    (total, meal) => {
      for (const nutrient of NUTRIENTS) {
        if (!Number.isFinite(meal[nutrient]) || meal[nutrient] < 0) {
          throw new RangeError("Nutrition values must be finite and non-negative");
        }
      }

      return {
        calories: total.calories + meal.calories,
        protein: total.protein + meal.protein,
        carbs: total.carbs + meal.carbs,
        fat: total.fat + meal.fat,
      };
    },
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  );
}

export function averageRecorded(values: readonly (number | null)[]): number | null {
  const recorded = values.filter(
    (value): value is number => value !== null && Number.isFinite(value),
  );

  if (!recorded.length) {
    return null;
  }

  return Math.round(recorded.reduce((sum, value) => sum + value, 0) / recorded.length);
}

export function calculateHabitAdherence(
  completed: number,
  scheduled: number,
  recorded = true,
): HabitAdherence {
  const validCounts =
    Number.isInteger(completed) &&
    Number.isInteger(scheduled) &&
    completed >= 0 &&
    scheduled >= 0 &&
    completed <= scheduled;
  if (!validCounts) {
    throw new RangeError("Habit counts must be non-negative integers with completed <= scheduled");
  }
  const hasSchedule = recorded && scheduled > 0;

  return {
    completed,
    scheduled,
    percentage: hasSchedule
      ? Math.round((completed / scheduled) * 100)
      : null,
  };
}

export function calculateWaterAdherence(
  amount: number,
  target: number,
  recorded: boolean,
): number | null {
  if (
    !recorded ||
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isFinite(target) ||
    target <= 0
  ) {
    return null;
  }

  return Math.min(Math.round((amount / target) * 100), 100);
}

export function calculateWorkoutMetrics(
  sets: readonly WorkoutSetInput[],
): WorkoutMetrics {
  let completedSets = 0;
  let weightedVolume = 0;
  let weightedSets = 0;

  for (const set of sets) {
    if (set.completed) {
      completedSets += 1;
    }

    if (!set.completed) {
      continue;
    }

    const weight = Number(set.weight ?? 0);
    const reps = Number(set.reps ?? 0);

    if (
      Number.isFinite(weight) &&
      weight > 0 &&
      Number.isFinite(reps) &&
      reps >= 0
    ) {
      weightedVolume += weight * reps;
      weightedSets += 1;
    }
  }

  return {
    completedSets,
    totalSets: sets.length,
    completionPercentage: sets.length
      ? Math.round((completedSets / sets.length) * 100)
      : null,
    weightedVolume: weightedSets ? weightedVolume : null,
    weightedSets,
  };
}

export function calculateNutritionAdherence(
  meals: readonly NutritionMealInput[],
  targets: NutritionTargets | null,
  recorded: boolean,
): NutritionAdherence | null {
  if (
    !recorded ||
    !targets ||
    NUTRIENTS.some(
      (nutrient) =>
        !Number.isFinite(targets[nutrient]) || targets[nutrient] <= 0,
    )
  ) {
    return null;
  }

  const intake = calculateNutritionIntake(meals);

  const percentages: NutritionIntake = {
    calories: Math.min(Math.round((intake.calories / targets.calories) * 100), 100),
    protein: Math.min(Math.round((intake.protein / targets.protein) * 100), 100),
    carbs: Math.min(Math.round((intake.carbs / targets.carbs) * 100), 100),
    fat: Math.min(Math.round((intake.fat / targets.fat) * 100), 100),
  };

  return {
    intake,
    percentages,
    averagePercentage: Math.round(
      NUTRIENTS.reduce((sum, nutrient) => sum + percentages[nutrient], 0) /
        NUTRIENTS.length,
    ),
  };
}

export function compareMetricPeriods(
  current: number | null,
  previous: number | null,
): MetricComparison {
  const validCurrent = current !== null && Number.isFinite(current);
  const validPrevious = previous !== null && Number.isFinite(previous);
  const canCompare = validCurrent && validPrevious;
  const absoluteChange = canCompare ? current - previous : null;

  return {
    current: validCurrent ? current : null,
    previous: validPrevious ? previous : null,
    absoluteChange,
    percentageChange:
      !canCompare || previous === 0
        ? null
        : ((current - previous) / Math.abs(previous)) * 100,
  };
}
