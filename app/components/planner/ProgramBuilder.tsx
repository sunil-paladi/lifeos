"use client";

import { useState } from "react";
import {
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Cloud,
  Loader2,
} from "lucide-react";

import { useProgram } from "@/app/context/ProgramContext";
import WeekPlanner from "./WeekPlanner";

const durationOptions = [
  4,
  6,
  8,
  12,
  16,
  24,
  32,
];

export default function ProgramBuilder() {
  const [durationWeeks, setDurationWeeks] = useState(12);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const [showDurationMenu, setShowDurationMenu] =
    useState(false);

  const { saveStatus } = useProgram();

  const currentWeekNumber = selectedWeek + 1;

  function handleDurationChange(weeks: number) {
    setDurationWeeks(weeks);

    setSelectedWeek((current) =>
      Math.min(current, weeks - 1)
    );

    setShowDurationMenu(false);
  }

  function goToPreviousWeek() {
    setSelectedWeek((current) =>
      Math.max(current - 1, 0)
    );
  }

  function goToNextWeek() {
    setSelectedWeek((current) =>
      Math.min(current + 1, durationWeeks - 1)
    );
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">

      {/* Header */}
      <div className="flex items-center justify-between gap-3">

        <div className="flex items-center gap-2.5">

          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
            <span className="text-base">📅</span>
          </div>

          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Program Builder
            </h2>

            <p className="text-[11px] font-medium text-slate-500">
              Build your workout program
            </p>
          </div>

        </div>

        {/* Save Status */}
        <div className="flex shrink-0 items-center gap-1 text-[11px]">

          {saveStatus === "loading" && (
            <>
              <Loader2
                size={12}
                className="animate-spin text-slate-500"
              />
              <span className="font-medium text-slate-500">
                Loading...
              </span>
            </>
          )}

          {saveStatus === "saving" && (
            <>
              <Cloud
                size={12}
                className="text-slate-500"
              />
              <span className="font-medium text-slate-500">
                Saving...
              </span>
            </>
          )}

          {saveStatus === "saved" && (
            <>
              <Check
                size={12}
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

      {/* Duration */}
      <div className="mt-3 flex items-center justify-between gap-3">

        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">
            Program Duration
          </p>

          <p className="text-[11px] font-medium text-slate-600">
            Choose program length
          </p>
        </div>

        {/* Duration Dropdown */}
        <div className="relative">

          <button
            type="button"
            onClick={() =>
              setShowDurationMenu(
                (current) => !current
              )
            }
            className="flex min-w-[125px] items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-sm transition hover:bg-slate-50"
          >
            <span>{durationWeeks} Weeks</span>

            <ChevronDown
              size={14}
              className={`text-slate-400 transition-transform ${
                showDurationMenu
                  ? "rotate-180"
                  : ""
              }`}
            />
          </button>

          {showDurationMenu && (
            <div className="absolute right-0 top-full z-30 mt-1.5 w-[130px] overflow-hidden rounded-lg border border-slate-200 bg-white p-1 shadow-xl">

              {durationOptions.map((weeks) => (
                <button
                  key={weeks}
                  type="button"
                  onClick={() =>
                    handleDurationChange(weeks)
                  }
                  className={`flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs transition ${
                    durationWeeks === weeks
                      ? "bg-green-50 font-semibold text-green-700"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  <span>{weeks} Weeks</span>

                  {durationWeeks === weeks && (
                    <Check
                      size={13}
                      className="text-green-600"
                    />
                  )}
                </button>
              ))}

              <div className="my-1 border-t border-slate-100" />

              <button
                type="button"
                onClick={() =>
                  setShowDurationMenu(false)
                }
                className="w-full rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-500 hover:bg-slate-50"
              >
                Custom...
              </button>

            </div>
          )}

        </div>
      </div>

      {/* Compact Week Navigation */}
      <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-2">

        <div className="flex items-center justify-between">

          {/* Previous */}
          <button
            type="button"
            onClick={goToPreviousWeek}
            disabled={selectedWeek === 0}
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronLeft size={15} />
          </button>

          {/* Current Week */}
          <div className="text-center leading-tight">

            <span className="text-[9px] font-semibold uppercase tracking-wider text-slate-400">
              Current Week
            </span>

            <div className="flex items-baseline justify-center gap-1">
              <span className="text-sm font-bold text-slate-900">
                Week {currentWeekNumber}
              </span>

              <span className="text-[10px] font-medium text-slate-500">
                / {durationWeeks}
              </span>
            </div>

          </div>

          {/* Next */}
          <button
            type="button"
            onClick={goToNextWeek}
            disabled={
              selectedWeek === durationWeeks - 1
            }
            className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-35"
          >
            <ChevronRight size={15} />
          </button>

        </div>

        {/* Week Progress */}
        <div className="mt-2 flex items-center gap-1">
          {Array.from({
            length: durationWeeks,
          }).map((_, index) => {

            const isActive =
              index === selectedWeek;

            const isCompleted =
              index < selectedWeek;

            return (
              <button
                key={index}
                type="button"
                aria-label={`Go to Week ${
                  index + 1
                }`}
                onClick={() =>
                  setSelectedWeek(index)
                }
                className={`h-1 flex-1 rounded-full transition ${
                  isActive
                    ? "bg-green-600"
                    : isCompleted
                    ? "bg-green-200"
                    : "bg-slate-200"
                }`}
              />
            );
          })}
        </div>

      </div>

      {/* Current Week */}
      <div className="mt-3">

        <div className="mb-2 flex items-center justify-between">

          <div>
            <h3 className="text-sm font-bold text-slate-900">
              Week {currentWeekNumber}
            </h3>

            <p className="text-[10px] font-medium text-slate-500">
              Plan your workouts for this week
            </p>
          </div>

          <span className="rounded-full bg-slate-100 px-2 py-1 text-[9px] font-semibold text-slate-600">
            {durationWeeks}-week program
          </span>

        </div>

        {/* Existing Week Planner */}
        <WeekPlanner weekIndex={selectedWeek} />

      </div>

    </section>
  );
}