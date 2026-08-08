"use client";

import { useState } from "react";
import { Check, Cloud, Loader2 } from "lucide-react";

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
  const [selectedWeek, setSelectedWeek] =
    useState(0);

  const { saveStatus } = useProgram();

  return (
    <section>

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

        {/* Auto-save Status */}
        <div className="flex items-center gap-2 text-sm">

          {saveStatus === "loading" && (
            <>
              <Loader2
                size={15}
                className="animate-spin text-slate-400"
              />

              <span className="text-slate-400">
                Loading...
              </span>
            </>
          )}

          {saveStatus === "saving" && (
            <>
              <Cloud
                size={15}
                className="text-slate-500"
              />

              <span className="text-slate-500">
                Saving...
              </span>
            </>
          )}

          {saveStatus === "saved" && (
            <>
              <Check
                size={15}
                className="text-green-600"
              />

              <span className="text-green-600">
                Saved
              </span>
            </>
          )}

          {saveStatus === "error" && (
            <span className="text-red-600">
              Save failed
            </span>
          )}

        </div>

      </div>

      {/* Weeks */}
      <div className="mt-6 flex flex-wrap gap-2">

        {weeks.map((week, index) => (
          <button
            key={week}
            type="button"
            onClick={() =>
              setSelectedWeek(index)
            }
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