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

      {/* ================================= */}
      {/* HEADER */}
      {/* ================================= */}

      <div className="flex items-start justify-between gap-4">

        <div>

          <p className="text-sm font-medium text-green-600">
            TODAY'S WORKOUT
          </p>

          <h1 className="mt-1 text-xl font-bold text-slate-800">
            {today} Workout
          </h1>

          <p className="mt-0.5 text-xs text-slate-500">
            {todaysMuscles.length >
            0
              ? todaysMuscles
                  .map(
                    (muscle) =>
                      muscle.name
                  )
                  .join(" • ")
              : "No workout planned"}
          </p>

        </div>

        {/* ================================= */}
        {/* TOP-RIGHT CONTROLS */}
        {/* ================================= */}

        <div className="flex flex-col items-end gap-2">

          {/* Save Status */}
          <div className="flex items-center gap-2 text-xs">

            {saveStatus ===
              "loading" && (
              <>
                <Loader2
                  size={14}
                  className="animate-spin text-slate-400"
                />

                <span className="text-slate-400">
                  Loading...
                </span>
              </>
            )}

            {saveStatus ===
              "saving" && (
              <>
                <Cloud
                  size={14}
                  className="text-slate-500"
                />

                <span className="text-slate-500">
                  Saving...
                </span>
              </>
            )}

            {saveStatus ===
              "saved" && (
              <>
                <Check
                  size={14}
                  className="text-green-600"
                />

                <span className="text-green-600">
                  Saved
                </span>
              </>
            )}

            {saveStatus ===
              "error" && (
              <span className="text-red-600">
                Save failed
              </span>
            )}

          </div>

          {/* Start Workout */}
          {!started &&
            !completed && (
              <button
                type="button"
                onClick={
                  startWorkout
                }
                disabled={
                  totalExercises ===
                  0
                }
                className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-slate-300"
              >

                <Play
                  size={16}
                />

                Start Workout

              </button>
            )}

          {/* In Progress */}
          {started &&
            !completed && (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">

                <span className="h-2 w-2 animate-pulse rounded-full bg-green-600" />

                <span className="text-sm font-semibold text-green-700">
                  Workout In Progress
                </span>

              </div>
            )}

          {/* Completed */}
          {completed && (
            <div className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2">

              <Check
                size={16}
                className="text-green-600"
              />

              <span className="text-sm font-semibold text-green-700">
                Workout Updated
              </span>

            </div>
          )}

        </div>

      </div>

      {/* ================================= */}
      {/* WORKOUT TIMER */}
      {/* ================================= */}

      {started && (
        <div className="mt-5 flex flex-wrap items-center gap-4 rounded-xl border border-slate-200 bg-slate-50 p-4">

          <div className="flex items-center gap-2">

            <Clock
              size={20}
              className="text-green-600"
            />

            <div>

              <p className="text-xs text-slate-500">
                Workout Duration
              </p>

              <p className="text-xl font-bold text-slate-800">
                {formatDuration(
                  liveDurationSeconds
                )}
              </p>

            </div>

          </div>

          {startedAt && (
            <div>

              <p className="text-xs text-slate-500">
                Started
              </p>

              <p className="text-sm font-semibold text-slate-700">
                {new Date(
                  startedAt
                ).toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  }
                )}
              </p>

            </div>
          )}

          {completed &&
            completedAt && (
              <div>

                <p className="text-xs text-slate-500">
                  Finished
                </p>

                <p className="text-sm font-semibold text-slate-700">
                  {new Date(
                    completedAt
                  ).toLocaleTimeString(
                    [],
                    {
                      hour: "2-digit",
                      minute: "2-digit",
                    }
                  )}
                </p>

              </div>
            )}

        </div>
      )}

      {/* ================================= */}
{/* OVERALL PROGRESS */}
{/* ================================= */}

