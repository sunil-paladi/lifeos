"use client";

import { useState } from "react";
import {
  Plus,
  Trash2,
  Settings,
  ChevronUp,
  ChevronDown,
} from "lucide-react";

import ExerciseSelector from "./ExerciseSelector";
import { exercises } from "@/app/data/exercises";
import { useProgram } from "@/app/context/ProgramContext";

interface ProgramExercise {
  id: number;
  type?: "strength" | "cardio";

  // Strength
  sets?: number;
  reps?: number;
  rest?: number;

  // Cardio
  duration?: number;
}

interface Props {
  day: string;
  weekIndex: number;
  name: string;
  exerciseIds: ProgramExercise[];
}

export default function MuscleBadge({
  day,
  weekIndex,
  name,
  exerciseIds,
}: Props) {
  const [exerciseOpen, setExerciseOpen] =
    useState(false);

  const [editingExercise, setEditingExercise] =
    useState<number | null>(null);

  const {
    addExercisesToMuscle,
    updateExerciseSettings,
    reorderExercise,
  } = useProgram();

  const muscleExercises =
    exercises[name] || [];

  const selectedExercises = exerciseIds
    .map((programExercise) => {
      const exercise =
        muscleExercises.find(
          (item) =>
            item.id === programExercise.id
        );

      if (!exercise) {
        return null;
      }

      return {
        exercise,
        programExercise,
      };
    })
    .filter(
      (
        item
      ): item is {
        exercise: (typeof muscleExercises)[number];
        programExercise: ProgramExercise;
      } => item !== null
    );

  function handleSave(ids: number[]) {
    addExercisesToMuscle(
      day as keyof ReturnType<
        typeof useProgram
      >["workout"],
      name,
      ids,
      weekIndex
    );

    setExerciseOpen(false);
  }

  function removeExercise(id: number) {
    const updatedIds = exerciseIds
      .filter(
        (exercise) =>
          exercise.id !== id
      )
      .map(
        (exercise) => exercise.id
      );

    addExercisesToMuscle(
      day as keyof ReturnType<
        typeof useProgram
      >["workout"],
      name,
      updatedIds,
      weekIndex
    );
  }

  /*
   * Save exercise settings.
   *
   * Strength:
   *   sets / reps / rest
   *
   * Cardio:
   *   duration
   */
  function updateSettings(
    exerciseId: number,
    settings: {
      sets?: number;
      reps?: number;
      rest?: number;
      duration?: number;
    }
  ) {
    updateExerciseSettings(
      day as keyof ReturnType<
        typeof useProgram
      >["workout"],
      name,
      exerciseId,
      settings,
      weekIndex
    );

    setEditingExercise(null);
  }

  function moveExercise(
    exerciseId: number,
    direction: "up" | "down"
  ) {
    reorderExercise(
      day as keyof ReturnType<
        typeof useProgram
      >["workout"],
      name,
      exerciseId,
      direction,
      weekIndex
    );
  }

  return (
    <>
      <div className="w-full rounded-xl border border-slate-200 bg-slate-50 p-4">

        {/* Muscle Header */}
        <div className="flex items-center justify-between">
          <span className="font-medium text-slate-800">
            💪 {name}
          </span>

          <button
            type="button"
            onClick={() =>
              setExerciseOpen(true)
            }
            className="flex items-center gap-1 rounded-lg bg-green-600 px-3 py-1.5 text-sm text-white hover:bg-green-700"
          >
            <Plus size={15} />
            Edit Exercises
          </button>
        </div>

        {/* Exercises */}
        {selectedExercises.length > 0 && (
          <div className="mt-4 space-y-2">

            {selectedExercises.map(
              (
                {
                  exercise,
                  programExercise,
                },
                index
              ) => (
                <div
                  key={exercise.id}
                  className="rounded-lg border border-slate-200 bg-white p-3"
                >

                  <div className="flex items-start justify-between gap-3">

                    {/* Exercise Info */}
                    <div className="flex-1">

                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-400">
                          #{index + 1}
                        </span>

                        <p className="font-medium text-slate-800">
                          {exercise.name}
                        </p>
                      </div>

                      {/* Exercise Summary */}
                      <p className="mt-1 text-xs text-slate-500">

                        {programExercise.type ===
                        "cardio" ? (
                          <>
                            {programExercise.duration ??
                              0}{" "}
                            min
                          </>
                        ) : (
                          <>
                            {programExercise.sets ??
                              0}{" "}
                            sets ×{" "}
                            {programExercise.reps ??
                              0}{" "}
                            reps
                            {" • "}
                            Rest:{" "}
                            {programExercise.rest ??
                              0}
                            s
                          </>
                        )}

                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        {exercise.equipment}
                      </p>

                    </div>

                    {/* Controls */}
                    <div className="flex items-center gap-1">

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={
                          index === 0
                        }
                        onClick={() =>
                          moveExercise(
                            exercise.id,
                            "up"
                          )
                        }
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp
                          size={16}
                        />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={
                          index ===
                          selectedExercises.length -
                            1
                        }
                        onClick={() =>
                          moveExercise(
                            exercise.id,
                            "down"
                          )
                        }
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Move down"
                      >
                        <ChevronDown
                          size={16}
                        />
                      </button>

                      {/* Settings */}
                      <button
                        type="button"
                        onClick={() =>
                          setEditingExercise(
                            editingExercise ===
                              exercise.id
                              ? null
                              : exercise.id
                          )
                        }
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                        title="Customize"
                      >
                        <Settings
                          size={16}
                        />
                      </button>

                      {/* Remove */}
                      <button
                        type="button"
                        onClick={() =>
                          removeExercise(
                            exercise.id
                          )
                        }
                        className="rounded-lg p-2 text-red-500 hover:bg-red-50"
                        title="Remove exercise"
                      >
                        <Trash2
                          size={16}
                        />
                      </button>

                    </div>
                  </div>

                  {/* Settings */}
                  {editingExercise ===
                    exercise.id && (
                    <ExerciseSettings
                      exercise={
                        programExercise
                      }
                      isCardio={
                        programExercise.type ===
                        "cardio"
                      }
                      onSave={
                        updateSettings
                      }
                    />
                  )}

                </div>
              )
            )}

          </div>
        )}

      </div>

      {/* Exercise Selector */}
      {exerciseOpen && (
        <ExerciseSelector
          muscle={name}
          initialSelected={exerciseIds.map(
            (exercise) =>
              exercise.id
          )}
          onSave={handleSave}
          onClose={() =>
            setExerciseOpen(false)
          }
        />
      )}
    </>
  );
}

