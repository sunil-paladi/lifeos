"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, Moon } from "lucide-react";

import type {
  DayName,
  DayWorkout,
} from "@/app/context/ProgramContext";
import { exercises } from "@/app/data/exercises";
import {
  getCompletedWorkoutDays,
  getExerciseComparisons,
  getWorkoutHistoryDate,
  getWorkoutWeekDays,
  getWorkoutWeekRange,
  WORKOUT_HISTORY_KEY,
  WORKOUT_HISTORY_UPDATED_EVENT,
  type WorkoutHistoryEntry,
} from "@/app/lib/workout-progress";

const days: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface Props {
  week: DayWorkout;
  weekIndex: number;
  programStartDate: string | null;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));
}

function getExerciseName(exerciseId: number) {
  for (const muscleExercises of Object.values(exercises)) {
    const exercise = muscleExercises.find((item) => item.id === exerciseId);
    if (exercise) {
      return exercise.name;
    }
  }

  return `Exercise #${exerciseId}`;
}

export default function WeeklyWorkoutProgress({
  week,
  weekIndex,
  programStartDate,
}: Props) {
  const [history, setHistory] = useState<WorkoutHistoryEntry[]>([]);
  const [historyError, setHistoryError] = useState(false);
  const range = useMemo(
    () => getWorkoutWeekRange(programStartDate, weekIndex),
    [programStartDate, weekIndex],
  );
  const weekDays = useMemo(
    () => (range ? getWorkoutWeekDays(range) : []),
    [range],
  );

  useEffect(() => {
    function loadHistory() {
      try {
        const saved = localStorage.getItem(WORKOUT_HISTORY_KEY);
        if (!saved) {
          setHistory([]);
          setHistoryError(false);
          return;
        }

        const parsed: unknown = JSON.parse(saved);
        if (!Array.isArray(parsed)) {
          throw new Error("Workout history must be an array.");
        }

        setHistory(parsed as WorkoutHistoryEntry[]);
        setHistoryError(false);
      } catch (error) {
        console.error("Failed to load weekly workout progress:", error);
        setHistoryError(true);
      }
    }

    loadHistory();
    window.addEventListener(WORKOUT_HISTORY_UPDATED_EVENT, loadHistory);
    window.addEventListener("storage", loadHistory);

    return () => {
      window.removeEventListener(WORKOUT_HISTORY_UPDATED_EVENT, loadHistory);
      window.removeEventListener("storage", loadHistory);
    };
  }, []);

  const plannedDays = useMemo(
    () => days.filter((day) => (week[day] ?? []).length > 0),
    [week],
  );
  const completedDays = useMemo(
    () =>
      range
        ? getCompletedWorkoutDays(history, plannedDays, range)
        : new Set<string>(),
    [history, plannedDays, range],
  );
  const comparisons = useMemo(
    () =>
      range
        ? getExerciseComparisons(history, range, getExerciseName)
        : [],
    [history, range],
  );
  const percentage =
    plannedDays.length > 0
      ? Math.round((completedDays.size / plannedDays.length) * 100)
      : 0;
  const today = new Date().toISOString().slice(0, 10);
  const hasCurrentWeekExerciseData = Boolean(
    range &&
      history.some((workout) => {
        const date = getWorkoutHistoryDate(workout);
        return (
          workout.completed &&
          date !== null &&
          date >= range.start &&
          date <= range.end &&
          Object.values(workout.setData ?? {}).some((sets) =>
            Object.values(sets).some((set) => set.completed),
          )
        );
      }),
  );
  const primaryImprovement = comparisons.find(
    (comparison) => comparison.improvement,
  );

  return (
    <section className="mt-3 rounded-lg border border-slate-200 bg-slate-50/70 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
            <h4 className="text-xs font-bold text-slate-900">
              Weekly completion
            </h4>
          </div>

          <div className="mt-2 flex items-center justify-between gap-3">
            <p className="text-xs font-semibold text-slate-700">
              {range ? completedDays.size : "—"} / {plannedDays.length} workouts
              completed
            </p>
            {range && plannedDays.length > 0 && (
              <span className="text-[10px] font-medium text-slate-500">
                {percentage}%
              </span>
            )}
          </div>

          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-200"
            role="progressbar"
            aria-label={`Week ${weekIndex + 1} workout completion`}
            aria-valuemin={0}
            aria-valuemax={plannedDays.length}
            aria-valuenow={completedDays.size}
          >
            <div
              className="h-full rounded-full bg-primary transition-[width]"
              style={{ width: `${percentage}%` }}
            />
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-x-3 gap-y-1 text-[10px] font-medium text-slate-500 sm:max-w-[230px] sm:justify-end">
          <span className="inline-flex items-center gap-1 text-primary">
            <CheckCircle2 size={12} /> Completed
          </span>
          <span className="inline-flex items-center gap-1 text-amber-700">
            <Circle size={12} /> Missed / upcoming
          </span>
          <span className="inline-flex items-center gap-1">
            <Moon size={12} /> Planned rest
          </span>
        </div>
      </div>

      {range ? (
        <div className="mt-3 grid grid-cols-2 gap-1.5 sm:grid-cols-4 lg:grid-cols-7">
          {weekDays.map(({ date, day }) => {
            const isPlanned = plannedDays.includes(day);
            const completed = completedDays.has(day);
            const status = !isPlanned
              ? "Rest"
              : completed
                ? "Completed"
                : date < today
                  ? "Missed"
                  : date === today
                    ? "Today"
                    : "Upcoming";

            return (
              <div
                key={day}
                className="flex items-center justify-between gap-1 rounded-md border border-slate-200/80 bg-white px-2 py-1.5"
              >
                <div className="min-w-0">
                  <p className="truncate text-[10px] font-semibold text-slate-700">
                    {day.slice(0, 3)} · {formatDate(date)}
                  </p>
                  <p
                    className={`text-[9px] font-medium ${
                      status === "Completed"
                        ? "text-primary"
                        : status === "Missed"
                          ? "text-amber-700"
                          : "text-slate-500"
                    }`}
                  >
                    {status}
                  </p>
                </div>
                {!isPlanned ? (
                  <Moon size={12} className="shrink-0 text-slate-400" />
                ) : completed ? (
                  <CheckCircle2
                    size={13}
                    className="shrink-0 text-primary"
                  />
                ) : (
                  <Circle size={13} className="shrink-0 text-slate-300" />
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="mt-2 text-[11px] text-slate-500">
          A program start date is unavailable, so workout history cannot be
          assigned to this week yet.
        </p>
      )}

      <div className="mt-3 rounded-md border border-primary/10 bg-white px-3 py-2">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
          This week&apos;s highlight
        </p>
        {historyError ? (
          <p className="mt-1 text-xs text-red-600">
            Workout history could not be read. Refresh and try again.
          </p>
        ) : (
          <p className="mt-1 text-xs font-medium text-slate-700">
            {plannedDays.length === 0
              ? "No workout days are planned for this week."
              : completedDays.size > 0
                ? `You completed ${completedDays.size} of ${plannedDays.length} planned workouts.`
                : "No completed workouts are recorded for this week yet."}
            {primaryImprovement?.improvement && (
              <>
                {" "}
                {primaryImprovement.name} {primaryImprovement.improvement}.
              </>
            )}
          </p>
        )}

        <div className="mt-2 border-t border-slate-100 pt-2">
          <p className="text-[10px] font-semibold text-slate-600">
            Exercise progress vs. previous week
          </p>
          {historyError ? null : comparisons.length > 0 ? (
            <ul className="mt-1 space-y-1">
              {comparisons.slice(0, 3).map((comparison) => (
                <li
                  key={comparison.exerciseId}
                  className="text-[11px] text-slate-600"
                >
                  <span className="font-semibold text-slate-700">
                    {comparison.name}:
                  </span>{" "}
                  {comparison.improvement ??
                    `no increase recorded (${comparison.previous} → ${comparison.current})`}
                </li>
              ))}
              {comparisons.length > 3 && (
                <li className="text-[10px] text-slate-500">
                  {comparisons.length - 3} more comparable exercises
                </li>
              )}
            </ul>
          ) : (
            <p className="mt-1 text-[11px] text-slate-500">
              {hasCurrentWeekExerciseData
                ? "No previous-week performance is recorded for exercises completed this week."
                : "Log completed exercise sets this week to compare performance."}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
