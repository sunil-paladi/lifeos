"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Clock,
  Dumbbell,
  Cloud,
  Loader2,
  Trophy,
  Play,
} from "lucide-react";

import { exercises } from "@/app/data/exercises";
import { useProgram } from "@/app/context/ProgramContext";

interface WorkoutExercise {
  id: number;
  name: string;
  equipment: string;
  muscle: string;
  sets: number;
  reps: number;
  rest: number;
}

interface SetData {
  weight: string;
  reps: string;
  completed: boolean;
}

type WorkoutSetState = Record<
  number,
  Record<number, SetData>
>;

type WorkoutSaveStatus =
  | "loading"
  | "saved"
  | "saving"
  | "error";

interface SavedWorkout {
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
}

const WORKOUT_STORAGE_KEY =
  "lifeos-todays-workout";

const WORKOUT_HISTORY_KEY =
  "lifeos-workout-history";

/*
 * Six hours of inactivity will automatically
 * finalize the workout.
 */
const AUTO_FINALIZE_HOURS = 6;

export default function TodaysWorkout() {
  const { workout } = useProgram();

  /*
   * Temporary testing day.
   *
   * We will replace this with automatic
   * current-day detection later.
   */
  const today =
    "Monday" as keyof typeof workout;

  const todaysMuscles =
    workout[today] || [];

  /*
   * Convert ProgramContext exercises
   * into Today's Workout exercises.
   */
  const todaysExercises: WorkoutExercise[] =
    todaysMuscles
      .flatMap((muscle) =>
        muscle.exercises.map(
          (programExercise) => {
            const exerciseData =
              exercises[muscle.name]?.find(
                (exercise) =>
                  exercise.id ===
                  programExercise.id
              );

            if (!exerciseData) {
              return null;
            }

            return {
              ...exerciseData,
              sets: programExercise.sets,
              reps: programExercise.reps,
              rest: programExercise.rest,
              muscle: muscle.name,
            };
          }
        )
      )
      .filter(
        (
          exercise
        ): exercise is WorkoutExercise =>
          exercise !== null
      );

  /*
   * ========================================
   * STATE
   * ========================================
   */

  const [setData, setSetData] =
    useState<WorkoutSetState>({});

  const [workoutLoaded, setWorkoutLoaded] =
    useState(false);

  const [saveStatus, setSaveStatus] =
    useState<WorkoutSaveStatus>(
      "loading"
    );

  /*
   * Workout lifecycle.
   */
  const [sessionId, setSessionId] =
    useState<string | null>(null);

  const [started, setStarted] =
    useState(false);

  const [startedAt, setStartedAt] =
    useState<string | null>(null);

  const [completed, setCompleted] =
    useState(false);

  const [completedAt, setCompletedAt] =
    useState<string | null>(null);

  const [lastActivityAt, setLastActivityAt] =
    useState<string | null>(null);

  /*
   * Duration stored in seconds.
   */
  const [durationSeconds, setDurationSeconds] =
    useState(0);

  /*
   * Used only to refresh the live timer.
   */
  const [currentTime, setCurrentTime] =
    useState(Date.now());

  /*
   * ========================================
   * EXERCISE ACCORDION
   * ========================================
   *
   * Keep Today's Workout compact by expanding
   * only one exercise at a time.
   */
  const [expandedExerciseIndex, setExpandedExerciseIndex] =
    useState<number | null>(null);

  /*
   * ========================================
   * LOAD SAVED WORKOUT
   * ========================================
   */

  useEffect(() => {
    try {
      const saved =
        localStorage.getItem(
          WORKOUT_STORAGE_KEY
        );

      if (saved) {
        const parsed =
          JSON.parse(
            saved
          ) as Partial<SavedWorkout>;

        if (
          parsed &&
          parsed.day === today
        ) {
          if (parsed.setData) {
            setSetData(
              parsed.setData
            );
          }

          setSessionId(
            parsed.sessionId || null
          );

          setStarted(
            parsed.started === true
          );

          setStartedAt(
            parsed.startedAt ||
              null
          );

          setCompleted(
            parsed.completed === true
          );

          setCompletedAt(
            parsed.completedAt ||
              null
          );

          setLastActivityAt(
            parsed.lastActivityAt ||
              null
          );

          setDurationSeconds(
            parsed.durationSeconds ||
              0
          );
        }
      }

      setSaveStatus("saved");
    } catch (error) {
      console.error(
        "❌ Failed to load today's workout:",
        error
      );

      setSaveStatus("error");
    } finally {
      setWorkoutLoaded(true);
    }
  }, [today]);

  /*
   * ========================================
   * LIVE TIMER
   * ========================================
   *
   * Timer updates once every second while
   * workout is active.
   */
  useEffect(() => {
    if (
      !started ||
      completed ||
      !startedAt
    ) {
      return;
    }

    const timer =
      setInterval(() => {
        setCurrentTime(
          Date.now()
        );
      }, 1000);

    return () => {
      clearInterval(timer);
    };
  }, [
    started,
    completed,
    startedAt,
  ]);

  /*
   * ========================================
   * CALCULATE LIVE DURATION
   * ========================================
   */

  const liveDurationSeconds =
    useMemo(() => {
      if (
        !started ||
        !startedAt
      ) {
        return durationSeconds;
      }

      if (completed) {
        return durationSeconds;
      }

      const start =
        new Date(
          startedAt
        ).getTime();

      const seconds = Math.max(
        Math.floor(
          (currentTime - start) /
            1000
        ),
        0
      );

      return seconds;
    }, [
      started,
      startedAt,
      completed,
      durationSeconds,
      currentTime,
    ]);

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

    const remainingSeconds =
      seconds % 60;

    if (hours > 0) {
      return `${hours}h ${minutes
        .toString()
        .padStart(
          2,
          "0"
        )}m`;
    }

    return `${minutes
      .toString()
      .padStart(
        2,
        "0"
      )}:${remainingSeconds
      .toString()
      .padStart(
        2,
        "0" )}`;
  }

  /*
   * ========================================
   * AUTO-SAVE
   * ========================================
   */

  useEffect(() => {
    if (!workoutLoaded) {
      return;
    }

    if (!started && !sessionId) {
      return;
    }

    setSaveStatus("saving");

    const timeout =
      setTimeout(() => {
        try {
          const workoutToSave: SavedWorkout = {
            sessionId:
              sessionId ||
              `${today}-${Date.now()}`,
            day: today,

            date: new Date()
              .toISOString()
              .split("T")[0],

            setData,

            started,
            startedAt,

            completed,
            completedAt,

            lastActivityAt,

            durationSeconds:
              completed
                ? durationSeconds
                : liveDurationSeconds,
          };

          localStorage.setItem(
            WORKOUT_STORAGE_KEY,
            JSON.stringify(
              workoutToSave
            )
          );

          setSaveStatus("saved");
        } catch (error) {
          console.error(
            "❌ Failed to auto-save workout:",
            error
          );

          setSaveStatus("error");
        }
      }, 500);

    return () => {
      clearTimeout(timeout);
    };
  }, [
    workoutLoaded,
    today,
    setData,
    sessionId,
    started,
    startedAt,
    completed,
    completedAt,
    lastActivityAt,
    durationSeconds,
    liveDurationSeconds,
  ]);

  /*
   * ========================================
   * START WORKOUT
   * ========================================
   */

  function startWorkout() {
    if (completed) {
      return;
    }

    const now =
      new Date().toISOString();

    const newSessionId =
      `${today}-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

    setSessionId(newSessionId);
    setStarted(true);
    setStartedAt(now);
    setCompleted(false);
    setCompletedAt(null);
    setLastActivityAt(now);
    setDurationSeconds(0);
    setCurrentTime(Date.now());
  }

  /*
   * ========================================
   * RECORD USER ACTIVITY
   * ========================================
   */

  function recordActivity() {
    if (
      completed
    ) {
      return;
    }

    /*
     * If user enters data without
     * explicitly pressing Start,
     * automatically start the workout.
     */
    if (!started) {
      startWorkout();
    }

    setLastActivityAt(
      new Date().toISOString()
    );
  }

  /*
   * ========================================
   * GET SET
   * ========================================
   */

  function getSet(
    exerciseId: number,
    setNumber: number,
    plannedReps: number
  ): SetData {
    const savedSet =
      setData[exerciseId]?.[
        setNumber
      ];

    if (savedSet) {
      return savedSet;
    }

    return {
      weight: "",
      reps: String(plannedReps),
      completed: false,
    };
  }

  /*
   * ========================================
   * UPDATE SET
   * ========================================
   */

  function updateSet(
    exerciseId: number,
    setNumber: number,
    changes: Partial<SetData>,
    plannedReps: number
  ) {
    if (completed) {
      return;
    }

    setSetData((current) => ({
      ...current,

      [exerciseId]: {
        ...(current[exerciseId] || {}),

        [setNumber]: {
          ...getSet(
            exerciseId,
            setNumber,
            plannedReps
          ),
          ...changes,
        },
      },
    }));

    recordActivity();
  }

  /*
   * ========================================
   * TOGGLE SET
   * ========================================
   */

  function toggleSet(
    exerciseId: number,
    setNumber: number,
    plannedReps: number
  ) {
    if (completed) {
      return;
    }

    const currentSet =
      getSet(
        exerciseId,
        setNumber,
        plannedReps
      );

    updateSet(
      exerciseId,
      setNumber,
      {
        completed:
          !currentSet.completed,
      },
      plannedReps
    );
  }

  /*
   * ========================================
   * PROGRESS
   * ========================================
   */

  const totalSets =
    todaysExercises.reduce(
      (total, exercise) =>
        total + exercise.sets,
      0
    );

  const completedSetCount =
    Object.values(setData).reduce(
      (exerciseTotal, exerciseSets) =>
        exerciseTotal +
        Object.values(
          exerciseSets
        ).filter(
          (set) =>
            set.completed
        ).length,
      0
    );

  const remainingSetCount =
    Math.max(
      totalSets -
        completedSetCount,
      0
    );

  const progress =
    totalSets === 0
      ? 0
      : Math.round(
          (completedSetCount /
            totalSets) *
            100
        );

  const totalExercises =
    todaysExercises.length;

  const completedExercises =
    todaysExercises.filter(
      (exercise) => {
        const completedSets =
          Object.values(
            setData[
              exercise.id
            ] || {}
          ).filter(
            (set) =>
              set.completed
          ).length;

        return (
          completedSets >=
          exercise.sets
        );
      }
    ).length;

  /*
   * ========================================
   * FINISH & UPDATE
   * ========================================
   *
   * Can be clicked even when workout
   * is incomplete.
   * ========================================
   */

  function finishWorkout() {
    if (
      !started ||
      completed ||
      !sessionId
    ) {
      return;
    }

    const now =
      new Date().toISOString();

    let finalDuration =
      durationSeconds;

    if (startedAt) {
      finalDuration =
        Math.max(
          Math.floor(
            (Date.now() -
              new Date(
                startedAt
              ).getTime()) /
              1000
          ),
          0
        );
    }

    const finalWorkout: SavedWorkout =
      {
        sessionId,
        day: today,
        date: new Date()
          .toISOString()
          .split("T")[0],
        setData,
        started: true,
        startedAt,
        completed: true,
        completedAt: now,
        lastActivityAt: now,
        durationSeconds: finalDuration,
      };

    try {
      const existingHistoryRaw =
        localStorage.getItem(
          WORKOUT_HISTORY_KEY
        );

      const existingHistory: SavedWorkout[] =
        existingHistoryRaw
          ? JSON.parse(existingHistoryRaw)
          : [];

      const updatedHistory = [
        ...existingHistory,
        finalWorkout,
      ];

      localStorage.setItem(
        WORKOUT_HISTORY_KEY,
        JSON.stringify(updatedHistory)
      );

      localStorage.removeItem(
        WORKOUT_STORAGE_KEY
      );

      setSetData({});
      setSessionId(null);
      setStarted(false);
      setStartedAt(null);
      setCompleted(false);
      setCompletedAt(null);
      setLastActivityAt(null);
      setDurationSeconds(0);
      setCurrentTime(Date.now());
      setSaveStatus("saved");

      console.log(
        "🎉 Workout saved to history:",
        finalWorkout
      );
    } catch (error) {
      console.error(
        "❌ Failed to save workout to history:",
        error
      );
      setSaveStatus("error");
    }
  }

  /*
   * ========================================
   * 6-HOUR INACTIVITY AUTO-FINALIZE
   * ========================================
   */

  useEffect(() => {
    if (
      !workoutLoaded ||
      !started ||
      completed ||
      !lastActivityAt
    ) {
      return;
    }

    const checkInactivity =
      () => {
        const lastActivity =
          new Date(
            lastActivityAt
          ).getTime();

        const now =
          Date.now();

        const inactivityMs =
          now -
          lastActivity;

        const sixHoursMs =
          AUTO_FINALIZE_HOURS *
          60 *
          60 *
          1000;

        if (
          inactivityMs >=
          sixHoursMs
        ) {
          console.log(
            "⏰ Six hours of inactivity. Auto-finalizing workout."
          );

          finishWorkout();
        }
      };

    checkInactivity();

    const interval =
      setInterval(
        checkInactivity,
        60 * 1000
      );

    return () => {
      clearInterval(
        interval
      );
    };
  }, [
    workoutLoaded,
    started,
    completed,
    lastActivityAt,
    startedAt,
    sessionId,
  ]);

  /*
   * ========================================
   * EXERCISE NAVIGATION
   * ========================================
   */

  function openExercise(index: number) {
    setExpandedExerciseIndex((current) =>
      current === index ? null : index
    );
  }

  function goToNextExercise(index: number) {
    const nextIndex = index + 1;

    if (nextIndex >= todaysExercises.length) {
      setExpandedExerciseIndex(null);
      return;
    }

    setExpandedExerciseIndex(nextIndex);

    requestAnimationFrame(() => {
      document
        .getElementById(`today-exercise-${nextIndex}`)
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    });
  }

  /*
   * ========================================
   * RENDER
   * ========================================
   */

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-green-600">
            TODAY'S WORKOUT
          </p>
          <h1 className="mt-1 text-xl font-bold text-slate-900">
            {today} Workout
          </h1>
          <p className="mt-0.5 text-xs font-medium text-slate-500">
            {todaysMuscles.length > 0
              ? todaysMuscles.map((muscle) => muscle.name).join(" • ")
              : "No workout planned"}
          </p>
        </div>

        <div className="flex flex-col items-end gap-2">
          <div className="flex items-center gap-1.5 text-xs">
            {saveStatus === "loading" && (
              <>
                <Loader2 size={13} className="animate-spin text-slate-400" />
                <span className="font-semibold text-slate-400">Loading...</span>
              </>
            )}
            {saveStatus === "saving" && (
              <>
                <Cloud size={13} className="text-slate-400" />
                <span className="font-semibold text-slate-500">Saving...</span>
              </>
            )}
            {saveStatus === "saved" && (
              <>
                <Check size={13} className="text-green-600" />
                <span className="font-semibold text-green-600">Saved</span>
              </>
            )}
            {saveStatus === "error" && (
              <span className="font-semibold text-red-600">Save failed</span>
            )}
          </div>

          {!started && !completed && (
            <button
              type="button"
              onClick={startWorkout}
              disabled={totalExercises === 0}
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              <Play size={14} />
              Start Workout
            </button>
          )}

          {started && !completed && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
              <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
              <span className="text-xs font-bold text-green-700">
                Workout In Progress
              </span>
            </div>
          )}

          {completed && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">
              <Check size={14} className="text-green-600" />
              <span className="text-xs font-bold text-green-700">
                Workout Updated
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Timer - only while workout is active */}
      {started && (
        <div className="mt-4 flex flex-wrap items-center gap-x-8 gap-y-2 border-y border-slate-200 py-3">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-green-600" />
            <div>
              <p className="text-[10px] font-semibold text-slate-500">
                Workout Duration
              </p>
              <p className="text-sm font-semibold text-slate-800">
                {formatDuration(liveDurationSeconds)}
              </p>
            </div>
          </div>

          {startedAt && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500">Started</p>
              <p className="text-xs font-extrabold text-slate-800">
                {new Date(startedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}

          {completed && completedAt && (
            <div>
              <p className="text-[10px] font-semibold text-slate-500">Finished</p>
              <p className="text-xs font-extrabold text-slate-800">
                {new Date(completedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Modern flat workout progress row */}
      {totalExercises > 0 && (
        <div className="mt-4 border-y border-slate-200 py-3">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <div className="flex min-w-[145px] items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-green-50 text-green-600">
                {progress === 100 ? (
                  <Trophy size={14} />
                ) : (
                  <Dumbbell size={14} />
                )}
              </div>
              <div>
                <p className="text-sm font-extrabold tracking-tight text-slate-800">
                  Workout Progress
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Keep going. You've got this!
                </p>
              </div>
            </div>

            <div className="flex min-w-[180px] flex-1 items-center gap-2">
              <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full rounded-full bg-green-600 transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-green-600">
                {progress}%
              </span>
            </div>

            <div className="flex items-center gap-6">
              <div className="text-center">
                <p className="text-sm font-semiabold text-green-600">
                  {completedSetCount}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Sets Done
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">
                  {remainingSetCount}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Sets Left
                </p>
              </div>

              <div className="text-center">
                <p className="text-sm font-semibold text-slate-800">
                  {completedExercises}/{totalExercises}
                </p>
                <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
                  Exercises
                </p>
              </div>
            </div>

            {started && !completed && (
              <button
                type="button"
                onClick={finishWorkout}
                className="rounded-md bg-green-600 px-3 py-2 text-[11px] font-extrabold text-white transition hover:bg-green-700"
              >
                ✓ Finish &amp; Update
              </button>
            )}
          </div>
        </div>
      )}

      {totalExercises === 0 && (
        <div className="mt-5 border-y border-dashed border-slate-300 py-8 text-center">
          <Dumbbell size={30} className="mx-auto text-slate-400" />
          <h2 className="mt-3 text-sm font-bold text-slate-700">
            No workout planned
          </h2>
          <p className="mt-1 text-xs font-medium text-slate-500">
            Add exercises to {today} in the Program Builder.
          </p>
        </div>
      )}

      {/* Flat exercise list */}
      {totalExercises > 0 && (
        <div className="mt-2 divide-y divide-slate-200">
          {todaysExercises.map((exercise, exerciseIndex) => {
            const completedSetsForExercise = Object.values(
              setData[exercise.id] || {}
            ).filter((set) => set.completed).length;

            const exerciseProgress =
              exercise.sets === 0
                ? 0
                : Math.round(
                    (completedSetsForExercise / exercise.sets) * 100
                  );

            const exerciseCompleted =
              completedSetsForExercise >= exercise.sets;

            const isExpanded =
              expandedExerciseIndex === exerciseIndex;

            const firstSet = getSet(
              exercise.id,
              1,
              exercise.reps
            );

            return (
              <div
                key={`${exercise.id}-${exerciseIndex}`}
                id={`today-exercise-${exerciseIndex}`}
                className="overflow-hidden"
              >
                {/* Exercise row */}
                <button
                  type="button"
                  onClick={() => openExercise(exerciseIndex)}
                  aria-expanded={isExpanded}
                  className={`flex w-full items-center gap-3 px-2 py-3 text-left transition hover:bg-slate-50 ${
                    isExpanded ? "bg-slate-50" : ""
                  }`}
                >
                  <div
                    className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                      exerciseCompleted
                        ? "bg-green-100 text-green-600"
                        : "bg-green-50 text-green-600"
                    }`}
                  >
                    {exerciseCompleted ? (
                      <Check size={14} />
                    ) : (
                      <Dumbbell size={14} />
                    )}
                  </div>

                  <div className="min-w-[150px] flex-1">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-medium text-green-600">
                        #{exerciseIndex + 1}
                      </span>
                      <h2 className="truncate text-sm font-semibold tracking-tight text-slate-800">
                        {exercise.name}
                      </h2>
                    </div>
                    <p className="truncate text-xs font-medium text-slate-500">
                      {exercise.muscle} • {exercise.equipment}
                    </p>
                  </div>

                  <div className="hidden min-w-[55px] text-center sm:block">
                    <p className="text-[10px] font-medium uppercase tracking-wide text-slate-400">
  Sets
