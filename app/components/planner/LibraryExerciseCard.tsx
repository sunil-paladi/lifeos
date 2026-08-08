"use client";

import { Exercise } from "@/app/types/exercise";

interface Props {
  exercise: Exercise;
}

export default function LibraryExerciseCard({
  exercise,
}: Props) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm hover:border-green-500 transition">

      <h3 className="text-lg font-bold">
        {exercise.name}
      </h3>

      <div className="mt-3 space-y-1 text-sm text-slate-500">

        <p>💪 {exercise.primaryMuscle}</p>

        <p>🏋 {exercise.equipment}</p>

        <p>⭐ {exercise.difficulty}</p>

        <p>
          {exercise.sets} Sets × {exercise.reps} Reps
        </p>

      </div>

      <button className="mt-4 w-full rounded-lg bg-green-600 py-2 text-white hover:bg-green-700">
        Add Exercise
      </button>

    </div>
  );
}