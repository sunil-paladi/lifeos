"use client";

import { useState } from "react";
import { exercises } from "@/app/data/exercises";

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
    <div className="fixed inset-0 z-[9999]">
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      <div
        className="absolute right-0 top-0 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b p-6">
          <div>
            <h2 className="text-xl font-bold">
              Select Exercises
            </h2>

            <p className="text-sm text-slate-500">
              {muscle}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 hover:bg-slate-100"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-3">
            {muscleExercises.map((exercise) => {
              const isSelected =
                selected.includes(exercise.id);

              return (
                <button
                  key={exercise.id}
                  type="button"
                  onClick={() =>
                    toggleExercise(exercise.id)
                  }
                  className={`w-full rounded-xl border p-4 text-left ${
                    isSelected
                      ? "border-green-500 bg-green-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">
                        {exercise.name}
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        {exercise.equipment} •{" "}
                        {exercise.sets} sets ×{" "}
                        {exercise.reps} reps
                      </p>
                    </div>

                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                        isSelected
                          ? "border-green-600 bg-green-600 text-white"
                          : "border-slate-300"
                      }`}
                    >
                      {isSelected ? "✓" : ""}
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="border-t p-6">
          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
          >
            Save Exercises
          </button>
        </div>
      </div>
    </div>
  );
}