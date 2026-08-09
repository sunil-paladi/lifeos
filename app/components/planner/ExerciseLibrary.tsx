"use client";

import { useState } from "react";
import { exercises } from "@/app/data/exercises";
import MuscleGroupList from "./MuscleGroupList";
import LibraryExerciseCard from "./LibraryExerciseCard";

export default function ExerciseLibrary() {
  const [selectedMuscle, setSelectedMuscle] = useState("Chest");

  const filteredExercises = exercises[selectedMuscle] || [];

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
          onSelect={setSelectedMuscle}
        />
      </div>

      {/* Exercise Cards */}
      <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {filteredExercises.map((exercise) => (
          <LibraryExerciseCard
            key={exercise.id}
            exercise={exercise}
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