{totalExercises > 0 && (
  <div
    className={`mt-3 rounded-lg border px-3 py-2.5 ${
      completed || progress === 100
        ? "border-green-300 bg-green-50"
        : "border-slate-200 bg-slate-50"
    }`}
  >
    {/* Progress Header */}
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <div
          className={`flex h-7 w-7 items-center justify-center rounded-full ${
            completed || progress === 100
              ? "bg-green-600 text-white"
              : "bg-white text-green-600"
          }`}
        >
          {completed || progress === 100 ? (
            <Trophy size={15} />
          ) : (
            <Dumbbell size={15} />
          )}
        </div>

        <div>
          <p className="text-sm font-semibold text-slate-800">
            {completed
              ? "Workout Updated!"
              : progress === 100
              ? "Workout Complete!"
              : "Workout Progress"}
          </p>

          <p className="text-[11px] font-medium text-slate-600">
            {completed
              ? "This workout has been finalized."
              : progress === 100
              ? "All planned sets are complete."
              : "Keep going. You've got this!"}
          </p>
        </div>
      </div>

      <p className="text-xl font-bold text-green-600">
        {progress}%
      </p>
    </div>

    {/* Progress Bar */}
    <div className="mt-2">
      <div className="h-2 overflow-hidden rounded-full bg-white">
        <div
          className="h-full rounded-full bg-green-600 transition-all duration-500"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>

    {/* Statistics */}
    <div className="mt-2 grid grid-cols-3 gap-2">
      <div className="rounded-md bg-white px-2 py-1.5 text-center">
        <p className="text-base font-bold text-green-600">
          {completedSetCount}
        </p>
        <p className="text-[10px] text-slate-500">
          Sets Done
        </p>
      </div>

      <div className="rounded-md bg-white px-2 py-1.5 text-center">
        <p className="text-base font-bold text-slate-900">
          {remainingSetCount}
        </p>
        <p className="text-[10px] font-medium text-slate-600">
          Sets Left
        </p>
      </div>

      <div className="rounded-md bg-white px-2 py-1.5 text-center">
        <p className="text-base font-bold text-slate-700">
          {completedExercises}/{totalExercises}
        </p>
        <p className="text-[10px] text-slate-500">
          Exercises
        </p>
      </div>
    </div>

    {/* Finish & Update */}
    {started && !completed && (
      <div className="mt-3 border-t border-slate-200 pt-3">
        <button
          type="button"
          onClick={finishWorkout}
          className="w-full rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          ✓ Finish & Update Workout
        </button>

        <p className="mt-1.5 text-center text-[11px] text-slate-500">
          You can finish the workout even if some exercises are incomplete.
        </p>
      </div>
    )}

    {/* Finalized */}
    {completed && (
      <div className="mt-3 rounded-md border border-green-200 bg-white px-3 py-2 text-center">
        <p className="text-sm font-semibold text-green-700">
          ✓ Workout successfully updated
        </p>

        {completedAt && (
          <p className="mt-1 text-[11px] text-slate-500">
            Finished{" "}
            {new Date(completedAt).toLocaleString()}
          </p>
        )}

        <p className="mt-1 text-[11px] text-slate-500">
          Total duration: {formatDuration(durationSeconds)}
        </p>
      </div>
    )}
  </div>
)}
      {totalExercises ===
        0 && (
        <div className="mt-6 rounded-xl border border-dashed border-slate-300 p-8 text-center">

          <Dumbbell
            size={32}
            className="mx-auto text-slate-400"
          />

          <h2 className="mt-3 font-semibold text-slate-700">
            No workout planned
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Add exercises to{" "}
            {today} in the
            Program Builder.
          </p>

        </div>
      )}

      {/* ================================= */}
      {/* EXERCISE LIST */}
      {/* ================================= */}

      {totalExercises >
        0 && (
        <div className="mt-4 space-y-3">

          {todaysExercises.map(
            (
              exercise,
              exerciseIndex
            ) => {

              const completedSetsForExercise =
                Object.values(
                  setData[
                    exercise.id
                  ] || {}
                ).filter(
                  (set) =>
                    set.completed
                ).length;

              const exerciseProgress =
                exercise.sets === 0
                  ? 0
                  : Math.round(
                      (completedSetsForExercise /
                        exercise.sets) *
                        100
                    );

              const exerciseCompleted =
                completedSetsForExercise >=
                exercise.sets;

              const isExpanded =
                expandedExerciseIndex === exerciseIndex;

              return (
                <div
                  key={`${exercise.id}-${exerciseIndex}`}
                  id={`today-exercise-${exerciseIndex}`}
                  className={`overflow-hidden rounded-lg border transition ${
                    exerciseCompleted
                      ? "border-green-300 bg-green-50/30"
                      : "border-slate-200"
                  }`}
                >

                  {/* Compact Exercise Row */}
                  <button
                    type="button"
                    onClick={() => openExercise(exerciseIndex)}
                    className="flex w-full items-center gap-3 px-3 py-2.5 text-left transition hover:bg-slate-50"
                    aria-expanded={isExpanded}
                  >
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
                        exerciseCompleted
                          ? "bg-green-100 text-green-600"
                          : "bg-green-50 text-green-600"
                      }`}
                    >
                      {exerciseCompleted ? (
                        <Check size={17} />
                      ) : (
                        <Dumbbell size={18} />
                      )}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] font-bold text-slate-400">
                          #{exerciseIndex + 1}
                        </span>

                        <h2 className="truncate text-sm font-semibold text-slate-800">
                          {exercise.name}
                        </h2>
                      </div>

                      <p className="mt-0.5 text-[11px] text-slate-500">
                        {exercise.muscle}
                        {" • "}
                        {exercise.equipment}
                      </p>
                    </div>

                    <div className="hidden items-center gap-3 sm:flex">
                      <div className="text-right">
                        <p className="text-[10px] text-slate-400">
                          Progress
                        </p>
                        <p className="text-xs font-semibold text-green-600">
                          {completedSetsForExercise}/{exercise.sets}
                        </p>
                      </div>

                      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className="h-full rounded-full bg-green-600 transition-all duration-300"
                          style={{ width: `${exerciseProgress}%` }}
                        />
                      </div>
                    </div>

                    <span className="shrink-0 text-slate-400">
                      {isExpanded ? "⌃" : "⌄"}
                    </span>
                  </button>

                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-3 py-3">

                  {/* Exercise Progress */}
                  <div className="mt-3 rounded-lg bg-slate-50 px-3 py-2">

                    <div className="flex items-center justify-between">

                      <p className="text-[11px] font-semibold text-slate-700">
                        Exercise Progress
                      </p>

                      <p className="text-sm font-bold text-green-600">
                        {exerciseProgress}%
                      </p>

                    </div>

                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white">

                      <div
                        className="h-full rounded-full bg-green-600 transition-all duration-300"
                        style={{
                          width: `${exerciseProgress}%`,
                        }}
                      />

                    </div>

                    <p className="mt-1 text-[11px] font-medium text-slate-600">
                      {
                        completedSetsForExercise
                      }{" "}
                      /{" "}
                      {exercise.sets}{" "}
                      sets completed
                    </p>

                  </div>

                  {/* Planned Summary */}
                  <div className="mt-3 flex gap-5 border-t border-slate-100 pt-2.5">

                    <div>

                      <p className="text-[11px] font-medium text-slate-600">
                        Planned Sets
                      </p>

                      <p className="text-sm font-semibold text-slate-800">
                        {
                          exercise.sets
                        }
                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">
                        Planned Reps
                      </p>

                      <p className="font-semibold text-slate-800">
                        {
                          exercise.reps
                        }
                      </p>

                    </div>

                    <div>

                      <p className="text-xs text-slate-500">
                        Rest
                      </p>

                      <p className="flex items-center gap-1 font-semibold text-slate-800">

                        <Clock
                          size={14}
                        />

                        {
                          exercise.rest
                        }
                        s

                      </p>

                    </div>

                  </div>

                  {/* Workout Sets */}
                  <div className="mt-3">

                    <p className="mb-1.5 text-xs font-semibold text-slate-700">
                      Workout Sets
                    </p>

                    <div className="space-y-2">

                      {Array.from({
                        length:
                          exercise.sets,
                      }).map(
                        (
                          _,
                          setIndex
                        ) => {

                          const setNumber =
                            setIndex +
                            1;

                          const currentSet =
                            getSet(
                              exercise.id,
                              setNumber,
                              exercise.reps
                            );

                          return (
                            <div
                              key={
                                setNumber
                              }
                              className={`rounded-lg border px-2 py-1.5 transition ${
                                currentSet.completed
                                  ? "border-green-300 bg-green-50"
                                  : "border-slate-200 bg-slate-50"
                              }`}
                            >

                              <div className="grid grid-cols-[28px_minmax(0,1fr)_minmax(0,1fr)_68px] items-end gap-2 sm:grid-cols-[40px_minmax(0,1fr)_140px_82px]">

                                {/* Set Number */}
                                <div className="flex items-center justify-center pb-1">
                                  <div
                                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${
                                      currentSet.completed
                                        ? "bg-green-600 text-white"
                                        : "bg-white text-slate-600"
                                    }`}
                                  >
                                    {currentSet.completed ? (
                                      <Check size={12} />
                                    ) : (
                                      setNumber
                                    )}
                                  </div>
                                </div>

                                {/* Weight */}
                                <div className="min-w-0">
                                  <label className="mb-1 block whitespace-nowrap text-[9px] font-medium text-slate-500 sm:text-xs">
                                    Weight (kg)
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    step="0.5"
                                    placeholder="0"
                                    value={currentSet.weight}
                                    disabled={completed}
                                    onChange={(event) =>
                                      updateSet(
                                        exercise.id,
                                        setNumber,
                                        {
                                          weight:
                                            event.target.value,
                                        },
                                        exercise.reps
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-slate-100 sm:rounded-lg sm:text-sm"
                                  />
                                </div>

                                {/* Actual Reps */}
                                <div className="min-w-0">
                                  <label className="mb-1 block whitespace-nowrap text-[9px] font-medium text-slate-500 sm:text-xs">
                                    Actual Reps
                                  </label>

                                  <input
                                    type="number"
                                    min="0"
                                    value={currentSet.reps}
                                    disabled={completed}
                                    onChange={(event) =>
                                      updateSet(
                                        exercise.id,
                                        setNumber,
                                        {
                                          reps:
                                            event.target.value,
                                        },
                                        exercise.reps
                                      )
                                    }
                                    className="w-full rounded-md border border-slate-300 bg-white px-2 py-1.5 text-[11px] outline-none focus:border-green-500 focus:ring-1 focus:ring-green-500 disabled:cursor-not-allowed disabled:bg-slate-100 sm:rounded-lg sm:text-sm"
                                  />
                                </div>

                                {/* Complete */}
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
                                  className={`h-[30px] w-full shrink-0 rounded-md px-1 text-[9px] font-semibold transition sm:mt-4 sm:h-[34px] sm:rounded-lg sm:px-2.5 sm:text-xs ${
                                    currentSet.completed
                                      ? "bg-green-600 text-white hover:bg-green-700"
                                      : "border border-slate-300 bg-white text-slate-600 hover:bg-slate-100"
                                  } disabled:cursor-not-allowed disabled:opacity-60`}
                                >
                                  <Check
                                    size={10}
                                    className="mr-0.5 inline sm:h-[15px] sm:w-[15px]"
                                  />
                                  {currentSet.completed
                                    ? "Done"
                                    : "Complete"}
                                </button>

                              </div>

                              <p className="mt-1 ml-9 text-[10px] text-slate-400">
                                Planned:{" "}
                                {
                                  exercise.reps
                                }{" "}
                                reps
                              </p>

                            </div>
                          );
                        }
                      )}

                    </div>

                    {!completed && (
                      <div className="mt-3 flex items-center justify-between border-t border-slate-200 pt-3">
                        <p className="text-[10px] text-slate-500">
                          Exercise {exerciseIndex + 1} of {totalExercises}
                        </p>

                        {exerciseIndex < totalExercises - 1 ? (
                          <button
                            type="button"
                            onClick={() =>
                              goToNextExercise(exerciseIndex)
                            }
                            className="rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
                          >
                            Next Exercise →
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedExerciseIndex(null)
                            }
                            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100"
                          >
                            Finish Exercises
                          </button>
                        )}
                      </div>
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