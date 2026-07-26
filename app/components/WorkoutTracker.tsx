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
    { id: 2, name: "Incline Dumbbell Press", sets: 3, reps: 12, completed: true },
    { id: 3, name: "Cable Fly", sets: 3, reps: 15, completed: false },
    { id: 4, name: "Machine Chest Press", sets: 3, reps: 12, completed: false },
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
    () => exercises.filter((e) => e.completed).length,
    [exercises]
  );

  const progress = Math.round(
    (completedCount / exercises.length) * 100
  );

  function toggleExercise(id: number) {
    setWorkouts((prev) => ({
      ...prev,
      [selectedWorkout]: prev[selectedWorkout].map((exercise) =>
        exercise.id === id
          ? { ...exercise, completed: !exercise.completed }
          : exercise
      ),
    }));
  }

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">

      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">

        <div>
          <h2 className="text-2xl font-bold">
            🏋 Today's Workout
          </h2>

          <p className="text-gray-500">
            Track your daily training progress
          </p>
        </div>

        <select
          value={selectedWorkout}
          onChange={(e) => setSelectedWorkout(e.target.value)}
          className="border rounded-xl px-4 py-2"
        >
          {Object.keys(workoutData).map((day) => (
            <option key={day}>{day}</option>
          ))}
        </select>

      </div>

      <div className="space-y-3">

        {exercises.map((exercise) => (

          <div
            key={exercise.id}
            className={`flex items-center justify-between rounded-xl p-4 transition-all ${
              exercise.completed
                ? "bg-green-100"
                : "bg-gray-100"
            }`}
          >
            <div>

              <h3 className="font-semibold">
                {exercise.name}
              </h3>

              <p className="text-sm text-gray-500">
                {exercise.sets} Sets × {exercise.reps} Reps
              </p>

            </div>

            <button
              onClick={() => toggleExercise(exercise.id)}
              className={`text-2xl ${
                exercise.completed
                  ? "text-green-600"
                  : "text-gray-400"
              }`}
            >
              {exercise.completed ? "✅" : "⬜"}
            </button>

          </div>

        ))}

      </div>

      <div className="mt-8">

        <div className="flex justify-between mb-2">

          <span className="font-semibold">
            Workout Progress
          </span>

          <span className="font-bold text-green-600">
            {progress}%
          </span>

        </div>

        <div className="w-full bg-gray-200 rounded-full h-4">

          <div
            className="bg-green-500 h-4 rounded-full transition-all"
            style={{ width: `${progress}%` }}
          />

        </div>

        <p className="mt-3 text-sm text-gray-500">
          {completedCount} of {exercises.length} exercises completed
        </p>

      </div>

    </div>
  );
}