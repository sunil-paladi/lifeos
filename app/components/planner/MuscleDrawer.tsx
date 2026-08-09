"use client";

import { useState } from "react";
import { ArrowLeft, Check, X } from "lucide-react";

import { useProgram } from "@/app/context/ProgramContext";
import { exercises } from "@/app/data/exercises";

interface Props {
  day: string;
  onClose: () => void;
}

const muscles = [
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Abs",
  "Cardio",
];

export default function MuscleDrawer({
  day,
  onClose,
}: Props) {
  const {
    workout,
    addMuscleGroup,
  } = useProgram();

  const existing =
    workout[day as keyof typeof workout] || [];

  const [selectedMuscle, setSelectedMuscle] =
    useState<string | null>(null);

  const [selectedExercises, setSelectedExercises] =
    useState<number[]>([]);

  function handleMuscleSelect(muscle: string) {
    setSelectedMuscle(muscle);
    setSelectedExercises([]);
  }

  function toggleExercise(exerciseId: number) {
    setSelectedExercises((current) =>
      current.includes(exerciseId)
        ? current.filter(
            (id) => id !== exerciseId
          )
        : [...current, exerciseId]
    );
  }

  function handleAddExercises() {
    if (
      !selectedMuscle ||
      selectedExercises.length === 0
    ) {
      return;
    }

    const alreadyExists = existing.some(
      (item) =>
        item.name === selectedMuscle
    );

    if (alreadyExists) {
      return;
    }

    const selectedExerciseData =
      exercises[selectedMuscle] || [];

    /*
     * Convert selected exercise IDs into
     * complete ProgramExercise objects.
     */
    const programExercises =
      selectedExercises
        .map((exerciseId) => {
          const exercise =
            selectedExerciseData.find(
              (item) =>
                item.id === exerciseId
            );

          if (!exercise) {
            return null;
          }

          return {
            id: exercise.id,
            sets: exercise.sets,
            reps: exercise.reps,
            rest: exercise.rest,
          };
        })
        .filter(
          (
            exercise
          ): exercise is {
            id: number;
            sets: number;
            reps: number;
            rest: number;
          } => exercise !== null
        );

    if (programExercises.length === 0) {
      return;
    }

    /*
     * Create the muscle group and its
     * exercises together.
     */
    addMuscleGroup(
      day as keyof typeof workout,
      {
        id: Date.now(),
        name: selectedMuscle,
        exercises: programExercises,
      }
    );

    /*
     * Close the drawer after saving.
     */
    setSelectedMuscle(null);
    setSelectedExercises([]);

    onClose();
  }

  const muscleExercises =
    selectedMuscle
      ? exercises[selectedMuscle] || []
      : [];

  return (
    <>
      {/* Background */}
      <div
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-[1px]"
        onClick={onClose}
      />

      {/* Center Modal */}
      <div
        className="absolute left-1/2 top-1/2 w-[calc(100%-32px)] max-w-md -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) =>
          event.stopPropagation()
        }
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
          <div className="flex items-center gap-3">
            {selectedMuscle && (
              <button
                type="button"
                onClick={() => {
                  setSelectedMuscle(null);
                  setSelectedExercises([]);
                }}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
              >
                <ArrowLeft size={17} />
              </button>
            )}

            <div>
              <h2 className="text-base font-bold text-slate-900">
                {selectedMuscle
                  ? selectedMuscle
                  : "Add Workout"}
              </h2>

              <p className="mt-0.5 text-[11px] text-slate-500">
                {selectedMuscle
                  ? `Choose exercises for ${day}`
                  : `Build ${day}'s workout`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto p-4">
          {!selectedMuscle ? (
            /* Muscle Groups */
            <div className="grid grid-cols-2 gap-2">
              {muscles.map((muscle) => {
                const alreadyAdded =
                  existing.some(
                    (item) =>
                      item.name === muscle
                  );

                return (
                  <button
                    key={muscle}
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() =>
                      handleMuscleSelect(
                        muscle
                      )
                    }
                    className={`flex items-center justify-between rounded-lg border px-3 py-3 text-left text-sm font-semibold transition ${
                      alreadyAdded
                        ? "cursor-not-allowed border-green-100 bg-green-50 text-green-600"
                        : "border-slate-200 bg-white text-slate-800 hover:border-green-400 hover:bg-green-50"
                    }`}
                  >
                    <span>{muscle}</span>

                    {alreadyAdded && (
                      <Check
                        size={15}
                        className="text-green-600"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            /* Exercises */
            <div>
              {muscleExercises.length === 0 ? (
                <div className="rounded-lg bg-slate-50 px-4 py-8 text-center">
                  <p className="text-sm font-semibold text-slate-700">
                    No exercises available
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    No exercises are currently
                    listed for this muscle group.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {muscleExercises.map(
                    (exercise) => {
                      const isSelected =
                        selectedExercises.includes(
                          exercise.id
                        );

                      return (
                        <button
                          key={exercise.id}
                          type="button"
                          onClick={() =>
                            toggleExercise(
                              exercise.id
                            )
                          }
                          className={`flex w-full items-center justify-between rounded-lg border px-3 py-3 text-left transition ${
                            isSelected
                              ? "border-green-500 bg-green-50"
                              : "border-slate-200 bg-white hover:border-green-300 hover:bg-slate-50"
                          }`}
                        >
                          <div>
                            <p className="text-sm font-semibold text-slate-900">
                              {exercise.name}
                            </p>

                            <p className="mt-0.5 text-[11px] text-slate-500">
                              {exercise.equipment} ·{" "}
                              {exercise.sets} sets ×{" "}
                              {exercise.reps} reps
                            </p>
                          </div>

                          <div
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${
                              isSelected
                                ? "border-green-600 bg-green-600 text-white"
                                : "border-slate-300 bg-white"
                            }`}
                          >
                            {isSelected && (
                              <Check size={14} />
                            )}
                          </div>
                        </button>
                      );
                    }
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        {selectedMuscle && (
          <div className="border-t border-slate-200 bg-white px-4 py-3">
            <button
              type="button"
              disabled={
                selectedExercises.length === 0
              }
              onClick={handleAddExercises}
              className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                selectedExercises.length > 0
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              {selectedExercises.length > 0
                ? `Add ${selectedExercises.length} Exercise${
                    selectedExercises.length > 1
                      ? "s"
                      : ""
                  }`
                : "Select Exercises"}
            </button>
          </div>
        )}
      </div>
    </>
  );
}