"use client";

import { useMemo, useState } from "react";

type Exercise = {
  id: number;
  name: string;
  sets: number;
  reps: number;
  completed: boolean;
};

const workoutData: Record<string, Exercise[]> = {
  Chest: [
    { id: 1, name: "Bench Press", sets: 4, reps: 10, completed: true },
    {
      id: 2,
      name: "Incline Dumbbell Press",
      sets: 3,
      reps: 12,
      completed: true,
    },
    { id: 3, name: "Cable Fly", sets: 3, reps: 15, completed: false },
    {
      id: 4,
      name: "Machine Chest Press",
      sets: 3,
      reps: 12,
      completed: false,
    },
    { id: 5, name: "Push Ups", sets: 3, reps: 20, completed: false },
  ],

  Back: [
    { id: 1, name: "Lat Pulldown", sets: 4, reps: 12, completed: false },
    { id: 2, name: "Seated Row", sets: 3, reps: 12, completed: false },
    { id: 3, name: "Hammer Row", sets: 3, reps: 10, completed: false },
    { id: 4, name: "Face Pull", sets: 3, reps: 15, completed: false },
  ],

  Legs: [
    { id: 1, name: "Leg Press", sets: 4, reps: 15, completed: false },
    { id: 2, name: "Leg Extension", sets: 3, reps: 15, completed: false },
    { id: 3, name: "Leg Curl", sets: 3, reps: 15, completed: false },
    { id: 4, name: "Calf Raise", sets: 4, reps: 20, completed: false },
  ],

  Shoulders: [
    { id: 1, name: "Shoulder Press", sets: 4, reps: 10, completed: false },
    { id: 2, name: "Lateral Raise", sets: 3, reps: 15, completed: false },
    { id: 3, name: "Rear Delt Fly", sets: 3, reps: 15, completed: false },
    { id: 4, name: "Shrugs", sets: 3, reps: 15, completed: false },
  ],
};

export default function WorkoutTracker() {
  const [selectedWorkout, setSelectedWorkout] = useState("Chest");
  const [workouts, setWorkouts] = useState(workoutData);

  const exercises = workouts[selectedWorkout];

  const completedCount = useMemo(
    () => exercises.filter((exercise) => exercise.completed).length,
    [exercises]
  );

  const totalExercises = exercises.length;

  const progress =
    totalExercises > 0
      ? Math.round((completedCount / totalExercises) * 100)
      : 0;

  function toggleExercise(id: number) {
    setWorkouts((prev) => ({
      ...prev,
      [selectedWorkout]: prev[selectedWorkout].map((exercise) =>
        exercise.id === id
          ? {
              ...exercise,
              completed: !exercise.completed,
            }
          : exercise
      ),
    }));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6">

      {/* ===================================================== */}
      {/* HEADER */}
      {/* ===================================================== */}

      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

        {/* Title */}
        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
            🏋️
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              Today's Workout
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Track your daily training progress
            </p>
          </div>

        </div>

        {/* Workout Selector */}
        <div className="flex items-center gap-2">

          <span className="hidden text-xs font-medium text-slate-500 sm:block">
            Workout
          </span>

          <select
            value={selectedWorkout}
            onChange={(e) => setSelectedWorkout(e.target.value)}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
          >
            {Object.keys(workoutData).map((day) => (
              <option key={day} value={day}>
                {day}
              </option>
            ))}
          </select>

        </div>

      </div>

      {/* ===================================================== */}
      {/* SUMMARY */}
      {/* ===================================================== */}

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">

        <div className="rounded-xl bg-slate-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Exercises
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {totalExercises}
          </p>
        </div>

        <div className="rounded-xl bg-green-50 px-4 py-3">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Completed
          </p>

          <p className="mt-1 text-lg font-bold text-green-700">
            {completedCount}
          </p>
        </div>

        <div className="col-span-2 rounded-xl bg-slate-50 px-4 py-3 sm:col-span-1">
          <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
            Remaining
          </p>

          <p className="mt-1 text-lg font-bold text-slate-900">
            {totalExercises - completedCount}
          </p>
        </div>

      </div>

      {/* ===================================================== */}
      {/* EXERCISE LIST */}
      {/* ===================================================== */}

      <div className="mt-5">

        <div className="mb-3 flex items-center justify-between">

          <h3 className="text-sm font-semibold text-slate-900">
            Exercises
          </h3>

          <span className="text-xs text-slate-400">
            Tap an exercise to complete
          </span>

        </div>

        <div className="space-y-2.5">

          {exercises.map((exercise, index) => (

            <button
              key={exercise.id}
              type="button"
              onClick={() => toggleExercise(exercise.id)}
              className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 sm:px-4 ${
                exercise.completed
                  ? "border-green-100 bg-green-50 hover:border-green-200 hover:bg-green-100"
                  : "border-slate-200 bg-slate-50 hover:border-slate-300 hover:bg-slate-100"
              }`}
            >

              {/* Number / Completion */}
              <div
                className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all ${
                  exercise.completed
                    ? "bg-green-600 text-white"
                    : "border border-slate-300 bg-white text-slate-500"
                }`}
              >
                {exercise.completed ? "✓" : index + 1}
              </div>

              {/* Exercise Details */}
              <div className="min-w-0 flex-1">

                <p
                  className={`truncate text-sm font-semibold ${
                    exercise.completed
                      ? "text-slate-900"
                      : "text-slate-700"
                  }`}
                >
                  {exercise.name}
                </p>

                <p className="mt-0.5 text-xs text-slate-500">
                  {exercise.sets} Sets × {exercise.reps} Reps
                </p>

              </div>

              {/* Status */}
              <div className="shrink-0">

                {exercise.completed ? (
                  <span className="rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-semibold text-green-700">
                    Done
                  </span>
                ) : (
                  <span className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-slate-400">
                    Pending
                  </span>
                )}

              </div>

            </button>

          ))}

        </div>

      </div>

      {/* ===================================================== */}
      {/* WORKOUT PROGRESS */}
      {/* ===================================================== */}

      <div className="mt-6 border-t border-slate-100 pt-5">

        <div className="flex items-end justify-between">

          <div>
            <p className="text-sm font-semibold text-slate-900">
              Workout Progress
            </p>

            <p className="mt-0.5 text-xs text-slate-500">
              {completedCount} of {totalExercises} exercises completed
            </p>
          </div>

          <span className="text-lg font-bold text-green-600">
            {progress}%
          </span>

        </div>

        {/* Progress Bar */}
        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">

          <div
            className="h-full rounded-full bg-green-600 transition-all duration-500"
            style={{ width: `${progress}%` }}
          />

        </div>

        {/* Completion Message */}
        <div className="mt-3 flex items-center justify-between text-xs">

          {progress === 100 ? (
            <span className="font-medium text-green-600">
              🎉 Workout completed! Great job.
            </span>
          ) : progress > 0 ? (
            <span className="text-slate-500">
              💪 Keep going — you're making progress.
            </span>
          ) : (
            <span className="text-slate-500">
              Start your workout when you're ready.
            </span>
          )}

          <span className="font-medium text-slate-400">
            {totalExercises - completedCount} left
          </span>

        </div>

      </div>

    </div>
  );
}