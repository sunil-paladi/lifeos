"use client";

import { useState } from "react";
import {
  ArrowLeft,
  Check,
  Trash2,
  X,
} from "lucide-react";

import { useProgram } from "@/app/context/ProgramContext";
import { exercises } from "@/app/data/exercises";

interface Props {
  day: string;
  weekIndex: number;
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
  weekIndex,
  onClose,
}: Props) {
  const {
    getWorkoutForWeek,
    addMuscleGroup,
    addExercisesToMuscle,
    removeMuscleGroup,
  } = useProgram();

  /*
   * Get the exact workout for:
   *
   * Week + Day
   */
  const workout =
    getWorkoutForWeek(weekIndex);

  const existing =
    workout[
      day as keyof typeof workout
    ] || [];

  const [selectedMuscle, setSelectedMuscle] =
    useState<string | null>(null);

  const [selectedExercises, setSelectedExercises] =
    useState<number[]>([]);

  /*
   * Whether we are adding a completely
   * new muscle group or editing an
   * existing one.
   */
  const [isEditing, setIsEditing] =
    useState(false);

  /* =====================================================
     SELECT MUSCLE
     ===================================================== */

  function handleMuscleSelect(
    muscle: string
  ) {
    const existingMuscle =
      existing.find(
        (item) => item.name === muscle
      );

    setSelectedMuscle(muscle);

    /*
     * If the muscle already exists,
     * load its current exercises.
     */
    if (existingMuscle) {
      setIsEditing(true);

      setSelectedExercises(
        (existingMuscle.exercises || []).map(
          (exercise) => exercise.id
        )
      );
    } else {
      /*
       * New muscle group.
       */
      setIsEditing(false);
      setSelectedExercises([]);
    }
  }

  /* =====================================================
     BACK TO MUSCLE LIST
     ===================================================== */

  function handleBack() {
    setSelectedMuscle(null);
    setSelectedExercises([]);
    setIsEditing(false);
  }

  /* =====================================================
     TOGGLE EXERCISE
     ===================================================== */

  function toggleExercise(
    exerciseId: number
  ) {
    setSelectedExercises((current) =>
      current.includes(exerciseId)
        ? current.filter(
            (id) => id !== exerciseId
          )
        : [...current, exerciseId]
    );
  }

  /* =====================================================
     SAVE EXERCISES
     ===================================================== */

  function handleSaveExercises() {
    if (!selectedMuscle) {
      return;
    }

    if (
      selectedExercises.length === 0
    ) {
      return;
    }

    /*
     * ---------------------------------------------------
     * EDIT EXISTING MUSCLE
     * ---------------------------------------------------
     */

    if (isEditing) {
      addExercisesToMuscle(
        day as keyof typeof workout,
        selectedMuscle,
        selectedExercises,
        weekIndex
      );

      handleBack();
      return;
    }

    /*
     * ---------------------------------------------------
     * ADD NEW MUSCLE
     * ---------------------------------------------------
     */

    const selectedExerciseData =
      exercises[selectedMuscle] || [];

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
            rest: 60, // Default rest time for a newly added exercise
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

    if (
      programExercises.length === 0
    ) {
      return;
    }

    addMuscleGroup(
      day as keyof typeof workout,
      {
        id: Date.now(),
        name: selectedMuscle,
        exercises: programExercises,
      },
      weekIndex
    );

    handleBack();
  }

  /* =====================================================
     DELETE MUSCLE GROUP
     ===================================================== */

  function handleDeleteMuscle(
    muscleName: string
  ) {
    const confirmed =
      window.confirm(
        `Remove ${muscleName} from ${day}'s workout?`
      );

    if (!confirmed) {
      return;
    }

    removeMuscleGroup(
      day as keyof typeof workout,
      muscleName,
      weekIndex
    );

    /*
     * If the muscle being deleted is
     * currently open, return to the list.
     */
    if (
      selectedMuscle === muscleName
    ) {
      handleBack();
    }
  }

  /* =====================================================
     EXERCISES FOR SELECTED MUSCLE
     ===================================================== */

  const muscleExercises =
    selectedMuscle
      ? exercises[selectedMuscle] || []
      : [];

  /* =====================================================
     RENDER
     ===================================================== */

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

        {/* =================================================
            HEADER
            ================================================= */}

        <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">

          <div className="flex items-center gap-3">

            {selectedMuscle && (
              <button
                type="button"
                onClick={handleBack}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
              >
                <ArrowLeft size={17} />
              </button>
            )}

            <div>

              <h2 className="text-base font-bold text-slate-900">
                {selectedMuscle
                  ? selectedMuscle
                  : "Edit Workout"}
              </h2>

              <p className="mt-0.5 text-[11px] text-slate-500">
                {selectedMuscle
                  ? isEditing
                    ? `Edit exercises for ${day}`
                    : `Choose exercises for ${day}`
                  : `Week ${
                      weekIndex + 1
                    } · ${day}`}
              </p>

            </div>

          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={18} />
          </button>

        </div>

        {/* =================================================
            CONTENT
            ================================================= */}

        <div className="max-h-[60vh] overflow-y-auto p-4">

          {!selectedMuscle ? (

            /* =================================================
               MUSCLE GROUP LIST
               ================================================= */

            <div>

              <div className="mb-3">

                <p className="text-xs font-semibold text-slate-700">
                  Muscle Groups
                </p>

                <p className="mt-0.5 text-[11px] text-slate-500">
                  Select a muscle group to add or edit
                  exercises.
                </p>

              </div>

              <div className="grid grid-cols-2 gap-2">

                {muscles.map((muscle) => {

                  const existingMuscle =
                    existing.find(
                      (item) =>
                        item.name === muscle
                    );

                  const alreadyAdded =
                    !!existingMuscle;

                  return (
                    <div
                      key={muscle}
                      className={`flex items-center gap-1 rounded-lg border transition ${
                        alreadyAdded
                          ? "border-green-200 bg-green-50"
                          : "border-slate-200 bg-white hover:border-green-300 hover:bg-green-50"
                      }`}
                    >

                      {/* Muscle Button */}
                      <button
                        type="button"
                        onClick={() =>
                          handleMuscleSelect(
                            muscle
                          )
                        }
                        className="flex min-w-0 flex-1 items-center justify-between px-3 py-3 text-left"
                      >

                        <div className="min-w-0">

                          <p
                            className={`truncate text-sm font-semibold ${
                              alreadyAdded
                                ? "text-green-700"
                                : "text-slate-800"
                            }`}
                          >
                            {muscle}
                          </p>

                          {alreadyAdded && (
                            <p className="mt-0.5 text-[9px] font-medium text-green-600">
                              {
                                existingMuscle
                                  ?.exercises
                                  ?.length
                              }{" "}
                              exercise
                              {(
                                existingMuscle
                                  ?.exercises
                                  ?.length ||
                                0
                              ) !== 1
                                ? "s"
                                : ""}
                            </p>
                          )}

                        </div>

                        {alreadyAdded && (
                          <Check
                            size={15}
                            className="shrink-0 text-green-600"
                          />
                        )}

                      </button>

                      {/* Delete Button */}
                      {alreadyAdded && (
                        <button
                          type="button"
                          title={`Delete ${muscle}`}
                          onClick={() =>
                            handleDeleteMuscle(
                              muscle
                            )
                          }
                          className="mr-1.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}

                    </div>
                  );
                })}

              </div>

            </div>

          ) : (

            /* =================================================
               EXERCISE SELECTION
               ================================================= */

            <div>

              {isEditing && (
                <div className="mb-3 rounded-lg border border-green-100 bg-green-50 px-3 py-2">

                  <p className="text-[11px] font-semibold text-green-700">
                    Editing {selectedMuscle}
                  </p>

                  <p className="mt-0.5 text-[10px] text-green-600">
                    Select or remove exercises, then
                    save your changes.
                  </p>

                </div>
              )}

              {muscleExercises.length ===
              0 ? (

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

        {/* =================================================
            FOOTER
            ================================================= */}

        {selectedMuscle && (
          <div className="border-t border-slate-200 bg-white px-4 py-3">

            <button
              type="button"
              disabled={
                selectedExercises.length === 0
              }
              onClick={
                handleSaveExercises
              }
              className={`w-full rounded-lg py-2.5 text-sm font-semibold transition ${
                selectedExercises.length > 0
                  ? "bg-green-600 text-white hover:bg-green-700"
                  : "cursor-not-allowed bg-slate-100 text-slate-400"
              }`}
            >
              {isEditing
                ? selectedExercises.length >
                  0
                  ? "Save Exercise Changes"
                  : "Select Exercises"
                : selectedExercises.length >
                  0
                ? `Add ${
                    selectedExercises.length
                  } Exercise${
                    selectedExercises.length >
                    1
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