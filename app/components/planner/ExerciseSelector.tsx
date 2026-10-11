"use client";

import { useState } from "react";
import ExerciseDetails from "@/app/components/ExerciseDetails";
import { exercises } from "@/app/data/exercises";
import type { Exercise } from "@/app/types/exercise";

interface Props {
  muscle: string;
  initialSelected?: number[];
  onSave: (exerciseIds: number[]) => void;
  onClose: () => void;
}

export default function ExerciseSelector({
  muscle,
  initialSelected = [],
  onSave,
  onClose,
}: Props) {
  const muscleExercises = exercises[muscle] || [];

  const [selected, setSelected] =
    useState<number[]>(initialSelected);
  const [exerciseForDetails, setExerciseForDetails] =
    useState<Exercise | null>(null);

  function toggleExercise(id: number) {
    setSelected((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    );
  }

  function handleSave() {
    onSave(selected);
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b px-6 py-5">
          <div>
            <h2 className="text-xl font-bold text-slate-900">
              Select Exercises
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {muscle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Exercise List */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="space-y-3">
            {muscleExercises.map((exercise) => {
              const isSelected = selected.includes(exercise.id);

              return (
                <div key={exercise.id} className="flex items-stretch gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExercise(exercise.id)}
                    className={`min-w-0 flex-1 rounded-xl border p-4 text-left transition ${
                      isSelected
                        ? "border-primary/30 bg-primary/10"
                        : "border-slate-200 bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-900">
                          {exercise.name}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {exercise.type === "cardio"
                            ? `${exercise.equipment} • ${exercise.duration ?? 0} min`
                            : `${exercise.equipment} • ${exercise.sets} sets × ${exercise.reps} reps`}
                        </p>
                      </div>

                      <span
                        className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md border text-sm font-bold ${
                          isSelected
                            ? "border-primary/30 bg-primary text-white"
                            : "border-slate-300 bg-white text-transparent"
                        }`}
                      >
                        ✓
                      </span>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setExerciseForDetails(exercise)}
                    className="shrink-0 self-center rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    aria-label={`View details for ${exercise.name}`}
                  >
                    Details
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-white px-6 py-4">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="text-slate-500">
              Selected
            </span>

            <span className="font-semibold text-slate-800">
              {selected.length} exercise
              {selected.length !== 1 ? "s" : ""}
            </span>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl bg-primary py-3 font-semibold text-white transition hover:bg-primary/90"
          >
            Save Exercises
          </button>
        </div>
      </div>
      {exerciseForDetails && (
        <ExerciseDetails
          key={exerciseForDetails.id}
          exercise={exerciseForDetails}
          onClose={() => setExerciseForDetails(null)}
        />
      )}
    </div>
  );
}
