"use client";

import { useEffect, useMemo, useState } from "react";
import {
  averageRecorded,
  calculateHabitAdherence,
  calculateNutritionIntake,
  calculateNutritionAdherence,
  calculateWaterAdherence,
  createCalendarDateRange,
  getCalendarDates,
  getCalendarDateInTimeZone,
  getCurrentCalendarDate,
  parseCalendarDate,
} from "@/app/lib/reports";
import type { CalendarDateRange } from "@/app/lib/reports";
import { selectTrainerReportClient } from "@/app/lib/reports/member-report";

type ReportPeriod = "weekly" | "monthly" | "custom";

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

type ReportWorkout = {
  id: string;
  startedAt: string;
  date: string;
  completedAt: string | null;
  status: string;
  durationSeconds: number | null;
  workoutSessionExercises: {
    id: string;
    name: string;
    workoutSets: {
      id: string;
      setNumber: number;
      weight: number | null;
      reps: number | null;
      completed: boolean;
    }[];
  }[];
};

type Meal = {
  id: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type WeightEntry = {
  id: string;
  weight: number;
  recordedAt: string;
};

type BodyMeasurement = {
  id: string;
  chest: number | null;
  waist: number | null;
  arms: number | null;
  thighs: number | null;
  recordedAt: string;
};

type ReportPayload = {
  range: { timezone: string };
  workouts: Omit<ReportWorkout, "date">[];
  nutritionDays: { date: string; meals: Meal[] }[];
  nutritionTarget: NutritionTargets | null;
  weightEntries: WeightEntry[];
  bodyMeasurements: BodyMeasurement[];
};

type TrainerReportClient = {
  id: string;
  name: string;
  username: string | null;
  workouts: ReportPayload["workouts"];
  nutritionDays: ReportPayload["nutritionDays"];
  nutritionTarget: NutritionTargets | null;
  weightEntries: WeightEntry[];
  bodyMeasurements: BodyMeasurement[];
};

type TrainerReportPayload = {
  range: ReportPayload["range"];
  clients: TrainerReportClient[];
};

type OwnerReportGym = {
  id: string;
  name: string;
  memberships: {
    currentTotal: number;
    currentActive: number;
    currentNonActive: number;
    joinedInRange: number;
    statusChangesInRange: number;
  };
  membershipPayments: {
    paidCount: number;
    totalsByCurrency: { currency: string; amount: number }[];
  };
  attendance: {
    checkIns: number;
    uniqueMembers: number;
  };
  retention: {
    activeAtStart: number;
    activeAtEnd: number;
    retainedMembers: number;
    rate: number | null;
  };
};

type OwnerReportPayload = {
  range: ReportPayload["range"];
  gyms: OwnerReportGym[];
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
const JOURNAL_STORAGE_KEY = "lifeos-journal";

const WATER_TARGET = 3000;

function getCurrentRange(period: Exclude<ReportPeriod, "custom">) {
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const today = getCurrentCalendarDate(timezone);
  const start = new Date(`${today}T00:00:00.000Z`);

  if (period === "weekly") {
    start.setUTCDate(start.getUTCDate() - 6);
  } else {
    start.setUTCDate(1);
  }

  return createCalendarDateRange(
    start.toISOString().slice(0, 10),
    today,
    timezone,
  );
}

function formatDateRange(range: CalendarDateRange, period: ReportPeriod) {
  const start = range.startAt;
  const end = new Date(range.endExclusiveAt.getTime() - 1);

  const options: Intl.DateTimeFormatOptions = {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: range.timezone,
  };

  if (period === "monthly") {
    return start.toLocaleDateString("en-IN", {
      month: "long",
      year: "numeric",
      timeZone: range.timezone,
    });
  }

  return `${start.toLocaleDateString(
    "en-IN",
    options
  )} – ${end.toLocaleDateString("en-IN", options)}`;
}

function habitPercentage(goals: Goal[]) {
  return calculateHabitAdherence(
    goals.filter((goal) => goal.completed).length,
    goals.length,
  ).percentage;
}

function waterPercentage(entries: WaterEntry[]) {
  const total = entries.reduce(
    (sum, entry) => sum + Number(entry.amount || 0),
    0
  );

  return calculateWaterAdherence(total, WATER_TARGET, true);
}

function nutritionTotals(meals: Meal[]) {
  return calculateNutritionIntake(meals);
}

function nutritionPercentage(
  meals: Meal[],
  targets: NutritionTargets | null
) {
  if (!targets) return null;

  return calculateNutritionAdherence(meals, targets, true)
    ?.averagePercentage ?? null;
}

function average(values: (number | null)[]) {
  return averageRecorded(values);
}

async function readReportResponse(response: Response): Promise<unknown> {
  const body = await response.text();
  const contentType = response.headers.get("content-type") ?? "";

  if (!contentType.toLowerCase().includes("application/json")) {
    throw new Error(
      response.ok
        ? "The report service returned a non-JSON response."
        : `The report request failed with HTTP ${response.status} and a non-JSON response.`,
    );
  }

  let data: unknown;
  try {
    data = JSON.parse(body);
  } catch {
    throw new Error(
      `The report service returned invalid JSON (HTTP ${response.status}).`,
    );
  }

  if (!response.ok) {
    const message =
      data !== null &&
      typeof data === "object" &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Unable to load your personal report";
    throw new Error(`${message} (HTTP ${response.status})`);
  }

  if (data === null || typeof data !== "object") {
    throw new Error("The report service returned an invalid response.");
  }
  return data;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object";
}

function hasReportRange(value: unknown): value is { timezone: string } {
  return isRecord(value) && typeof value.timezone === "string";
}

function isTrainerReportPayload(
  value: unknown,
): value is TrainerReportPayload {
  return (
    isRecord(value) &&
    hasReportRange(value.range) &&
    Array.isArray(value.clients)
  );
}

function isOwnerReportPayload(value: unknown): value is OwnerReportPayload {
  return (
    isRecord(value) &&
    hasReportRange(value.range) &&
    Array.isArray(value.gyms)
  );
}

function isReportPayload(value: unknown): value is ReportPayload {
  return (
    isRecord(value) &&
    hasReportRange(value.range) &&
    Array.isArray(value.workouts) &&
    Array.isArray(value.nutritionDays) &&
    Array.isArray(value.weightEntries) &&
    Array.isArray(value.bodyMeasurements) &&
    "nutritionTarget" in value
  );
}

export default function ReportsPage() {
  const [period, setPeriod] =
    useState<ReportPeriod>("weekly");
  const [initialWeeklyRange] = useState(() => getCurrentRange("weekly"));
  const [customStartDate, setCustomStartDate] =
    useState(initialWeeklyRange.from);
  const [customEndDate, setCustomEndDate] =
    useState(initialWeeklyRange.to);
  const [customRange, setCustomRange] =
    useState<Pick<CalendarDateRange, "from" | "to"> | null>(null);

  const [habitHistory, setHabitHistory] =
    useState<HabitDay[]>([]);

  const [waterHistory, setWaterHistory] =
    useState<WaterDay[]>([]);

  const [memberReportData, setMemberReportData] =
    useState<ReportPayload | null>(null);

  const [reportError, setReportError] =
    useState<string | null>(null);
  const [journalEntries, setJournalEntries] =
    useState<JournalEntry[]>([]);

  const [loadedRangeKey, setLoadedRangeKey] =
    useState<string | null>(null);

  const [trainerClients, setTrainerClients] =
    useState<TrainerReportClient[]>([]);

  const [selectedTrainerClientId, setSelectedTrainerClientId] =
    useState("");
  const [isTrainerReport, setIsTrainerReport] = useState(false);
  const [ownerGyms, setOwnerGyms] = useState<OwnerReportGym[]>([]);
  const [selectedOwnerGymId, setSelectedOwnerGymId] = useState("");
  const [isOwnerReport, setIsOwnerReport] = useState(false);

  const range = useMemo(() => {
    if (period === "custom") {
      if (!customRange) return null;
      return createCalendarDateRange(
        customRange.from,
        customRange.to,
        Intl.DateTimeFormat().resolvedOptions().timeZone,
      );
    }
    return getCurrentRange(period);
  }, [period, customRange]);
  const rangeKey = range
    ? `${period}:${range.from}:${range.to}:${range.timezone}`
    : null;
  const customRangeIsValid =
    parseCalendarDate(customStartDate) !== null &&
    parseCalendarDate(customEndDate) !== null &&
    customStartDate <= customEndDate;

  const selectedTrainerClient = useMemo(
    () => selectTrainerReportClient(trainerClients, selectedTrainerClientId),
    [trainerClients, selectedTrainerClientId],
  );
  const selectedOwnerGym =
    ownerGyms.find((gym) => gym.id === selectedOwnerGymId) ?? null;
  const selectedReportData = isTrainerReport
    ? selectedTrainerClient
    : memberReportData;
  const workoutHistory = useMemo(
    () =>
      (selectedReportData?.workouts ?? []).map((workout) => ({
        ...workout,
        date: getCalendarDateInTimeZone(
          new Date(workout.startedAt),
          range?.timezone ?? "UTC",
        ),
      })),
    [selectedReportData, range?.timezone],
  );
  const nutritionHistory = useMemo(
    () =>
      (selectedReportData?.nutritionDays ?? []).map((day) => ({
        ...day,
        date: getCalendarDateInTimeZone(
          new Date(day.date),
          range?.timezone ?? "UTC",
        ),
      })),
    [selectedReportData, range?.timezone],
  );
  const nutritionTargets = selectedReportData?.nutritionTarget ?? null;
  const weightEntries = selectedReportData?.weightEntries ?? [];
  const bodyMeasurements = selectedReportData?.bodyMeasurements ?? [];

  useEffect(() => {
    let active = true;

    queueMicrotask(() => {
      if (!active) return;
      try {
        const habits = localStorage.getItem(HABIT_STORAGE_KEY);
        if (habits) {
          const parsed: StoredHabitData = JSON.parse(habits);
          if (Array.isArray(parsed.history)) setHabitHistory(parsed.history);
        }

        const water = localStorage.getItem(WATER_STORAGE_KEY);
        if (water) {
          const parsed: StoredWaterData = JSON.parse(water);
          if (Array.isArray(parsed.history)) setWaterHistory(parsed.history);
        }

        const journal = localStorage.getItem(JOURNAL_STORAGE_KEY);
        if (journal) {
          const parsed = JSON.parse(journal);
          if (Array.isArray(parsed)) setJournalEntries(parsed);
        }
      } catch (error) {
        console.error("Failed to load browser-only report data:", error);
      }
    });

    if (!range || !rangeKey) {
      return () => {
        active = false;
      };
    }

    const params = new URLSearchParams({
      from: range.from,
      to: range.to,
      timezone: range.timezone,
    });

    fetch(`/api/reports/owner?${params.toString()}`)
      .then(async (ownerResponse) => {
        if (ownerResponse.status !== 403) {
          return readReportResponse(ownerResponse);
        }

        const trainerResponse = await fetch(
          `/api/reports/trainer?${params.toString()}`,
        );
        if (trainerResponse.status !== 403) {
          return readReportResponse(trainerResponse);
        }

        const memberResponse = await fetch(`/api/reports/member?${params.toString()}`);
        return readReportResponse(memberResponse);
      })
      .then((data) => {
        if (!active) return;
        setReportError(null);
        if (isOwnerReportPayload(data)) {
          setIsOwnerReport(true);
          setIsTrainerReport(false);
          setMemberReportData(null);
          setOwnerGyms(data.gyms);
          setSelectedOwnerGymId(data.gyms[0]?.id ?? "");
          setTrainerClients([]);
          setSelectedTrainerClientId("");
        } else if (isTrainerReportPayload(data)) {
          setIsOwnerReport(false);
          setOwnerGyms([]);
          setSelectedOwnerGymId("");
          const trainerData = data;
          setIsTrainerReport(true);
          setMemberReportData(null);
          setTrainerClients(trainerData.clients);
          const firstClient = trainerData.clients[0];
          setSelectedTrainerClientId(firstClient?.id ?? "");
        } else if (isReportPayload(data)) {
          setIsOwnerReport(false);
          setOwnerGyms([]);
          setSelectedOwnerGymId("");
          const memberData = data;
          setIsTrainerReport(false);
          setTrainerClients([]);
          setSelectedTrainerClientId("");
          setMemberReportData(memberData);
        } else {
          throw new Error("The report service returned an invalid response.");
        }
      })
      .catch((error: unknown) => {
        if (!active) return;
        console.error("Failed to load persisted report data:", error);
        setIsOwnerReport(false);
        setOwnerGyms([]);
        setSelectedOwnerGymId("");
        setIsTrainerReport(false);
        setMemberReportData(null);
        setTrainerClients([]);
        setSelectedTrainerClientId("");
        setReportError(
          error instanceof Error
            ? error.message
            : "Unable to load your personal report",
        );
      })
      .finally(() => {
        if (active) setLoadedRangeKey(rangeKey);
      });

    return () => {
      active = false;
    };
  }, [range, rangeKey]);

  const dates = useMemo(
    () => (range ? getCalendarDates(range) : []),
    [range],
  );

  const dateSet = useMemo(
    () => new Set(dates),
    [dates]
  );

  const summary = useMemo<Summary>(() => {
    const habits = isTrainerReport
      ? []
      : habitHistory.filter((item) => dateSet.has(item.date));

    const water = isTrainerReport
      ? []
      : waterHistory.filter((item) => dateSet.has(item.date));

    const workouts = workoutHistory.filter(
      (item) =>
        dateSet.has(item.date) &&
        item.status === "COMPLETED"
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

    const minutes = Math.round(
      workouts.reduce(
        (sum, workout) => sum + (workout.durationSeconds ?? 0),
        0,
      ) / 60,
    );

    const journals = isTrainerReport
      ? []
      : journalEntries.filter((entry) => dateSet.has(entry.date));

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
    isTrainerReport,
  ]);

  const overallScore = useMemo(() => {
    const workoutDays = new Set(
      workoutHistory
        .filter(
          (workout) =>
            dateSet.has(workout.date) &&
            workout.status === "COMPLETED"
        )
        .map((workout) => workout.date)
    );

    return dates.length
      ? Math.round((workoutDays.size / dates.length) * 100)
      : null;
  }, [
    workoutHistory,
    dateSet,
    dates.length,
  ]);

  const nutritionDetails = useMemo(() => {
    const days = nutritionHistory.filter(
      (item) => dateSet.has(item.date)
    );

    if (!days.length) {
      return {
        calories: null,
        protein: null,
        carbs: null,
        fat: null,
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

  const workoutMetrics = useMemo(() => {
    const sets = workoutHistory
      .filter(
        (workout) =>
          dateSet.has(workout.date) && workout.status === "COMPLETED",
      )
      .flatMap((workout) =>
        workout.workoutSessionExercises.flatMap((exercise) => exercise.workoutSets),
      );

    return {
      completedSets: sets.filter((set) => set.completed).length,
      weightedVolume: sets.reduce(
        (total, set) =>
          set.completed && set.weight != null && set.reps != null
            ? total + set.weight * set.reps
            : total,
        0,
      ),
    };
  }, [workoutHistory, dateSet]);

  const latestWeight = weightEntries.at(-1) ?? null;
  const firstWeight = weightEntries[0] ?? null;
  const latestMeasurement = bodyMeasurements.at(-1) ?? null;

  function handleGeneratePDF() {
    window.print();
  }

  const reportTitle = isOwnerReport
    ? "Gym Owner Report"
    : period === "weekly"
      ? "Weekly Report"
      : period === "monthly"
        ? "Monthly Report"
        : "Custom Report";

  const reportDescription =
    isOwnerReport
      ? "Persisted membership, payment, attendance, and retention data for your gym."
      : isTrainerReport
      ? "A snapshot of assigned client progress in this period."
      : period === "weekly"
      ? "A snapshot of your last 7 days."
      : period === "monthly"
        ? "A snapshot of your progress this month."
        : "A snapshot of your progress in the selected date range.";

  if (!range || loadedRangeKey !== rangeKey) {
    return (
      <main className="space-y-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <p className="text-sm text-slate-500">
            Loading report...
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
      {reportError && (
        <div
          role="alert"
          className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        >
          Report data could not be loaded: {reportError}
        </div>
      )}

      {/* HEADER */}
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Reports
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          {reportTitle}
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          {reportDescription}
        </p>
        {isTrainerReport && trainerClients.length === 0 && (
          <p className="mt-2 text-sm text-slate-500" role="status">
            No active assigned clients are available for reporting.
          </p>
        )}
        {isOwnerReport && ownerGyms.length === 0 && (
          <p className="mt-2 text-sm text-slate-500" role="status">
            No active owner-managed gyms are available for reporting.
          </p>
        )}

        <p className="mt-2 text-xs font-medium text-slate-400">
          {range ? formatDateRange(range, period) : ""}
        </p>
      </div>

      {/* REPORT ACTIONS */}
      <div className="flex flex-wrap items-center gap-3 no-print">
        <button
          type="button"
          onClick={handleGeneratePDF}
          className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
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
              ? "bg-primary text-white"
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
              ? "bg-primary text-white"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          📊 Monthly
        </button>

        <button
          type="button"
          onClick={() => {
            setCustomRange((current) =>
              current ?? {
                from: initialWeeklyRange.from,
                to: initialWeeklyRange.to,
              },
            );
            setPeriod("custom");
          }}
          className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
            period === "custom"
              ? "bg-primary text-white"
              : "text-slate-500 hover:bg-slate-50"
          }`}
        >
          🗓️ Custom
        </button>
      </div>

      {period === "custom" && (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 no-print">
          <div>
            <label
              htmlFor="report-start-date"
              className="mb-1.5 block text-xs font-medium text-slate-500"
            >
              Start date
            </label>
            <input
              id="report-start-date"
              type="date"
              value={customStartDate}
              onChange={(event) => setCustomStartDate(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </div>
          <div>
            <label
              htmlFor="report-end-date"
              className="mb-1.5 block text-xs font-medium text-slate-500"
            >
              End date
            </label>
            <input
              id="report-end-date"
              type="date"
              value={customEndDate}
              onChange={(event) => setCustomEndDate(event.target.value)}
              className="rounded-lg border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </div>
          <button
            type="button"
            disabled={!customRangeIsValid}
            onClick={() =>
              setCustomRange({
                from: customStartDate,
                to: customEndDate,
              })
            }
            className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Apply range
          </button>
          {!customRangeIsValid && (
            <p className="text-sm text-red-600" role="alert">
              Choose valid dates with the start date on or before the end date.
            </p>
          )}
        </div>
      )}

      {isOwnerReport ? (
        <>
          {ownerGyms.length > 1 && (
            <div className="max-w-sm no-print">
              <label
                htmlFor="owner-report-gym"
                className="mb-1.5 block text-xs font-medium text-slate-500"
              >
                Gym report
              </label>
              <select
                id="owner-report-gym"
                value={selectedOwnerGymId}
                onChange={(event) => setSelectedOwnerGymId(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
              >
                {ownerGyms.map((gym) => (
                  <option key={gym.id} value={gym.id}>
                    {gym.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedOwnerGym && (
            <>
              <p className="text-sm font-semibold text-slate-700">
                {selectedOwnerGym.name}
              </p>

              <section className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-2xl">👥</div>
                  <p className="mt-3 text-2xl font-bold text-slate-900">
                    {selectedOwnerGym.memberships.currentActive}
                  </p>
                  <p className="text-xs text-slate-500">
                    Active memberships · current
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-2xl">➕</div>
                  <p className="mt-3 text-2xl font-bold text-primary">
                    {selectedOwnerGym.memberships.joinedInRange}
                  </p>
                  <p className="text-xs text-slate-500">
                    Memberships joined in period
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-2xl">💳</div>
                  <p className="mt-3 text-2xl font-bold text-emerald-700">
                    {selectedOwnerGym.membershipPayments.totalsByCurrency.length
                      ? selectedOwnerGym.membershipPayments.totalsByCurrency
                          .map(({ currency, amount }) => `${currency} ${amount.toFixed(2)}`)
                          .join(" · ")
                      : "—"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Paid membership payments · {selectedOwnerGym.membershipPayments.paidCount}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="text-2xl">📍</div>
                  <p className="mt-3 text-2xl font-bold text-blue-700">
                    {selectedOwnerGym.attendance.checkIns}
                  </p>
                  <p className="text-xs text-slate-500">
                    Attendance check-ins in period
                  </p>
                </div>
              </section>

              <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    👥 Memberships
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Current persisted membership status and changes in the selected period.
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-slate-500">Total members · current</dt>
                      <dd className="mt-1 text-xl font-bold text-slate-900">
                        {selectedOwnerGym.memberships.currentTotal}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Non-active · current</dt>
                      <dd className="mt-1 text-xl font-bold text-slate-900">
                        {selectedOwnerGym.memberships.currentNonActive}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Joined in period</dt>
                      <dd className="mt-1 text-xl font-bold text-slate-900">
                        {selectedOwnerGym.memberships.joinedInRange}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Status changes in period</dt>
                      <dd className="mt-1 text-xl font-bold text-slate-900">
                        {selectedOwnerGym.memberships.statusChangesInRange}
                      </dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    📈 Retention
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Share of memberships active at the start that remained active at the end of this period.
                  </p>
                  <p className="mt-5 text-3xl font-bold text-primary">
                    {selectedOwnerGym.retention.rate === null
                      ? "—"
                      : `${selectedOwnerGym.retention.rate}%`}
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    {selectedOwnerGym.retention.retainedMembers} of{" "}
                    {selectedOwnerGym.retention.activeAtStart} start-of-period active memberships retained
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Active at period end: {selectedOwnerGym.retention.activeAtEnd}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    💳 Membership Payments
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Recorded paid membership payments by currency; PT-session payments are excluded.
                  </p>
                  {selectedOwnerGym.membershipPayments.totalsByCurrency.length ? (
                    <ul className="mt-4 space-y-2">
                      {selectedOwnerGym.membershipPayments.totalsByCurrency.map(
                        ({ currency, amount }) => (
                          <li
                            key={currency}
                            className="flex justify-between rounded-lg bg-slate-50 p-3 text-sm"
                          >
                            <span className="text-slate-600">{currency}</span>
                            <span className="font-semibold text-slate-900">
                              {amount.toFixed(2)}
                            </span>
                          </li>
                        ),
                      )}
                    </ul>
                  ) : (
                    <p className="mt-4 text-sm text-slate-500">
                      No paid membership payments recorded in this period.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-lg font-bold text-slate-900">
                    📍 Attendance
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Check-ins recorded during the selected period.
                  </p>
                  <dl className="mt-5 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <dt className="text-slate-500">Check-ins</dt>
                      <dd className="mt-1 text-2xl font-bold text-slate-900">
                        {selectedOwnerGym.attendance.checkIns}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-slate-500">Unique members</dt>
                      <dd className="mt-1 text-2xl font-bold text-slate-900">
                        {selectedOwnerGym.attendance.uniqueMembers}
                      </dd>
                    </div>
                  </dl>
                </div>
              </section>

              <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
                <p className="text-sm leading-relaxed text-slate-600">
                  Owner metrics use persisted gym memberships, membership status history, paid membership payments, and attendance records. Current membership counts are current snapshots; period activity uses the selected date range. Missing history or payments are not estimated.
                </p>
              </section>
            </>
          )}
        </>
      ) : (
        <>
      {/* OVERALL SCORE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">

          <div>
            <p className="text-sm font-medium text-slate-500">
              Overall Consistency
            </p>

            <h2 className="mt-1 text-4xl font-bold text-slate-900">
              {overallScore === null ? "—" : `${overallScore}%`}
            </h2>

            <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-500">
              Completed workout days divided by calendar days
              in the selected period. Habit and hydration data
              are stored in this browser and are not included.
            </p>
          </div>

          <div className="flex h-28 w-28 items-center justify-center rounded-full bg-primary/10">
            <div className="text-center">
              <p className="text-3xl font-bold text-primary">
                {overallScore ?? "—"}
              </p>
              <p className="text-xs font-semibold text-primary">
                / 100
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 h-3 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-full rounded-full bg-primary transition-all duration-500"
            style={{
              width: `${overallScore ?? 0}%`,
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
          <p className="mt-3 text-2xl font-bold text-primary">
            {summary.habitAverage === null
              ? "—"
              : `${summary.habitAverage}%`}
          </p>
          <p className="text-xs text-slate-500">
            Habit consistency · browser-only
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
            Water goal average · browser-only
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-2xl">🍎</div>
          <p className="mt-3 text-2xl font-bold text-primary">
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
            {isTrainerReport ? "—" : summary.journalEntries}
          </p>
          <p className="text-xs text-slate-500">
            Journal entries · browser-only
            {isTrainerReport ? " · unavailable in trainer reports" : ""}
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
              {isTrainerReport
                ? "Completed sessions for the selected client during this period."
                : "Completed sessions from your account during this period."}
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

        {trainerClients.length > 0 && (
          <div className="mt-4 max-w-sm">
            <label
              htmlFor="trainer-report-client"
              className="mb-1.5 block text-xs font-medium text-slate-500"
            >
              Client report
            </label>
            <select
              id="trainer-report-client"
              value={selectedTrainerClientId}
              onChange={(event) =>
                setSelectedTrainerClientId(event.target.value)
              }
              className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700"
            >
              {trainerClients.map((client) => (
                <option key={client.id} value={client.id}>
                  {client.name}
                  {client.username ? ` (@${client.username})` : ""}
                </option>
              ))}
            </select>
          </div>
        )}

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

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Completed sets</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {workoutMetrics.completedSets}
            </p>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Recorded volume</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">
              {workoutMetrics.weightedVolume}
            </p>
          </div>
        </div>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <h3 className="text-sm font-semibold text-slate-800">Workout history</h3>
          {workoutHistory.length === 0 ? (
            <p className="mt-2 text-sm text-slate-500">
              No workout sessions recorded in this period.
            </p>
          ) : (
            <ul className="mt-2 divide-y divide-slate-100">
              {workoutHistory.map((workout) => (
                <li key={workout.id} className="py-3">
                  <div className="flex flex-wrap justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-800">
                      {workout.date}
                      {" · "}
                      {workout.workoutSessionExercises
                        .map((exercise) => exercise.name)
                        .join(", ") || "No exercises recorded"}
                    </span>
                    <span className="text-slate-500">
                      {workout.status === "COMPLETED"
                        ? "Completed"
                        : workout.status === "IN_PROGRESS"
                          ? "In progress"
                          : "Abandoned"}
                      {workout.durationSeconds != null
                        ? ` · ${Math.round(workout.durationSeconds / 60)} min`
                        : ""}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>

      {/* NUTRITION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            🍎 Nutrition Summary
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            {isTrainerReport
              ? "Client meals compared with recorded nutrition targets."
              : "Persisted meals compared with your recorded nutrition targets."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">

          <div className="rounded-xl bg-orange-50 p-4">
            <p className="text-xs font-medium text-orange-700">
              🔥 Calories
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {nutritionDetails.calories === null
                ? "—"
                : `${nutritionDetails.calories} kcal`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {nutritionTargets
                ? `Target ${nutritionTargets.calories} kcal`
                : "No target recorded"}
            </p>
          </div>

          <div className="rounded-xl bg-primary/10 p-4">
            <p className="text-xs font-medium text-primary">
              💪 Protein
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {nutritionDetails.protein === null
                ? "—"
                : `${nutritionDetails.protein} g`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {nutritionTargets
                ? `Target ${nutritionTargets.protein} g`
                : "No target recorded"}
            </p>
          </div>

          <div className="rounded-xl bg-yellow-50 p-4">
            <p className="text-xs font-medium text-yellow-700">
              🌾 Carbs
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {nutritionDetails.carbs === null
                ? "—"
                : `${nutritionDetails.carbs} g`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {nutritionTargets
                ? `Target ${nutritionTargets.carbs} g`
                : "No target recorded"}
            </p>
          </div>

          <div className="rounded-xl bg-purple-50 p-4">
            <p className="text-xs font-medium text-purple-700">
              🥑 Fat
            </p>
            <p className="mt-1 text-xl font-bold text-slate-900">
              {nutritionDetails.fat === null
                ? "—"
                : `${nutritionDetails.fat} g`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {nutritionTargets
                ? `Target ${nutritionTargets.fat} g`
                : "No target recorded"}
            </p>
          </div>
        </div>
      </section>

      {/* FITNESS PROGRESS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">📈 Fitness Progress</h2>
          <p className="mt-1 text-sm text-slate-500">
            {isTrainerReport
              ? "Client weight and body measurements recorded during this period."
              : "Weight and body measurements recorded in your account during this period."}
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Body weight · account units</p>
            {latestWeight ? (
              <>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {latestWeight.weight}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {firstWeight && firstWeight.id !== latestWeight.id
                    ? `Change in period: ${(latestWeight.weight - firstWeight.weight).toFixed(1)}`
                    : "Only one weight entry recorded in this period"}
                </p>
              </>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                No weight entries recorded in this period.
              </p>
            )}
          </div>

          <div className="rounded-xl bg-slate-50 p-4">
            <p className="text-xs text-slate-500">Latest measurements · account units</p>
            {latestMeasurement ? (
              <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">
                {(
                  [
                    ["Chest", latestMeasurement.chest],
                    ["Waist", latestMeasurement.waist],
                    ["Arms", latestMeasurement.arms],
                    ["Thighs", latestMeasurement.thighs],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className="font-semibold text-slate-800">
                      {value == null ? "—" : value}
                    </dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="mt-1 text-sm text-slate-500">
                No measurements recorded in this period.
              </p>
            )}
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
            {isTrainerReport
              ? "Not available in trainer reports · browser-only data."
              : "Average completion across recorded habit days · browser-only data."}
          </p>

          <div className="mt-5">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-primary">
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
                className="h-full rounded-full bg-primary"
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
            {isTrainerReport
              ? "Not available in trainer reports · browser-only data."
              : "Average progress toward your 3 L daily goal · browser-only data."}
          </p>

          <div className="mt-5">
            <div className="flex items-end justify-between">
              <span className="text-3xl font-bold text-blue-600">
                {summary.waterAverage === null
                  ? "—"
                  : `${summary.waterAverage}%`}
              </span>
              <span className="text-xs text-slate-400">
                {isTrainerReport
                  ? "Unavailable"
                  : `${summary.waterDays} recorded days`}
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
          {isTrainerReport
            ? "Workouts, nutrition, body weight, and measurements are loaded from the selected assigned client's account records. Habits, hydration, and journal entries are browser-only and are not included in trainer reports. Missing account data is shown as unavailable rather than estimated."
            : "Workouts, nutrition, body weight, and measurements are loaded from your authenticated account records. Habits, hydration, and journal entries are still read from this browser&apos;s localStorage and are not synced between devices. Missing account data is shown as unavailable rather than estimated."}
        </p>
      </section>
        </>
      )}
    </main>
    </>
  );
}
