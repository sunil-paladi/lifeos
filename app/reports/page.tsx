"use client";

import { useEffect, useMemo, useState } from "react";

type ReportPeriod = "weekly" | "monthly";

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

type WorkoutSetState = Record<number, Record<number, SetData>>;

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

type JournalEntry = {
  date: string;
  mood?: string;
  note?: string;
  achievement?: string;
  learning?: string;
};

type Summary = {
  workouts: number;
  workoutMinutes: number;
  habitAverage: number | null;
  waterAverage: number | null;
  waterDays: number;
  nutritionAverage: number | null;
  nutritionDays: number;
  journalEntries: number;
};

const HABIT_STORAGE_KEY = "lifeos-habits";
const WATER_STORAGE_KEY = "lifeos-water-data";
const WORKOUT_HISTORY_KEY = "lifeos-workout-history";
const MEALS_STORAGE_KEY = "lifeos-todays-meals";
const NUTRITION_HISTORY_KEY = "lifeos-nutrition-history";
const NUTRITION_TARGETS_KEY = "lifeos-nutrition-targets";
const JOURNAL_STORAGE_KEY = "lifeos-journal";

const WATER_TARGET = 3000;

const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2300,
  protein: 150,
  carbs: 250,
  fat: 70,
};

function getDateString(date: Date) {
  return date.toISOString().split("T")[0];
}

function getStartDate(period: ReportPeriod) {
  const date = new Date();

  if (period === "weekly") {
    date.setDate(date.getDate() - 6);
  } else {
    date.setDate(1);
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function getDatesForPeriod(period: ReportPeriod) {
  const start = getStartDate(period);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const dates: string[] = [];
  const current = new Date(start);

  while (current <= today) {
    dates.push(getDateString(current));
    current.setDate(current.getDate() + 1);
  }

  return dates;
}

function formatDateRange(period: ReportPeriod) {
  const start = getStartDate(period);
  const end = new Date();

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
  };

  if (period === "monthly") {
    return start.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
    });
  }

  return `${start.toLocaleDateString(
    "en-IN",
    options
  )} – ${end.toLocaleDateString("en-IN", options)}`;
}

function habitPercentage(goals: Goal[]) {
  if (!goals.length) return 0;

  const completed = goals.filter(
    (goal) => goal.completed
  ).length;

  return Math.round(
    (completed / goals.length) * 100
  );
}

function waterPercentage(entries: WaterEntry[]) {
  const total = entries.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0
  );

  return Math.min(
    Math.round((total / WATER_TARGET) * 100),
    100
  );
}

function nutritionTotals(meals: Meal[]) {
  return meals.reduce(
    (total, meal) => ({
      calories: total.calories + Number(meal.calories || 0),
      protein: total.protein + Number(meal.protein || 0),
      carbs: total.carbs + Number(meal.carbs || 0),
      fat: total.fat + Number(meal.fat || 0),
    }),
    {
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
    }
  );
}

function nutritionPercentage(
  meals: Meal[],
  targets: NutritionTargets
) {
  const totals = nutritionTotals(meals);

  const values = [
    Math.min(
      Math.round(
        (totals.calories / targets.calories) * 100
      ),
      100
    ),
    Math.min(
      Math.round(
        (totals.protein / targets.protein) * 100
      ),
      100
    ),
    Math.min(
      Math.round(
        (totals.carbs / targets.carbs) * 100
      ),
      100
    ),
    Math.min(
      Math.round(
        (totals.fat / targets.fat) * 100
      ),
      100
    ),
  ];

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) /
      values.length
  );
}

function average(values: number[]) {
  if (!values.length) return null;

  return Math.round(
    values.reduce((sum, value) => sum + value, 0) /
      values.length
  );
}

function getWorkoutSets(workout: SavedWorkout) {
  return Object.values(workout.setData || {})
    .flatMap((exerciseSets) =>
      Object.values(exerciseSets || {})
    );
}

function getWorkoutMinutes(workout: SavedWorkout) {
  return Math.round(
    Number(workout.durationSeconds || 0) / 60
  );
}

