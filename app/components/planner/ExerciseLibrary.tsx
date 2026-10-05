"use client";

import { useState } from "react";
import { exercises } from "@/app/data/exercises";
import { useProgram } from "@/app/context/ProgramContext";
import type { DayName } from "@/app/context/ProgramContext";
import type { Exercise } from "@/app/types/exercise";
import MuscleGroupList from "./MuscleGroupList";
import LibraryExerciseCard from "./LibraryExerciseCard";

const days: DayName[] = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface Props {
  initialWeekIndex?: number;
}

export default function ExerciseLibrary({
  initialWeekIndex = 0,
}: Props) {
  const [selectedMuscle, setSelectedMuscle] = useState("Chest");
  const [targetDay, setTargetDay] = useState<DayName | null>(null);
  const [targetWeekOverride, setTargetWeekOverride] =
    useState<number | null>(null);
  const targetWeek = targetWeekOverride ?? initialWeekIndex;
  const [message, setMessage] = useState<string | null>(null);
  const {
    weeks,
    saveStatus,
    getWorkoutForWeek,
    addMuscleGroup,
    addExercisesToMuscle,
  } = useProgram();

  const filteredExercises = exercises[selectedMuscle] || [];

  function addExercise(exercise: Exercise) {
    if (!targetDay) {
      setMessage("Choose a workout day before adding an exercise.");
      return;
    }

    if (saveStatus === "loading") {
      setMessage("Your program is still loading. Try again in a moment.");
      return;
    }

    const workout = getWorkoutForWeek(targetWeek);
    const muscleGroup = workout[targetDay].find(
      (muscle) => muscle.name === selectedMuscle
    );

    if (muscleGroup?.exercises.some((item) => item.id === exercise.id)) {
      setMessage(`${exercise.name} is already in ${selectedMuscle} for ${targetDay}.`);
      return;
    }

    if (muscleGroup) {
      addExercisesToMuscle(
        targetDay,
        selectedMuscle,
        [...muscleGroup.exercises.map((item) => item.id), exercise.id],
        targetWeek
      );
    } else {
      const programExercise =
        exercise.type === "cardio"
          ? {
            id: exercise.id,
            type: "cardio" as const,
            duration: exercise.duration ?? 20,
            rest: 0,
          }
          : {
            id: exercise.id,
            type: "strength" as const,
            sets: exercise.sets ?? 3,
            reps: exercise.reps ?? 10,
            rest: 60,
          };

      addMuscleGroup(
        targetDay,
        {
          id: Date.now(),
          name: selectedMuscle,
          exercises: [programExercise],
        },
        targetWeek
      );
    }

    setMessage(
      `Added ${exercise.name} to Week ${targetWeek + 1}, ${targetDay} (${selectedMuscle}).`
    );
  }

  return (
    <section>
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-slate-900">
          Exercise Library
        </h2>

        <p className="mt-0.5 text-xs font-medium text-slate-600">
          Browse exercises by muscle group
        </p>
      </div>

      {/* Muscle Groups */}
      <div className="mt-4">
        <MuscleGroupList
          selected={selectedMuscle}
          onSelect={(muscle) => {
            setSelectedMuscle(muscle);
            setMessage(null);
          }}
        />
      </div>

      {/* Program target */}
      <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3">
        <p className="text-xs font-semibold text-slate-800">
          Add exercises to your program
        </p>

        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="text-[11px] font-medium text-slate-600">
            Workout day
            <select
              value={targetDay ?? ""}
              onChange={(event) => {
                const day = days.find(
                  (candidate) => candidate === event.target.value
                ) ?? null;
                setTargetDay(day);
                setMessage(null);
              }}
              className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
            >
              <option value="">Select a day</option>
              {days.map((day) => (
                <option key={day} value={day}>
                  {day}
                </option>
              ))}
            </select>
          </label>

          <label className="text-[11px] font-medium text-slate-600">
            Program week
            <select
              value={targetWeek}
              onChange={(event) => {
                setTargetWeekOverride(Number(event.target.value));
                setMessage(null);
              }}
              className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2 text-xs text-slate-800"
            >
              {weeks.map((_, index) => (
                <option key={index} value={index}>
                  Week {index + 1}
                </option>
              ))}
            </select>
          </label>
        </div>

        <p className="mt-2 text-[11px] text-slate-500">
          Muscle group:{" "}
          <span className="font-semibold text-slate-700">
            {selectedMuscle}
          </span>
        </p>

        {message && (
          <p
            role="status"
            aria-live="polite"
            className="mt-2 text-xs font-medium text-slate-700"
          >
            {message}
          </p>
        )}
      </div>

      {/* Exercise Cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredExercises.map((exercise) => (
          <LibraryExerciseCard
            key={exercise.id}
            exercise={exercise}
            onAdd={addExercise}
          />
        ))}
      </div>

      {/* Empty State */}
      {filteredExercises.length === 0 && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-8 text-center">
          <p className="text-sm font-semibold text-slate-700">
            No exercises found
          </p>

          <p className="mt-1 text-xs text-slate-500">
            Try selecting another muscle group.
          </p>
        </div>
      )}
    </section>
  );
}