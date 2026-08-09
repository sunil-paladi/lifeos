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
      <div className="rounded-lg border border-slate-200 bg-white p-3 shadow-sm transition hover:border-slate-300">
        {/* Day Header */}
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-bold text-slate-900">
            {day}
          </h3>

          <span
            className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
              muscleGroups.length > 0
                ? "bg-green-100 text-green-700"
                : "bg-slate-100 text-slate-600"
            }`}
          >
            {muscleGroups.length > 0
              ? `${muscleGroups.length} Muscle Groups`
              : "Rest"}
          </span>
        </div>

        {/* Muscle Groups */}
        {muscleGroups.length > 0 ? (
          <div className="mt-2 flex flex-wrap gap-1.5">
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
          <p className="mt-3 text-[11px] font-medium text-slate-500">
            No muscle groups added
          </p>
        )}

        {/* Add / Edit Button */}
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-700"
        >
          {muscleGroups.length > 0 ? (
            <>
              <Pencil size={14} />
              Edit Muscle Groups
            </>
          ) : (
            <>
              <Plus size={15} />
              Add Muscle Group
            </>
          )}
        </button>
      </div>

      {/* Muscle Drawer */}
      {drawerOpen && (
        <MuscleDrawer
          day={day}
          onClose={handleCloseDrawer}
        />
      )}
    </>
  );
}