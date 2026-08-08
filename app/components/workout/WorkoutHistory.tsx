"use client";

import { useEffect, useState } from "react";
import {
  CalendarDays,
  Clock,
  Dumbbell,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

import { exercises } from "@/app/data/exercises";

interface SetData {
  weight: string;
  reps: string;
  completed: boolean;
}

interface SavedWorkout {
  sessionId: string;
  day: string;
  date: string;
  setData: Record<
    number,
    Record<number, SetData>
  >;

  started: boolean;
  startedAt: string | null;

  completed: boolean;
  completedAt: string | null;

  lastActivityAt: string | null;

  durationSeconds: number;
}

const WORKOUT_HISTORY_KEY =
  "lifeos-workout-history";

export default function WorkoutHistory() {
  const [history, setHistory] =
    useState<SavedWorkout[]>([]);

  const [loaded, setLoaded] =
    useState(false);

  const [expandedWorkout, setExpandedWorkout] =
    useState<string | null>(null);

  /*
   * ========================================
   * LOAD HISTORY
   * ========================================
   */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          WORKOUT_HISTORY_KEY
        );

      if (saved) {
        const parsed =
          JSON.parse(saved);

        if (Array.isArray(parsed)) {
          const sorted = [
            ...parsed,
          ].sort((a, b) => {
            const dateA =
              new Date(
                a.completedAt ||
                  a.date
              ).getTime();

            const dateB =
              new Date(
                b.completedAt ||
                  b.date
              ).getTime();

            return dateB - dateA;
          });

          setHistory(sorted);
        }
      }
    } catch (error) {
      console.error(
        "❌ Failed to load workout history:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  /*
   * ========================================
   * FORMAT DURATION
   * ========================================
   */

  function formatDuration(
    seconds: number
  ) {
    const hours =
      Math.floor(
        seconds / 3600
      );

    const minutes =
      Math.floor(
        (seconds % 3600) / 60
      );

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }

    return `${minutes} min`;
  }

  /*
   * ========================================
   * FORMAT DATE
   * ========================================
   */

  function formatDate(
    date: string
  ) {
    try {
      return new Date(
        date
      ).toLocaleDateString(
        undefined,
        {
          day: "numeric",
          month: "short",
          year: "numeric",
        }
      );
    } catch {
      return date;
    }
  }

  /*
   * ========================================
   * WORKOUT STATISTICS
   * ========================================
   */

  function getWorkoutStats(
    workout: SavedWorkout
  ) {
    let totalSets = 0;
    let completedSets = 0;

    let totalExercises = 0;
    let completedExercises = 0;

    Object.values(
      workout.setData || {}
    ).forEach((exerciseSets) => {
      const sets = Object.values(
        exerciseSets || {}
      );

      totalExercises++;

      totalSets += sets.length;

      const completed =
        sets.filter(
          (set) =>
            set.completed
        ).length;

      completedSets += completed;

      if (
        sets.length > 0 &&
        completed === sets.length
      ) {
        completedExercises++;
      }
    });

    const percentage =
      totalSets === 0
        ? 0
        : Math.round(
            (completedSets /
              totalSets) *
              100
          );

    return {
      totalSets,
      completedSets,
      totalExercises,
      completedExercises,
      percentage,
    };
  }

  /*
   * ========================================
   * FIND EXERCISE NAME
   * ========================================
   */

  function getExerciseName(
    exerciseId: number
  ) {
    for (const muscleExercises of Object.values(
      exercises
    )) {
      const exercise =
        muscleExercises.find(
          (item) =>
            item.id ===
            exerciseId
        );

      if (exercise) {
        return exercise.name;
      }
    }

    return `Exercise #${exerciseId}`;
  }

  /*
   * ========================================
   * TOGGLE DETAILS
   * ========================================
   */

  function toggleWorkout(
    sessionId: string
  ) {
    setExpandedWorkout(
      (current) =>
        current === sessionId
          ? null
          : sessionId
    );
  }

  /*
   * ========================================
   * LOADING
   * ========================================
   */

  if (!loaded) {
    return (
      <section className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">

        <p className="text-sm text-slate-500">
          Loading workout history...
        </p>

      </section>
    );
  }

  /*
   * ========================================
   * UI
   * ========================================
   */

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="flex items-center justify-between">

        <div>

          <h2 className="flex items-center gap-2 text-xl font-bold text-slate-800">
            📚 Workout History
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Review your completed workout
            sessions.
          </p>

        </div>

        {history.length > 0 && (
          <div className="rounded-lg bg-green-50 px-3 py-2 text-sm font-semibold text-green-700">

            {history.length}{" "}

            {history.length === 1
              ? "Workout"
              : "Workouts"}

          </div>
        )}

      </div>

      {/* ================================= */}
      {/* EMPTY STATE */}
      {/* ================================= */}

      {history.length === 0 && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">

          <Dumbbell
            size={36}
            className="mx-auto text-slate-400"
          />

          <h3 className="mt-3 font-semibold text-slate-700">
            No workout history yet
          </h3>

          <p className="mt-1 text-sm text-slate-500">
            Finish your first workout
            and it will appear here.
          </p>

        </div>
      )}

      {/* ================================= */}
      {/* HISTORY LIST */}
      {/* ================================= */}

      {history.length > 0 && (
        <div className="mt-6 space-y-4">

          {history.map(
            (workout, index) => {
              const stats =
                getWorkoutStats(
                  workout
                );

              const sessionId =
                workout.sessionId ||
                `${workout.date}-${index}`;

              const isExpanded =
                expandedWorkout ===
                sessionId;

              return (
                <div
                  key={sessionId}
                  className="overflow-hidden rounded-xl border border-slate-200 transition hover:border-green-300"
                >

                  {/* ================================= */}
                  {/* WORKOUT SUMMARY */}
                  {/* ================================= */}

                  <button
                    type="button"
                    onClick={() =>
                      toggleWorkout(
                        sessionId
                      )
                    }
                    className="w-full p-4 text-left"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <h3 className="text-lg font-bold text-slate-800">
                          {workout.day}{" "}
                          Workout
                        </h3>

                        <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-slate-500">

                          <span className="flex items-center gap-1">

                            <CalendarDays
                              size={14}
                            />

                            {formatDate(
                              workout.date
                            )}

                          </span>

                          <span className="flex items-center gap-1">

                            <Clock
                              size={14}
                            />

                            {formatDuration(
                              workout.durationSeconds
                            )}

                          </span>

                        </div>

                      </div>

                      <div className="flex items-center gap-2">

                        <div
                          className={`rounded-lg px-3 py-2 text-sm font-bold ${
                            stats.percentage ===
                            100
                              ? "bg-green-50 text-green-700"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {stats.percentage}%
                        </div>

                        {isExpanded ? (
                          <ChevronUp
                            size={20}
                            className="text-slate-400"
                          />
                        ) : (
                          <ChevronDown
                            size={20}
                            className="text-slate-400"
                          />
                        )}

                      </div>

                    </div>

                    {/* Progress */}
                    <div className="mt-4">

                      <div className="h-2 overflow-hidden rounded-full bg-slate-100">

                        <div
                          className="h-full rounded-full bg-green-600 transition-all"
                          style={{
                            width: `${stats.percentage}%`,
                          }}
                        />

                      </div>

                    </div>

                    {/* Statistics */}
                    <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">

                      <div className="rounded-lg bg-slate-50 p-3">

                        <div className="flex items-center gap-2">

                          <Dumbbell
                            size={15}
                            className="text-green-600"
                          />

                          <p className="text-xs text-slate-500">
                            Sets
                          </p>

                        </div>

                        <p className="mt-1 font-bold text-slate-800">
                          {
                            stats.completedSets
                          }
                          /
                          {
                            stats.totalSets
                          }
                        </p>

                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">

                        <div className="flex items-center gap-2">

                          {stats.percentage ===
                          100 ? (
                            <CheckCircle2
                              size={15}
                              className="text-green-600"
                            />
                          ) : (
                            <Circle
                              size={15}
                              className="text-slate-400"
                            />
                          )}

                          <p className="text-xs text-slate-500">
                            Exercises
                          </p>

                        </div>

                        <p className="mt-1 font-bold text-slate-800">
                          {
                            stats.completedExercises
                          }
                          /
                          {
                            stats.totalExercises
                          }
                        </p>

                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">

                        <p className="text-xs text-slate-500">
                          Status
                        </p>

                        <p
                          className={`mt-1 font-bold ${
                            workout.completed
                              ? "text-green-600"
                              : "text-slate-600"
                          }`}
                        >
                          {workout.completed
                            ? "Completed"
                            : "Partial"}
                        </p>

                      </div>

                      <div className="rounded-lg bg-slate-50 p-3">

                        <p className="text-xs text-slate-500">
                          Duration
                        </p>

                        <p className="mt-1 font-bold text-slate-800">
                          {formatDuration(
                            workout.durationSeconds
                          )}
                        </p>

                      </div>

                    </div>

                  </button>

                  {/* ================================= */}
                  {/* WORKOUT DETAILS */}
                  {/* ================================= */}

                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50 p-4">

                      <div className="mb-4 flex items-center gap-2">

                        <Dumbbell
                          size={18}
                          className="text-green-600"
                        />

                        <h4 className="font-bold text-slate-800">
                          Workout Details
                        </h4>

                      </div>

                      <div className="space-y-4">

                        {Object.entries(
                          workout.setData || {}
                        ).map(
                          (
                            [
                              exerciseId,
                              exerciseSets,
                            ],
                            exerciseIndex
                          ) => {

                            const numericExerciseId =
                              Number(
                                exerciseId
                              );

                            const exerciseName =
                              getExerciseName(
                                numericExerciseId
                              );

                            const sets =
                              Object.entries(
                                exerciseSets ||
                                  {}
                              );

                            const completedSets =
                              sets.filter(
                                ([
                                  ,
                                  set,
                                ]) =>
                                  set.completed
                              ).length;

                            return (
                              <div
                                key={
                                  exerciseId
                                }
                                className="rounded-xl border border-slate-200 bg-white p-4"
                              >

                                {/* Exercise */}
                                <div className="flex items-start justify-between gap-3">

                                  <div>

                                    <div className="flex items-center gap-2">

                                      <span className="text-xs font-bold text-slate-400">
                                        #
                                        {exerciseIndex +
                                          1}
                                      </span>

                                      <h5 className="font-semibold text-slate-800">
                                        {
                                          exerciseName
                                        }
                                      </h5>

                                    </div>

                                    <p className="mt-1 text-xs text-slate-500">
                                      {
                                        completedSets
                                      }{" "}
                                      /{" "}
                                      {
                                        sets.length
                                      }{" "}
                                      sets completed
                                    </p>

                                  </div>

                                  <div
                                    className={`rounded-lg px-2 py-1 text-xs font-semibold ${
                                      completedSets ===
                                      sets.length
                                        ? "bg-green-50 text-green-700"
                                        : "bg-slate-100 text-slate-600"
                                    }`}
                                  >
                                    {sets.length ===
                                      completedSets
                                      ? "Complete"
                                      : "Partial"}
                                  </div>

                                </div>

                                {/* Set Header */}
                                <div className="mt-4 hidden grid-cols-4 gap-3 border-b border-slate-100 pb-2 text-xs font-medium text-slate-500 sm:grid">

                                  <span>
                                    Set
                                  </span>

                                  <span>
                                    Weight
                                  </span>

                                  <span>
                                    Reps
                                  </span>

                                  <span>
                                    Status
                                  </span>

                                </div>

                                {/* Sets */}
                                <div className="mt-2 space-y-2">

                                  {sets.map(
                                    (
                                      [
                                        setNumber,
                                        set,
                                      ]
                                    ) => (
                                      <div
                                        key={
                                          setNumber
                                        }
                                        className={`rounded-lg border p-3 ${
                                          set.completed
                                            ? "border-green-200 bg-green-50/50"
                                            : "border-slate-200 bg-slate-50"
                                        }`}
                                      >

                                        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:items-center">

                                          <div>

                                            <p className="text-xs text-slate-500 sm:hidden">
                                              Set
                                            </p>

                                            <p className="font-semibold text-slate-800">
                                              Set{" "}
                                              {
                                                setNumber
                                              }
                                            </p>

                                          </div>

                                          <div>

                                            <p className="text-xs text-slate-500 sm:hidden">
                                              Weight
                                            </p>

                                            <p className="font-semibold text-slate-800">
                                              {set.weight
                                                ? `${set.weight} kg`
                                                : "—"}
                                            </p>

                                          </div>

                                          <div>

                                            <p className="text-xs text-slate-500 sm:hidden">
                                              Reps
                                            </p>

                                            <p className="font-semibold text-slate-800">
                                              {set.reps ||
                                                "—"}
                                            </p>

                                          </div>

                                          <div>

                                            <p className="text-xs text-slate-500 sm:hidden">
                                              Status
                                            </p>

                                            {set.completed ? (
                                              <span className="flex items-center gap-1 text-sm font-semibold text-green-600">

                                                <CheckCircle2
                                                  size={
                                                    15
                                                  }
                                                />

                                                Completed

                                              </span>
                                            ) : (
                                              <span className="flex items-center gap-1 text-sm font-semibold text-slate-500">

                                                <Circle
                                                  size={
                                                    15
                                                  }
                                                />

                                                Not Completed

                                              </span>
                                            )}

                                          </div>

                                        </div>

                                      </div>
                                    )
                                  )}

                                </div>

                              </div>
                            );
                          }
                        )}

                      </div>

                    </div>
                  )}

                </div>
              );
            }
          )}

        </div>
      )}

    </section>
  );
}