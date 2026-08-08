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
  sets: number;
  reps: number;
  rest: number;
}

interface Props {
  day: string;
  name: string;
  exerciseIds: ProgramExercise[];
}

export default function MuscleBadge({
  day,
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

  const muscleExercises = exercises[name] || [];

  const selectedExercises = exerciseIds
    .map((programExercise) => {
      const exercise = muscleExercises.find(
        (item) => item.id === programExercise.id
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
      day as keyof ReturnType<typeof useProgram>["workout"],
      name,
      ids
    );

    setExerciseOpen(false);
  }

  function removeExercise(id: number) {
    const updatedIds = exerciseIds
      .filter((exercise) => exercise.id !== id)
      .map((exercise) => exercise.id);

    addExercisesToMuscle(
      day as keyof ReturnType<typeof useProgram>["workout"],
      name,
      updatedIds
    );
  }

  function updateSettings(
    exerciseId: number,
    sets: number,
    reps: number,
    rest: number
  ) {
    updateExerciseSettings(
      day as keyof ReturnType<typeof useProgram>["workout"],
      name,
      exerciseId,
      {
        sets,
        reps,
        rest,
      }
    );

    setEditingExercise(null);
  }

  function moveExercise(
    exerciseId: number,
    direction: "up" | "down"
  ) {
    reorderExercise(
      day as keyof ReturnType<typeof useProgram>["workout"],
      name,
      exerciseId,
      direction
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
            onClick={() => setExerciseOpen(true)}
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
                { exercise, programExercise },
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

                      <p className="mt-1 text-xs text-slate-500">
                        {programExercise.sets} sets ×{" "}
                        {programExercise.reps} reps
                        {" • "}
                        Rest: {programExercise.rest}s
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
                        disabled={index === 0}
                        onClick={() =>
                          moveExercise(
                            exercise.id,
                            "up"
                          )
                        }
                        className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-30"
                        title="Move up"
                      >
                        <ChevronUp size={16} />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={
                          index ===
                          selectedExercises.length - 1
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
                        <ChevronDown size={16} />
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
                        <Settings size={16} />
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
                        <Trash2 size={16} />
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
            (exercise) => exercise.id
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

function ExerciseSettings({
  exercise,
  onSave,
}: {
  exercise: ProgramExercise;

  onSave: (
    id: number,
    sets: number,
    reps: number,
    rest: number
  ) => void;
}) {
  const [sets, setSets] =
    useState(exercise.sets);

  const [reps, setReps] =
    useState(exercise.reps);

  const [rest, setRest] =
    useState(exercise.rest);

  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3">

      <div className="grid grid-cols-3 gap-3">

        <label className="text-xs font-medium">
          Sets

          <input
            type="number"
            min="1"
            value={sets}
            onChange={(e) =>
              setSets(
                Number(e.target.value)
              )
            }
            className="mt-1 w-full rounded-lg border p-2"
          />
        </label>

        <label className="text-xs font-medium">
          Reps

          <input
            type="number"
            min="1"
            value={reps}
            onChange={(e) =>
              setReps(
                Number(e.target.value)
              )
            }
            className="mt-1 w-full rounded-lg border p-2"
          />
        </label>

        <label className="text-xs font-medium">
          Rest

          <input
            type="number"
            min="0"
            value={rest}
            onChange={(e) =>
              setRest(
                Number(e.target.value)
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
            sets,
            reps,
            rest
          )
        }
        className="mt-3 w-full rounded-lg bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700"
      >
        Save Settings
      </button>

    </div>
  );
}