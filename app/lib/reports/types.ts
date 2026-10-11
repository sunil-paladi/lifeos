export type CalendarDate = string;

export interface CalendarDateRange {
  from: CalendarDate;
  to: CalendarDate;
  timezone: string;
  startAt: Date;
  endExclusiveAt: Date;
  dayCount: number;
}

export interface MetricComparison {
  current: number | null;
  previous: number | null;
  absoluteChange: number | null;
  percentageChange: number | null;
}

export interface HabitAdherence {
  completed: number;
  scheduled: number;
  percentage: number | null;
}

export interface WorkoutMetrics {
  completedSets: number;
  totalSets: number;
  completionPercentage: number | null;
  weightedVolume: number | null;
  weightedSets: number;
}

export interface NutritionTargets {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionIntake {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface NutritionAdherence {
  intake: NutritionIntake;
  percentages: NutritionIntake;
  averagePercentage: number | null;
}
