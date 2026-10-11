"use client";

import { useEffect, useMemo, useState } from "react";
import {
  averageRecorded,
  calculateHabitAdherence,
  calculateNutritionIntake,
  calculateNutritionAdherence,
  calculateWaterAdherence,
  calculateWorkoutMetrics,
  createCalendarDateRange,
  getCalendarDates,
  getCalendarDateInTimeZone,
} from "@/app/lib/reports";

type Goal = {
  id: number;
  title: string;
  category: "Workout" | "Learning" | "Health";
  emoji: string;
  completed: boolean;
};

type HabitDay = {
  date: string;
  goals: Goal[];
};

type StoredHabitData = {
  currentDate: string;
  goals: Goal[];
  history: HabitDay[];
};

type WaterEntry = {
  id: number;
  amount: number;
  time: string;
};

type WaterDay = {
  date: string;
  entries: WaterEntry[];
};

type StoredWaterData = {
  currentDate: string;
  entries: WaterEntry[];
  history: WaterDay[];
};

type SetData = {
  weight: string;
  reps: string;
  completed: boolean;
};

type WorkoutSetState = Record<
  number,
  Record<number, SetData>
>;

type SavedWorkout = {
  sessionId: string;
  day: string;
  date: string;
  setData: WorkoutSetState;
  started: boolean;
  startedAt: string | null;
  completed: boolean;
  completedAt: string | null;
  lastActivityAt: string | null;
  durationSeconds: number;
};

type Meal = {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  mealType: string;
  time: string;
};

type NutritionDay = {
  date: string;
  meals: Meal[];
};

type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type DayProgress = {
  day: string;
  date: string;
  value: number | null;
};

const HABIT_STORAGE_KEY = "lifeos-habits";
const WATER_STORAGE_KEY = "lifeos-water-data";
const WORKOUT_HISTORY_KEY = "lifeos-workout-history";
const MEALS_STORAGE_KEY = "lifeos-todays-meals";
const NUTRITION_HISTORY_KEY = "lifeos-nutrition-history";
const NUTRITION_TARGETS_KEY = "lifeos-nutrition-targets";

const WATER_TARGET = 3000;

const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  calories: 2300,
  protein: 150,
  carbs: 250,
  fat: 70,
};

function formatDay(dateString: string) {
  const date = new Date(`${dateString}T00:00:00`);

  return date.toLocaleDateString("en-IN", {
    weekday: "short",
  });
}

function calculateWaterProgress(entries: WaterEntry[]) {
  const totalWater = entries.reduce(
    (total, entry) => total + entry.amount,
    0
  );

  return calculateWaterAdherence(totalWater, WATER_TARGET, true);
}

function getWorkoutSets(workout: SavedWorkout) {
  const sets = Object.values(
    workout.setData || {}
  ).flatMap((exerciseSets) =>
    Object.values(exerciseSets || {})
  );

  return sets;
}

function calculateWorkoutProgress(workout: SavedWorkout) {
  return calculateWorkoutMetrics(getWorkoutSets(workout))
    .completionPercentage;
}

function calculateCompletedSets(workout: SavedWorkout) {
  return calculateWorkoutMetrics(getWorkoutSets(workout)).completedSets;
}

function calculateCompletedExercises(workout: SavedWorkout) {
  return Object.values(workout.setData || {}).filter(
    (exerciseSets) => {
      const sets = Object.values(exerciseSets || {});

      return (
        sets.length > 0 &&
        sets.every((set) => set.completed)
      );
    }
  ).length;
}

function calculateNutritionTotals(meals: Meal[]) {
  return calculateNutritionIntake(meals);
}

