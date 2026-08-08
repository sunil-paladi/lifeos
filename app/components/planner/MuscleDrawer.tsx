"use client";

import { useState } from "react";
import { X } from "lucide-react";
import { useProgram } from "@/app/context/ProgramContext";

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
  const { workout, addMuscleGroup } = useProgram();

  const existing =
    workout[day as keyof typeof workout] || [];

  const [selected, setSelected] = useState<string[]>(
    existing.map((item) => item.name)
  );

  function toggleMuscle(muscle: string) {
    setSelected((current) =>
      current.includes(muscle)
        ? current.filter((item) => item !== muscle)
        : [...current, muscle]
    );
  }

  function handleSave() {
    // Save selected muscle groups
    selected.forEach((muscle, index) => {
      if (!existing.some((item) => item.name === muscle)) {
        addMuscleGroup(day as keyof typeof workout, {
          id: Date.now() + index,
          name: muscle,
          exercises: [],
        });
      }
    });

    // Close popup after saving
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[9999]">

      {/* Background */}
      <div
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />

      {/* Drawer */}
      <div
        className="absolute right-0 top-0 z-10 flex h-full w-full max-w-md flex-col bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >

        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-200 p-6">

          <div>
            <h2 className="text-xl font-bold text-slate-800">
              Add Muscle Groups
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              {day}
            </p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800"
          >
            <X size={22} />
          </button>

        </div>

        {/* Muscle Groups */}
        <div className="flex-1 overflow-y-auto p-6">

          <p className="mb-4 text-sm text-slate-500">
            Select one or more muscle groups.
          </p>

          <div className="space-y-3">

            {muscles.map((muscle) => {
              const isSelected = selected.includes(muscle);

              return (
                <button
                  key={muscle}
                  type="button"
                  onClick={() => toggleMuscle(muscle)}
                  className={`flex w-full items-center justify-between rounded-xl border p-4 text-left transition ${
                    isSelected
                      ? "border-green-500 bg-green-50"
                      : "border-slate-200 hover:bg-slate-50"
                  }`}
                >
                  <span className="font-medium text-slate-800">
                    {muscle}
                  </span>

                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-md border ${
                      isSelected
                        ? "border-green-600 bg-green-600 text-white"
                        : "border-slate-300 bg-white"
                    }`}
                  >
                    {isSelected ? "✓" : ""}
                  </span>
                </button>
              );
            })}

          </div>

        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 bg-white p-6">

          <button
            type="button"
            onClick={handleSave}
            className="w-full rounded-xl bg-green-600 py-3 font-semibold text-white hover:bg-green-700"
          >
            Save Muscle Groups
          </button>

        </div>

      </div>
    </div>
  );
}