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
  const [selectedWeek, setSelectedWeek] = useState(0);

  const { saveStatus } = useProgram();

  return (
    <section>
      {/* Header */}
      <div className="flex items-center justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-slate-900">
            📅 Program Builder
          </h2>

          <p className="mt-0.5 text-xs font-medium text-slate-600">
            Build a complete 12-week workout program
          </p>
        </div>

        {/* Auto-save Status */}
        <div className="flex shrink-0 items-center gap-1.5 text-xs">
          {saveStatus === "loading" && (
            <>
              <Loader2
                size={14}
                className="animate-spin text-slate-500"
              />

              <span className="font-medium text-slate-600">
                Loading...
              </span>
            </>
          )}

          {saveStatus === "saving" && (
            <>
              <Cloud
                size={14}
                className="text-slate-600"
              />

              <span className="font-medium text-slate-600">
                Saving...
              </span>
            </>
          )}

          {saveStatus === "saved" && (
            <>
              <Check
                size={14}
                className="text-green-600"
              />

              <span className="font-semibold text-green-600">
                Saved
              </span>
            </>
          )}

          {saveStatus === "error" && (
            <span className="font-semibold text-red-600">
              Save failed
            </span>
          )}
        </div>
      </div>

      {/* Weeks */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        {weeks.map((week, index) => (
          <button
            key={week}
            type="button"
            onClick={() => setSelectedWeek(index)}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition ${
              selectedWeek === index
                ? "bg-green-600 text-white shadow-sm"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200"
            }`}
          >
            {week}
          </button>
        ))}
      </div>

      {/* Current Week */}
      <div className="mt-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-bold text-slate-900">
            {weeks[selectedWeek]}
          </h3>

          <span className="text-[11px] font-medium text-slate-500">
            12-week program
          </span>
        </div>

        <WeekPlanner />
      </div>
    </section>
  );
}