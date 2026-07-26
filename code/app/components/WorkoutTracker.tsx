"use client";

import { useState } from "react";
import { exercises } from "../data/exercises";
import ExerciseCard  from "./ExerciseCard";
import { Exercise } from "../types/exercise";
import ExerciseDetails from "./ExerciseDetails";

export default function WorkoutTracker() {
  const [selectedWorkout, setSelectedWorkout] = useState("Chest");
  const [selectedExercise, setSelectedExercise] = useState<Exercise | null>(null);
  

  const [workouts, setWorkouts] = useState(exercises);

  function toggleExercise(id: number) {
    setWorkouts((prev) => ({
      ...prev,

      [selectedWorkout]:
        prev[selectedWorkout as keyof typeof prev].map((exercise) =>
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
    <div className="mt-6 rounded-xl bg-sky-200 p-6 shadow-lg">
      <h2 className="text-2xl font-semibold">
        🏋️ Workout Tracker
      </h2>

      <div className="mt-4">
        <label className="font-medium">
          Select Workout
        </label>

        <select
          className="mt-2 w-full rounded border p-2"
          value={selectedWorkout}
          onChange={(e) => setSelectedWorkout(e.target.value)}
        >
          {Object.keys(workouts).map((workout) => (
            <option key={workout} value={workout}>
              {workout}
            </option>
          ))}
        </select>
      </div>

      <ul className="mt-6 space-y-2">
        {workouts[selectedWorkout as keyof typeof workouts].map((exercise) => (
          <ExerciseCard
            key={exercise.id}
            exercise={exercise}
            toggleExercise={toggleExercise}
          />
        ))}
      </ul>

      <p className="mt-4 font-bold">
        Completed:{" "}
        {
          workouts[selectedWorkout as keyof typeof workouts]
            .filter((exercise) => exercise.completed).length
        }
        /
        {
          workouts[selectedWorkout as keyof typeof workouts].length
        }
      </p>
    </div>
  );
}