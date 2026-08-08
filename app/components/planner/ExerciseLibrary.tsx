"use client";

import { useState } from "react";
import { exercises } from "@/app/data/exercises";
import MuscleGroupList from "./MuscleGroupList";
import LibraryExerciseCard from "./LibraryExerciseCard";

export default function ExerciseLibrary() {
  const [selectedMuscle, setSelectedMuscle] = useState("Chest");

  const filteredExercises = exercises[selectedMuscle] || [];

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

      <h2 className="text-2xl font-bold text-slate-800">
        Exercise Library
      </h2>

      <p className="mt-2 text-slate-500">
        Browse exercises by muscle group
      </p>

      <div className="mt-6">
        <MuscleGroupList
          selected={selectedMuscle}
          onSelect={setSelectedMuscle}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
        {filteredExercises.map((exercise) => (
          <LibraryExerciseCard
            key={exercise.id}
            exercise={exercise}
          />
        ))}
      </div>
      
    </div>
  );
}