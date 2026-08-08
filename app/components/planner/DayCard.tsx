"use client";

import { useState } from "react";
import { Plus, Pencil } from "lucide-react";
import MuscleDrawer from "./MuscleDrawer";
import MuscleBadge from "./MuscleBadge";
import { useProgram } from "@/app/context/ProgramContext";

interface Props {
  day: string;
}

export default function DayCard({ day }: Props) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  const { workout } = useProgram();

  const muscleGroups =
    workout[day as keyof typeof workout] || [];

  function handleCloseDrawer() {
    setDrawerOpen(false);
  }

  return (
    <>
      <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-slate-800">
            {day}
          </h3>

          <span
            className={`rounded-full px-2 py-1 text-xs ${
              muscleGroups.length > 0
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {muscleGroups.length > 0
              ? `${muscleGroups.length} Muscle Groups`
              : "Rest"}
          </span>
        </div>

        {muscleGroups.length > 0 ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {muscleGroups.map((muscle) => (
              <MuscleBadge
  key={muscle.id}
  day={day}
  name={muscle.name}
  exerciseIds={muscle.exercises}
/>
            ))}
          </div>
        ) : (
          <p className="mt-5 text-sm text-slate-500">
            No muscle groups added
          </p>
        )}

        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mt-5 flex w-full items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-white hover:bg-green-700"
        >
          {muscleGroups.length > 0 ? (
            <>
              <Pencil size={16} />
              Edit Muscle Groups
            </>
          ) : (
            <>
              <Plus size={18} />
              Add Muscle Group
            </>
          )}
        </button>

      </div>

      {drawerOpen && (
        <MuscleDrawer
          day={day}
          onClose={handleCloseDrawer}
        />
      )}
    </>
  );
}