/* =========================================================
   EXERCISE SETTINGS
   ========================================================= */

function ExerciseSettings({
  exercise,
  isCardio,
  onSave,
}: {
  exercise: ProgramExercise;
  isCardio: boolean;

  onSave: (
    id: number,
    settings: {
      sets?: number;
      reps?: number;
      rest?: number;
      duration?: number;
    }
  ) => void;
}) {
  /* Strength */
  const [sets, setSets] =
    useState(
      exercise.sets ?? 3
    );

  const [reps, setReps] =
    useState(
      exercise.reps ?? 10
    );

  const [rest, setRest] =
    useState(
      exercise.rest ?? 60
    );

  /* Cardio */
  const [duration, setDuration] =
  useState(
    String(exercise.duration ?? 20)
  );

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">

      {/* =================================================
          CARDIO SETTINGS
          ================================================= */}
      {isCardio ? (
        <>
          <label className="block text-xs font-medium text-slate-700">
            Time (minutes)

            <input
  type="number"
  min="1"
  value={duration}
  onChange={(e) =>
    setDuration(e.target.value)
  }
  className="mt-1 w-full rounded-lg border p-2"
/>
          </label>

          <button
            type="button"
            onClick={() => {
  const value = Number(duration);

  if (value > 0) {
    onSave(exercise.id, {
      duration: value,
    });
  }
}}
            className="mt-3 w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Save Settings
          </button>
        </>
      ) : (

        /* =================================================
           STRENGTH SETTINGS
           ================================================= */
        <>
          <div className="grid grid-cols-3 gap-3">

            {/* Sets */}
            <label className="text-xs font-medium">
              Sets

              <input
                type="number"
                min="1"
                value={sets}
                onChange={(e) =>
                  setSets(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>

            {/* Reps */}
            <label className="text-xs font-medium">
              Reps

              <input
                type="number"
                min="1"
                value={reps}
                onChange={(e) =>
                  setReps(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>

            {/* Rest */}
            <label className="text-xs font-medium">
              Rest

              <input
                type="number"
                min="0"
                value={rest}
                onChange={(e) =>
                  setRest(
                    Number(
                      e.target.value
                    )
                  )
                }
                className="mt-1 w-full rounded-lg border p-2"
              />
            </label>

          </div>

          <button
            type="button"
            onClick={() =>
              onSave(
                exercise.id,
                {
                  sets,
                  reps,
                  rest,
                }
              )
            }
            className="mt-3 w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Save Settings
          </button>
        </>
      )}

    </div>
  );
}