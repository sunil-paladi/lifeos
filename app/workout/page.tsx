"use client";

import { useState } from "react";
import {
  ChevronDown,
  Dumbbell,
  Library,
  CalendarDays,
  History,
} from "lucide-react";

import TodaysWorkout from "@/app/components/workout/TodaysWorkout";
import ProgramBuilder from "@/app/components/planner/ProgramBuilder";
import ExerciseLibrary from "@/app/components/planner/ExerciseLibrary";
import WorkoutHistory from "@/app/components/workout/WorkoutHistory";

type Section = "today" | "program" | "library" | "history";

export default function WorkoutPage() {
  const [openSection, setOpenSection] =
    useState<Section | null>(null);

  const toggleSection = (section: Section) => {
    setOpenSection((current) =>
      current === section ? null : section
    );
  };
  
  return (
    <div className="space-y-6">

      {/* Page Header */}
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-green-600">
          Workout
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Your Workout
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Plan, complete and track your workouts.
        </p>
      </div>

      {/* ========================================= */}
      {/* TODAY'S WORKOUT */}
      {/* ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <button
          type="button"
          onClick={() => toggleSection("today")}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-green-50 text-green-600">
              <Dumbbell size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Today&apos;s Workout
              </h2>

              <p className="text-sm text-slate-500">
                Complete today&apos;s training session
              </p>
            </div>

          </div>

          <ChevronDown
            size={20}
            className={`text-slate-400 transition-transform ${
              openSection === "today"
                ? "rotate-180"
                : ""
            }`}
          />
        </button>

        {openSection === "today" && (
          <div className="border-t border-slate-200 p-4 sm:p-6">
            <TodaysWorkout />
          </div>
        )}

      </section>

      {/* ========================================= */}
      {/* PROGRAM BUILDER */}
      {/* ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <button
          type="button"
          onClick={() => toggleSection("program")}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <CalendarDays size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Program Builder
              </h2>

              <p className="text-sm text-slate-500">
                Build and manage your 12-week workout program
              </p>
            </div>

          </div>

          <ChevronDown
            size={20}
            className={`text-slate-400 transition-transform ${
              openSection === "program"
                ? "rotate-180"
                : ""
            }`}
          />

        </button>

        {openSection === "program" && (
          <div className="border-t border-slate-200 p-4 sm:p-6">
            <ProgramBuilder />
          </div>
        )}

      </section>

      {/* ========================================= */}
      {/* EXERCISE LIBRARY */}
      {/* ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <button
          type="button"
          onClick={() => toggleSection("library")}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
        >

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600">
              <Library size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Exercise Library
              </h2>

              <p className="text-sm text-slate-500">
                Browse exercises by muscle group
              </p>
            </div>

          </div>

          <ChevronDown
            size={20}
            className={`text-slate-400 transition-transform ${
              openSection === "library"
                ? "rotate-180"
                : ""
            }`}
          />

        </button>

        {openSection === "library" && (
          <div className="border-t border-slate-200 p-4 sm:p-6">
            <ExerciseLibrary />
          </div>
        )}

      </section>

      {/* ========================================= */}
      {/* WORKOUT HISTORY */}
      {/* ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        <button
          type="button"
          onClick={() => toggleSection("history")}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
        >

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
              <History size={20} />
            </div>

            <div>
              <h2 className="font-semibold text-slate-900">
                Workout History
              </h2>

              <p className="text-sm text-slate-500">
                Review your completed workout sessions
              </p>
            </div>

          </div>

          <ChevronDown
            size={20}
            className={`text-slate-400 transition-transform ${
              openSection === "history"
                ? "rotate-180"
                : ""
            }`}
          />

        </button>

        {openSection === "history" && (
          <div className="border-t border-slate-200 p-4 sm:p-6">
            <WorkoutHistory />
          </div>
        )}

      </section>

    </div>
  );
}