"use client";

import { useState } from "react";
import { useProgram } from "@/app/context/ProgramContext";
import WeekPlanner from "./WeekPlanner";

const weeks = [
  "Week 1",
  "Week 2",
  "Week 3",
  "Week 4",
  "Week 5",
  "Week 6",
  "Week 7",
  "Week 8",
  "Week 9",
  "Week 10",
  "Week 11",
  "Week 12",
];

export default function ProgramBuilder() {
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [saved, setSaved] = useState(false);

  const { saveProgram } = useProgram();

  function handleSaveProgram() {
    saveProgram();

    setSaved(true);

    setTimeout(() => {
      setSaved(false);
    }, 3000);
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between">

        <div>
          <h2 className="text-xl font-bold text-slate-800">
            📅 Program Builder
          </h2>

          <p className="text-sm text-slate-500">
            Build a complete 12-week workout program
          </p>
        </div>

        <div className="flex items-center gap-3">

          {saved && (
            <span className="text-sm font-medium text-green-600">
              ✓ Program Saved
            </span>
          )}

          <button
            type="button"
            onClick={handleSaveProgram}
            className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white hover:bg-green-700"
          >
            Save Program
          </button>

        </div>

      </div>

      {/* Weeks */}
      <div className="mt-6 flex flex-wrap gap-2">

        {weeks.map((week, index) => (
          <button
            key={week}
            type="button"
            onClick={() => setSelectedWeek(index)}
            className={`rounded-lg px-3 py-2 text-sm transition ${
              selectedWeek === index
                ? "bg-green-600 text-white"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {week}
          </button>
        ))}

      </div>

      {/* Current Week */}
      <div className="mt-6">

        <h3 className="mb-4 text-lg font-bold text-slate-800">
          {weeks[selectedWeek]}
        </h3>

        <WeekPlanner />

      </div>

    </section>
  );
}