export default function ReportsPage() {
  const [period, setPeriod] =
    useState<ReportPeriod>("weekly");

  const [habitHistory, setHabitHistory] =
    useState<HabitDay[]>([]);

  const [waterHistory, setWaterHistory] =
    useState<WaterDay[]>([]);

  const [workoutHistory, setWorkoutHistory] =
    useState<SavedWorkout[]>([]);

  const [nutritionHistory, setNutritionHistory] =
    useState<NutritionDay[]>([]);

  const [nutritionTargets, setNutritionTargets] =
    useState<NutritionTargets>(DEFAULT_TARGETS);

  const [journalEntries, setJournalEntries] =
    useState<JournalEntry[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  useEffect(() => {
    try {
      const habits = localStorage.getItem(
        HABIT_STORAGE_KEY
      );

      if (habits) {
        const parsed: StoredHabitData =
          JSON.parse(habits);

        if (Array.isArray(parsed.history)) {
          setHabitHistory(parsed.history);
        }
      }

      const water = localStorage.getItem(
        WATER_STORAGE_KEY
      );

      if (water) {
        const parsed: StoredWaterData =
          JSON.parse(water);

        if (Array.isArray(parsed.history)) {
          setWaterHistory(parsed.history);
        }
      }

      const workouts = localStorage.getItem(
        WORKOUT_HISTORY_KEY
      );

      if (workouts) {
        const parsed = JSON.parse(workouts);

        if (Array.isArray(parsed)) {
          setWorkoutHistory(parsed);
        }
      }

      const nutrition = localStorage.getItem(
        NUTRITION_HISTORY_KEY
      );

      if (nutrition) {
        const parsed = JSON.parse(nutrition);

        if (Array.isArray(parsed)) {
          setNutritionHistory(parsed);
        }
      }

      const targets = localStorage.getItem(
        NUTRITION_TARGETS_KEY
      );

      if (targets) {
        const parsed = JSON.parse(targets);

        if (
          parsed &&
          Object.values(parsed).every(
            (value) =>
              Number.isFinite(Number(value)) &&
              Number(value) > 0
          )
        ) {
          setNutritionTargets({
            calories: Number(parsed.calories),
            protein: Number(parsed.protein),
            carbs: Number(parsed.carbs),
            fat: Number(parsed.fat),
          });
        }
      }

      /*
       * Journal history is optional at this stage.
       * If the Journal component stores an array under
       * lifeos-journal, Reports will use it automatically.
       */
      const journal = localStorage.getItem(
        JOURNAL_STORAGE_KEY
      );

      if (journal) {
        const parsed = JSON.parse(journal);

        if (Array.isArray(parsed)) {
          setJournalEntries(parsed);
        }
      }
    } catch (error) {
      console.error(
        "Failed to load report data:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  const dates = useMemo(
    () => getDatesForPeriod(period),
    [period]
  );

  const dateSet = useMemo(
    () => new Set(dates),
    [dates]
  );

  const summary = useMemo<Summary>(() => {
    const habits = habitHistory.filter(
      (item) => dateSet.has(item.date)
    );

    const water = waterHistory.filter(
      (item) => dateSet.has(item.date)
    );

    const workouts = workoutHistory.filter(
      (item) =>
        dateSet.has(item.date) &&
        item.completed
    );

    const nutrition = nutritionHistory.filter(
      (item) => dateSet.has(item.date)
    );

    const habitValues = habits.map(
      (item) => habitPercentage(item.goals)
    );

    const waterValues = water.map(
      (item) => waterPercentage(item.entries)
    );

    const nutritionValues = nutrition.map(
      (item) =>
        nutritionPercentage(
          item.meals,
          nutritionTargets
        )
    );

    const minutes = workouts.reduce(
      (sum, workout) =>
        sum + getWorkoutMinutes(workout),
      0
    );

    const journals = journalEntries.filter(
      (entry) => dateSet.has(entry.date)
    );

    return {
      workouts: workouts.length,
      workoutMinutes: minutes,
      habitAverage: average(habitValues),
      waterAverage: average(waterValues),
      waterDays: water.length,
      nutritionAverage:
        average(nutritionValues),
      nutritionDays: nutrition.length,
      journalEntries: journals.length,
    };
  }, [
    habitHistory,
    waterHistory,
    workoutHistory,
    nutritionHistory,
    nutritionTargets,
    journalEntries,
    dateSet,
  ]);

  const overallScore = useMemo(() => {
    const values = [
      summary.habitAverage,
      summary.waterAverage,
      summary.nutritionAverage,
    ].filter(
      (value): value is number =>
        value !== null
    );

    if (!values.length) return 0;

    /*
     * Workout consistency is based on the number
     * of completed workout days in the period.
     * This avoids treating a non-training day as failure.
     */
    const workoutDays = new Set(
      workoutHistory
        .filter(
          (workout) =>
            dateSet.has(workout.date) &&
            workout.completed
        )
        .map((workout) => workout.date)
    );

    const workoutScore = Math.round(
      (workoutDays.size /
        Math.max(
          period === "weekly" ? 6 : dates.length,
          1
        )) *
        100
    );

    return Math.round(
      [
        ...values,
        Math.min(workoutScore, 100),
      ].reduce((sum, value) => sum + value, 0) /
        (values.length + 1)
    );
  }, [
    summary,
    workoutHistory,
    dateSet,
    period,
    dates.length,
  ]);

  const nutritionDetails = useMemo(() => {
    const days = nutritionHistory.filter(
      (item) => dateSet.has(item.date)
    );

    if (!days.length) {
      return {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      };
    }

    const totals = days.reduce(
      (sum, day) => {
        const current = nutritionTotals(
          day.meals
        );

        return {
          calories:
            sum.calories + current.calories,
          protein:
            sum.protein + current.protein,
          carbs:
            sum.carbs + current.carbs,
          fat:
            sum.fat + current.fat,
        };
      },
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );

    return {
      calories: Math.round(
        totals.calories / days.length
      ),
      protein: Number(
        (totals.protein / days.length).toFixed(1)
      ),
      carbs: Number(
        (totals.carbs / days.length).toFixed(1)
      ),
      fat: Number(
        (totals.fat / days.length).toFixed(1)
      ),
    };
  }, [nutritionHistory, dateSet]);

  function handleGeneratePDF() {
    window.print();
  }

  const reportTitle =
    period === "weekly"
      ? "Weekly Report"
      : "Monthly Report";

  const reportDescription =
    period === "weekly"
      ? "A snapshot of your last 7 days."
      : "A snapshot of your progress this month.";

  if (!loaded) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Loading your report...
          </p>
        </div>
      </main>
    );
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          nav,
          aside,
          header,
          button,
          .no-print {
            display: none !important;
          }

          main {
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          section {
            break-inside: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>

      <main className="space-y-6">

      {/* HEADER */}
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-green-600">
          Reports
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {reportTitle}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {reportDescription}
        </p>

        <p className="mt-2 text-xs font-medium text-slate-400">
          {formatDateRange(period)}
        </p>
      </div>

      {/* REPORT ACTIONS */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <button
          type="button"
          onClick={handleGeneratePDF}
          className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
        >
          📄 Generate PDF
        </button>

        <p className="text-xs text-slate-500">
          Opens the print window. Choose <strong>Save as PDF</strong> to download your report.
        </p>
      </div>

      {/* PERIOD SWITCHER */}
      <div className="flex w-full max-w-md rounded-xl border border-slate-200 bg-white p-1 shadow-sm no-print">
        <button
          type="button"
          onClick={() =>
            setPeriod("weekly")
          }
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            period === "weekly"
              ? "bg-green-600 text-white"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          📅 Weekly
        </button>

        <button
          type="button"
          onClick={() =>
            setPeriod("monthly")
          }
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            period === "monthly"
              ? "bg-green-600 text-white"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          📊 Monthly
        </button>
      </div>

      {/* OVERALL SCORE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>
            <p className="text-sm font-medium text-slate-500">
              Overall Consistency
            </p>

            <h2 className="mt-1 text-4xl font-bold text-slate-900">
              {overallScore}%
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              This score combines your recorded habits,
              hydration, nutrition, and completed workout
              activity for the selected period.
            </p>
          </div>

          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-green-50">
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">
                {overallScore}
              </p>
              <p className="text-xs font-semibold text-green-600">
                / 100
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-green-500 transition-all duration-500"
            style={{
              width: `${overallScore}%`,
            }}
          />
        </div>
      </section>

      {/* SUMMARY CARDS */}
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-5">

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-2xl">💪</div>
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {summary.workouts}
          </p>
          <p className="text-xs text-slate-500">
            Completed workouts
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-2xl">🎯</div>
          <p className="mt-3 text-2xl font-bold text-green-600">
            {summary.habitAverage === null
              ? "—"
              : `${summary.habitAverage}%`}
          </p>
          <p className="text-xs text-slate-500">
            Habit consistency
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-2xl">💧</div>
          <p className="mt-3 text-2xl font-bold text-blue-600">
            {summary.waterAverage === null
              ? "—"
              : `${summary.waterAverage}%`}
          </p>
          <p className="text-xs text-slate-500">
            Water goal average
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-2xl">🍎</div>
          <p className="mt-3 text-2xl font-bold text-emerald-600">
            {summary.nutritionAverage === null
              ? "—"
              : `${summary.nutritionAverage}%`}
          </p>
          <p className="text-xs text-slate-500">
            Nutrition adherence
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-2xl">📝</div>
          <p className="mt-3 text-2xl font-bold text-purple-600">
            {summary.journalEntries}
          </p>
          <p className="text-xs text-slate-500">
            Journal entries
          </p>
        </div>
      </section>

      {/* WORKOUT */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              💪 Workout Summary
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Your completed training during this period.
            </p>
          </div>

          <div className="rounded-xl bg-orange-50 px-4 py-2 text-right">
            <p className="text-xs text-orange-600">
              Total time
            </p>
            <p className="text-lg font-bold text-orange-600">
              {summary.workoutMinutes} min
            </p>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              Completed
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {summary.workouts}
            </p>
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">
              Minutes
            </p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {summary.workoutMinutes}
            </p>
          </div>
        </div>
      </section>

      {/* NUTRITION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            🍎 Nutrition Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Average daily intake compared with your personal
            nutrition targets.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-xl bg-orange-50 p-4">
            <p className="text-xs font-medium text-orange-700">
              🔥 Calories
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {nutritionDetails.calories} kcal
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Target {nutritionTargets.calories} kcal
            </p>
          </div>

          <div className="rounded-xl bg-green-50 p-4">
            <p className="text-xs font-medium text-green-700">
              💪 Protein
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {nutritionDetails.protein} g
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Target {nutritionTargets.protein} g
            </p>
          </div>

          <div className="rounded-xl bg-yellow-50 p-4">
            <p className="text-xs font-medium text-yellow-700">
              🌾 Carbs
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {nutritionDetails.carbs} g
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Target {nutritionTargets.carbs} g
            </p>
          </div>

          <div className="rounded-xl bg-purple-50 p-4">
            <p className="text-xs font-medium text-purple-700">
              🥑 Fat
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {nutritionDetails.fat} g
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Target {nutritionTargets.fat} g
            </p>
          </div>
        </div>
      </section>

      {/* HABITS + WATER */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            🎯 Habits
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Average completion across recorded habit days.
          </p>

          <div className="mt-5">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-green-600">
                {summary.habitAverage === null
                  ? "—"
                  : `${summary.habitAverage}%`}
              </span>
              <span className="text-xs text-slate-400">
                {period}
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-green-500"
                style={{
                  width: `${summary.habitAverage ?? 0}%`,
                }}
              />
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            💧 Hydration
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Average progress toward your 3 L daily goal.
          </p>

          <div className="mt-5">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-blue-600">
                {summary.waterAverage === null
                  ? "—"
                  : `${summary.waterAverage}%`}
              </span>
              <span className="text-xs text-slate-400">
                {summary.waterDays} recorded days
              </span>
            </div>

            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-100">
              <div
                className="h-full rounded-full bg-blue-500"
                style={{
                  width: `${summary.waterAverage ?? 0}%`,
                }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* REPORT NOTE */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <p className="text-sm leading-relaxed text-slate-600">
          This is the first version of your LifeOS report.
          It uses the real data already stored by your
          Workout, Habits, Water, Nutrition, and Journal
          sections. PDF export and a more detailed
          day-by-day report can be added next.
        </p>
      </section>
    </main>
    </>
  );
}