export default function WeeklyProgress() {
  const [habitHistory, setHabitHistory] =
    useState<HabitDay[]>([]);

  const [waterHistory, setWaterHistory] =
    useState<WaterDay[]>([]);

  const [workoutHistory, setWorkoutHistory] =
    useState<SavedWorkout[]>([]);

  const [nutritionHistory, setNutritionHistory] =
    useState<NutritionDay[]>([]);

  const [todayMeals, setTodayMeals] =
    useState<Meal[]>([]);

  const [nutritionTargets, setNutritionTargets] =
    useState<NutritionTargets>(
      DEFAULT_NUTRITION_TARGETS
    );

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    try {
      const savedHabits =
        localStorage.getItem(HABIT_STORAGE_KEY);

      if (savedHabits) {
        const parsedHabits: StoredHabitData =
          JSON.parse(savedHabits);

        if (Array.isArray(parsedHabits.history)) {
          setHabitHistory(parsedHabits.history);
        }
      }

      const savedWater =
        localStorage.getItem(WATER_STORAGE_KEY);

      if (savedWater) {
        const parsedWater: StoredWaterData =
          JSON.parse(savedWater);

        if (Array.isArray(parsedWater.history)) {
          setWaterHistory(parsedWater.history);
        }
      }

      const savedWorkoutHistory =
        localStorage.getItem(WORKOUT_HISTORY_KEY);

      if (savedWorkoutHistory) {
        const parsedWorkoutHistory =
          JSON.parse(savedWorkoutHistory);

        if (Array.isArray(parsedWorkoutHistory)) {
          setWorkoutHistory(parsedWorkoutHistory);
        }
      }

      const savedNutritionHistory =
        localStorage.getItem(
          NUTRITION_HISTORY_KEY
        );

      if (savedNutritionHistory) {
        const parsedNutritionHistory =
          JSON.parse(savedNutritionHistory);

        if (Array.isArray(parsedNutritionHistory)) {
          setNutritionHistory(
            parsedNutritionHistory
          );
        }
      }

      const savedMeals =
        localStorage.getItem(MEALS_STORAGE_KEY);

      if (savedMeals) {
        const parsedMeals = JSON.parse(savedMeals);

        if (Array.isArray(parsedMeals)) {
          setTodayMeals(parsedMeals);
        }
      }

      const savedTargets =
        localStorage.getItem(
          NUTRITION_TARGETS_KEY
        );

      if (savedTargets) {
        const parsedTargets =
          JSON.parse(savedTargets);

        if (
          parsedTargets &&
          typeof parsedTargets === "object"
        ) {
          const loadedTargets = {
            calories: Number(parsedTargets.calories),
            protein: Number(parsedTargets.protein),
            carbs: Number(parsedTargets.carbs),
            fat: Number(parsedTargets.fat),
          };

          if (
            Object.values(loadedTargets).every(
              (value) =>
                Number.isFinite(value) &&
                value > 0
            )
          ) {
            setNutritionTargets(
              loadedTargets
            );
          }
        }
      }
    } catch (error) {
      console.error(
        "Failed to load analytics data:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  const dates = useMemo(
    () => {
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone;
      const today = getCalendarDateInTimeZone(new Date(), timezone);
      const start = new Date(`${today}T00:00:00.000Z`);
      start.setUTCDate(start.getUTCDate() - 6);

      return getCalendarDates(
        createCalendarDateRange(
          start.toISOString().slice(0, 10),
          today,
          timezone,
        ),
      );
    },
    []
  );

  const habitProgress = useMemo<DayProgress[]>(
    () =>
      dates.map((date) => {
        const historyDay =
          habitHistory.find(
            (item) => item.date === date
          );

        return {
          day: formatDay(date),
          date,
          value: historyDay
            ? calculateHabitAdherence(
                historyDay.goals.filter((goal) => goal.completed).length,
                historyDay.goals.length,
              ).percentage
            : null,
        };
      }),
    [dates, habitHistory]
  );

  const waterProgress = useMemo<DayProgress[]>(
    () =>
      dates.map((date) => {
        const historyDay =
          waterHistory.find(
            (item) => item.date === date
          );

        return {
          day: formatDay(date),
          date,
          value: historyDay
            ? calculateWaterProgress(
                historyDay.entries
              )
            : null,
        };
      }),
    [dates, waterHistory]
  );

  const workoutProgress = useMemo<DayProgress[]>(
    () =>
      dates.map((date) => {
        const workoutsForDay =
          workoutHistory.filter(
            (workout) => workout.date === date
          );

        if (!workoutsForDay.length) {
          return {
            day: formatDay(date),
            date,
            value: null,
          };
        }

        const workoutValues = workoutsForDay.map(calculateWorkoutProgress);

        return {
          day: formatDay(date),
          date,
          value: averageRecorded(workoutValues),
        };
      }),
    [dates, workoutHistory]
  );

  const nutritionProgress = useMemo<DayProgress[]>(
    () =>
      dates.map((date) => {
        const historyDay =
          nutritionHistory.find(
            (item) => item.date === date
          );

        if (!historyDay) {
          return {
            day: formatDay(date),
            date,
            value: null,
          };
        }

        const totals =
          calculateNutritionTotals(
            historyDay.meals
          );

        const adherence = calculateNutritionAdherence(
          [totals],
          nutritionTargets,
          true,
        );

        return {
          day: formatDay(date),
          date,
          value: adherence?.averagePercentage ?? null,
        };
      }),
    [dates, nutritionHistory, nutritionTargets]
  );

  const habitAverage =
    useMemo(
      () => averageRecorded(habitProgress.map(({ value }) => value)),
      [habitProgress]
    );

  const waterAverage =
    useMemo(
      () => averageRecorded(waterProgress.map(({ value }) => value)),
      [waterProgress]
    );

  const workoutAverage =
    useMemo(
      () => averageRecorded(workoutProgress.map(({ value }) => value)),
      [workoutProgress]
    );

  const nutritionAverage =
    useMemo(
      () => averageRecorded(nutritionProgress.map(({ value }) => value)),
      [nutritionProgress]
    );

  const completedWorkouts =
    workoutHistory.filter(
      (workout) => workout.completed
    ).length;

  const completedSets =
    workoutHistory.reduce(
      (total, workout) =>
        total + calculateCompletedSets(workout),
      0
    );

  const completedExercises =
    workoutHistory.reduce(
      (total, workout) =>
        total +
        calculateCompletedExercises(workout),
      0
    );

  const totalWorkoutMinutes =
    Math.round(
      workoutHistory.reduce(
        (total, workout) =>
          total +
          (workout.durationSeconds || 0),
        0
      ) / 60
    );

  const todayWater = useMemo(() => {
    const timezone =
      Intl.DateTimeFormat().resolvedOptions().timeZone;
    const today = getCalendarDateInTimeZone(new Date(), timezone);

    const todayData =
      waterHistory.find(
        (item) => item.date === today
      );

    if (!todayData) {
      return 0;
    }

    return todayData.entries.reduce(
      (total, entry) =>
        total + entry.amount,
      0
    );
  }, [waterHistory]);

  const todayNutrition =
    useMemo(
      () =>
        calculateNutritionTotals(
          todayMeals
        ),
      [todayMeals]
    );

  const todayNutritionPercentages =
    calculateNutritionAdherence(
      [todayNutrition],
      nutritionTargets,
      true,
    )?.percentages ?? {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    };

  if (!loaded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Loading your analytics...
        </p>
      </div>
    );
  }

  function displayValue(
    value: number | null
  ) {
    return value === null
      ? "—"
      : `${value}%`;
  }

  function nutritionRemaining(
    consumed: number,
    target: number
  ) {
    return Math.max(
      target - consumed,
      0
    );
  }

  return (
    <div className="space-y-5">

      {/* SUMMARY CARDS */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">

        {/* HABITS */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                🎯
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Habit Performance
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {habitAverage === null ? "—" : `${habitAverage}%`}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-primary">
              7 Days
            </span>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${habitAverage ?? 0}%`,
              }}
            />
          </div>
        </div>

        {/* WATER */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-xl">
                💧
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Water Performance
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {waterAverage === null ? "—" : `${waterAverage}%`}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-blue-600">
              {(todayWater / 1000).toFixed(1)} L today
            </span>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-blue-500 transition-all duration-500"
              style={{
                width: `${waterAverage ?? 0}%`,
              }}
            />
          </div>
        </div>

        {/* WORKOUT */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-xl">
                💪
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Workout Performance
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {workoutAverage === null ? "—" : `${workoutAverage}%`}
                </p>
              </div>
            </div>
            <span className="text-sm font-semibold text-orange-600">
              {completedWorkouts} workouts
            </span>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-orange-500 transition-all duration-500"
              style={{
                width: `${workoutAverage ?? 0}%`,
              }}
            />
          </div>
        </div>

        {/* NUTRITION */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xl">
                🍎
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500">
                  Nutrition Performance
                </p>
                <p className="text-2xl font-bold text-slate-900">
                  {nutritionAverage === null ? "—" : `${nutritionAverage}%`}
                </p>
              </div>
            </div>

            <span className="text-sm font-semibold text-primary">
              Today {todayNutritionPercentages.calories}%
            </span>
          </div>

          <div className="mt-4 h-2.5 overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-primary transition-all duration-500"
              style={{
                width: `${nutritionAverage ?? 0}%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* WORKOUT SUMMARY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            💪 Workout Summary
          </h2>
          <p className="mt-1 text-xs text-slate-500">
            Your completed workout activity
          </p>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-primary">
              {completedWorkouts}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Workouts
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-blue-600">
              {completedSets}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Sets Done
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-purple-600">
              {completedExercises}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Exercises
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-2xl font-bold text-orange-600">
              {totalWorkoutMinutes}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Minutes
            </p>
          </div>
        </div>
      </div>

      {/* NUTRITION TODAY */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              🍎 Today&apos;s Nutrition
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Compare what you consumed with your personal daily targets.
            </p>
          </div>

          <div className="rounded-xl bg-primary/10 px-4 py-2">
            <p className="text-xs font-medium text-primary">
              Overall
            </p>
            <p className="text-xl font-bold text-primary">
              {todayNutritionPercentages.calories}%
            </p>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">

          {/* CALORIES */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                🔥 Calories
              </span>
              <span className="text-sm font-bold text-slate-900">
                {Math.round(todayNutrition.calories)} /{" "}
                {Math.round(nutritionTargets.calories)} kcal
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-orange-500"
                style={{
                  width: `${todayNutritionPercentages.calories}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {Math.round(
                nutritionRemaining(
                  todayNutrition.calories,
                  nutritionTargets.calories
                )
              )}{" "}
              kcal remaining
            </p>
          </div>

          {/* PROTEIN */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                💪 Protein
              </span>
              <span className="text-sm font-bold text-slate-900">
                {todayNutrition.protein.toFixed(1)} /{" "}
                {nutritionTargets.protein.toFixed(1)} g
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-primary"
                style={{
                  width: `${todayNutritionPercentages.protein}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {nutritionRemaining(
                todayNutrition.protein,
                nutritionTargets.protein
              ).toFixed(1)}{" "}
              g remaining
            </p>
          </div>

          {/* CARBS */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                🌾 Carbs
              </span>
              <span className="text-sm font-bold text-slate-900">
                {todayNutrition.carbs.toFixed(1)} /{" "}
                {nutritionTargets.carbs.toFixed(1)} g
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-yellow-500"
                style={{
                  width: `${todayNutritionPercentages.carbs}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {nutritionRemaining(
                todayNutrition.carbs,
                nutritionTargets.carbs
              ).toFixed(1)}{" "}
              g remaining
            </p>
          </div>

          {/* FAT */}
          <div className="rounded-xl border border-slate-100 bg-slate-50 p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">
                🥑 Fat
              </span>
              <span className="text-sm font-bold text-slate-900">
                {todayNutrition.fat.toFixed(1)} /{" "}
                {nutritionTargets.fat.toFixed(1)} g
              </span>
            </div>

            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-white">
              <div
                className="h-full rounded-full bg-purple-500"
                style={{
                  width: `${todayNutritionPercentages.fat}%`,
                }}
              />
            </div>

            <p className="mt-2 text-xs text-slate-500">
              {nutritionRemaining(
                todayNutrition.fat,
                nutritionTargets.fat
              ).toFixed(1)}{" "}
              g remaining
            </p>
          </div>
        </div>
      </div>

      {/* HABIT PROGRESS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              🎯 Habit Progress
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your actual habit consistency for the last 7 days
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-500">
              Weekly Average
            </p>
            <p className="text-2xl font-bold text-primary">
              {habitAverage === null ? "—" : `${habitAverage}%`}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {habitProgress.map((item) => (
            <div key={item.date}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {item.day}
                </span>
                <span className="font-semibold text-slate-600">
                  {displayValue(item.value)}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {item.value !== null && (
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${item.value}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WATER PROGRESS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              💧 Water Progress
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Daily hydration against your 3 L goal
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-500">
              Weekly Average
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {waterAverage === null ? "—" : `${waterAverage}%`}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {waterProgress.map((item) => (
            <div key={item.date}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {item.day}
                </span>
                <span className="font-semibold text-slate-600">
                  {displayValue(item.value)}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {item.value !== null && (
                  <div
                    className="h-full rounded-full bg-blue-500"
                    style={{
                      width: `${item.value}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* WORKOUT PROGRESS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              💪 Workout Progress
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Workout completion for the last 7 days
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-500">
              Weekly Average
            </p>
            <p className="text-2xl font-bold text-orange-600">
              {workoutAverage === null ? "—" : `${workoutAverage}%`}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {workoutProgress.map((item) => (
            <div key={item.date}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {item.day}
                </span>
                <span className="font-semibold text-slate-600">
                  {displayValue(item.value)}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {item.value !== null && (
                  <div
                    className="h-full rounded-full bg-orange-500"
                    style={{
                      width: `${item.value}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* NUTRITION PROGRESS */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              🍎 Nutrition Progress
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Daily nutrition goal adherence for the last 7 days
            </p>
          </div>

          <div className="text-right">
            <p className="text-sm text-slate-500">
              Weekly Average
            </p>
            <p className="text-2xl font-bold text-primary">
              {nutritionAverage === null ? "—" : `${nutritionAverage}%`}
            </p>
          </div>
        </div>

        <div className="mt-6 space-y-4">
          {nutritionProgress.map((item) => (
            <div key={item.date}>
              <div className="mb-1 flex justify-between text-sm">
                <span className="font-medium text-slate-700">
                  {item.day}
                </span>
                <span className="font-semibold text-slate-600">
                  {displayValue(item.value)}
                </span>
              </div>

              <div className="h-3 w-full overflow-hidden rounded-full bg-slate-100">
                {item.value !== null && (
                  <div
                    className="h-full rounded-full bg-primary"
                    style={{
                      width: `${item.value}%`,
                    }}
                  />
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 rounded-xl bg-slate-50 p-4">
          <p className="text-xs leading-relaxed text-slate-500">
            Nutrition performance is calculated from calories,
            protein, carbs, and fat against your personal daily
            targets.
          </p>
        </div>
      </div>

      {/* INFO */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm leading-relaxed text-slate-600">
          Your Analytics page combines your real habit, water,
          workout, and nutrition data. Days without recorded
          activity are shown as — and are not included in weekly
          averages.
        </p>
      </div>
    </div>
  );
}