</p>
                    <p className="text-sm font-semibold text-slate-800">
                      {completedSetsForExercise}/{exercise.sets}
                    </p>
                  </div>

                  <div className="hidden min-w-[70px] text-center md:block">
                    <p className="text-xs font-bold text-slate-600">
                      Reps / Set
                    </p>
                   <p className="text-sm font-semibold text-slate-800">
                      {exercise.reps}
                    </p>
                  </div>

                  <div className="hidden min-w-[65px] text-center lg:block">
                    <p className="text-xs font-bold text-slate-600">
                      Weight
                    </p>
                   <p className="text-sm font-semibold text-slate-800">
                      {firstSet.weight || "—"} kg
                    </p>
                  </div>

                  <div className="hidden min-w-[78px] text-center sm:block">
                    <p className="text-xs font-bold text-slate-600">
                      Status
                    </p>
                    <p
                      className={`text-sm font-semibold ${
                        exerciseCompleted
                          ? "text-green-600"
                          : "text-slate-600"
                      }`}
                    >
                      {exerciseCompleted ? "Completed" : "Not Started"}
                    </p>
                  </div>

                  <div className="flex min-w-[48px] flex-col items-end">
                    <span className="text-sm font-semibold text-green-600">
                      {exerciseProgress}%
                    </span>
                    <div className="mt-1 h-1.5 w-10 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-green-600 transition-all duration-300"
                        style={{ width: `${exerciseProgress}%` }}
                      />
                    </div>
                  </div>

                  <span className="shrink-0 text-sm font-extrabold text-slate-400">
                    {isExpanded ? "⌃" : "⌄"}
                  </span>
                </button>

                {/* Expanded exercise: still flat, no individual cards */}
                {isExpanded && (
                  <div className="border-t border-slate-200 bg-slate-50/50 px-2 py-3">
                    {/* Exercise summary */}
                    <div className="flex flex-wrap items-center gap-x-6 gap-y-1 border-b border-slate-200 pb-2">
                      <span className="text-xs font-extrabold text-slate-700">
                        Sets{" "}
                        <strong className="text-slate-900">
                          {completedSetsForExercise}/{exercise.sets}
                        </strong>
                      </span>

                      <span className="text-xs font-extrabold text-slate-700">
                        Reps{" "}
                        <strong className="text-slate-900">
                          {exercise.reps}
                        </strong>
                      </span>

                      <span className="text-xs font-extrabold text-slate-700">
                        Rest{" "}
                        <strong className="text-slate-900">
                          {exercise.rest}s
                        </strong>
                      </span>

                      <span className="text-xs font-extrabold text-green-600">
                        {exerciseProgress}% Complete
                      </span>
                    </div>

                    {/* Column headings */}
                    <div className="mt-3 grid grid-cols-[52px_1fr_100px_88px] items-center gap-3 px-2">
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                        Set
                      </span>
                      <span className="text-xs font-bold uppercase tracking-wide text-slate-600">
                        Weight (kg)
                      </span>
                      <span className="text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
                        Reps
                      </span>
                      <span className="text-center text-[10px] font-extrabold uppercase tracking-wide text-slate-600">
                        Status
                      </span>
                    </div>

                    {/* Compact set rows */}
                    <div className="divide-y divide-slate-200">
                      {Array.from({ length: exercise.sets }).map(
                        (_, setIndex) => {
                          const setNumber = setIndex + 1;
                          const currentSet = getSet(
                            exercise.id,
                            setNumber,
                            exercise.reps
                          );

                          return (
                            <div
                              key={setNumber}
                              className={`grid grid-cols-[52px_1fr_100px_88px] items-center gap-3 px-2 py-2 ${
                                currentSet.completed
                                  ? "bg-green-50/60"
                                  : ""
                              }`}
                            >
                              <div className="flex items-center gap-1.5">
                                <span
                                  className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-extrabold ${
                                    currentSet.completed
                                      ? "bg-green-600 text-white"
                                      : "bg-slate-200 text-slate-700"
                                  }`}
                                >
                                  {currentSet.completed ? (
                                    <Check size={13} />
                                  ) : (
                                    setNumber
                                  )}
                                </span>
                                <span className="text-sm font-extrabold text-slate-700">
                                  Set
                                </span>
                              </div>

                              <input
                                type="number"
                                min="0"
                                step="0.5"
                                placeholder="Enter weight"
                                value={currentSet.weight}
                                disabled={completed}
                                onChange={(event) =>
                                  updateSet(
                                    exercise.id,
                                    setNumber,
                                    { weight: event.target.value },
                                    exercise.reps
                                  )
                                }
                                className="h-9 w-full border-b-2 border-slate-300 bg-transparent px-1 text-base font-extrabold text-slate-900 outline-none transition placeholder:font-semibold placeholder:text-slate-400 focus:border-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                              />

                              <input
                                type="number"
                                min="0"
                                value={currentSet.reps}
                                disabled={completed}
                                onChange={(event) =>
                                  updateSet(
                                    exercise.id,
                                    setNumber,
                                    { reps: event.target.value },
                                    exercise.reps
                                  )
                                }
                                className="h-9 w-full border-b-2 border-slate-300 bg-transparent px-1 text-center text-base font-extrabold text-slate-900 outline-none transition focus:border-green-600 disabled:cursor-not-allowed disabled:opacity-60"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  toggleSet(
                                    exercise.id,
                                    setNumber,
                                    exercise.reps
                                  )
                                }
                                disabled={completed}
                                className={`h-9 rounded-md px-3 text-xs font-extrabold transition ${
                                  currentSet.completed
                                    ? "bg-green-600 text-white hover:bg-green-700"
                                    : "border border-slate-300 bg-white text-slate-700 hover:border-green-400 hover:bg-green-50 hover:text-green-700"
                                } disabled:cursor-not-allowed disabled:opacity-60`}
                              >
                                {currentSet.completed ? (
                                  <>
                                    <Check
                                      size={12}
                                      className="mr-1 inline"
                                    />
                                    Done
                                  </>
                                ) : (
                                  "Complete"
                                )}
                              </button>
                            </div>
                          );
                        }
                      )}
                    </div>

                    {/* Exercise navigation */}
                    {!completed && (
                      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                        <p className="text-xs font-bold text-slate-600">
                          Exercise {exerciseIndex + 1} of {totalExercises}
                        </p>

                        {exerciseIndex < totalExercises - 1 ? (
                          <button
                            type="button"
                            onClick={() => goToNextExercise(exerciseIndex)}
                            className="rounded-md bg-green-600 px-3 py-2 text-xs font-extrabold text-white transition hover:bg-green-700"
                          >
                            Next Exercise →
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setExpandedExerciseIndex(null)}
                            className="rounded-md border border-slate-300 bg-white px-3 py-2 text-xs font-extrabold text-slate-700 transition hover:bg-slate-100"
                          >
                            Finish Exercises
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
