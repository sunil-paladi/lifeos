"use client";

import { useState } from "react";
import {
  ChevronDown,
  Dumbbell,
  History,
} from "lucide-react";

import TodaysWorkout from "@/app/components/workout/TodaysWorkout";
import ProgramBuilder from "@/app/components/planner/ProgramBuilder";
import WorkoutHistory from "@/app/components/workout/WorkoutHistory";

type Section = "today" | "history";

export default function WorkoutPage() {
  const [openSection, setOpenSection] = useState<Section | null>(null);

  const toggleSection = (section: Section) => {
    setOpenSection((current) => (current === section ? null : section));
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Workout
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Your Workout
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Plan, complete and track your workouts.
        </p>
      </div>

      <ProgramBuilder />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection("today")}
          aria-expanded={openSection === "today"}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
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
              openSection === "today" ? "rotate-180" : ""
            }`}
          />
        </button>
        {openSection === "today" && (
          <div className="border-t border-slate-200 p-4 sm:p-6">
            <TodaysWorkout />
          </div>
        )}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection("history")}
          aria-expanded={openSection === "history"}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-orange-700">
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
              openSection === "history" ? "rotate-180" : ""
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
