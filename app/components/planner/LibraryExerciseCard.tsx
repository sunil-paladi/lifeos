"use client";

import { Exercise } from "@/app/types/exercise";

interface Props {
  exercise: Exercise;
}

export default function LibraryExerciseCard({
  exercise,
}: Props) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-green-300 hover:shadow-md">
      {/* Exercise Name */}
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            {exercise.name}
          </h3>

          <p className="mt-0.5 text-[11px] font-medium text-slate-500">
            {exercise.primaryMuscle}
          </p>
        </div>

        <span className="shrink-0 rounded-md bg-green-50 px-2 py-1 text-[10px] font-semibold text-green-700">
          {exercise.difficulty}
        </span>
      </div>

      {/* Exercise Details */}
      <div className="mt-3 grid grid-cols-2 gap-2">
        <div className="rounded-md bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-medium text-slate-500">
            Equipment
          </p>

          <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
            {exercise.equipment}
          </p>
        </div>

        <div className="rounded-md bg-slate-50 px-2 py-1.5">
          <p className="text-[10px] font-medium text-slate-500">
            Target
          </p>

          <p className="mt-0.5 text-xs font-semibold text-slate-800">
            {exercise.sets} × {exercise.reps}
          </p>
        </div>
      </div>

      {/* Add Exercise */}
      <button
        type="button"
        className="mt-3 w-full rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
      >
        + Add Exercise
      </button>
    </div>
  );
}