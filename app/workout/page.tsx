"use client";

import { useEffect, useState } from "react";
import {
  ChevronDown,
  Dumbbell,
  History,
} from "lucide-react";

import { usePersistentDisclosure } from "@/app/hooks/usePersistentDisclosure";
import TodaysWorkout from "@/app/components/workout/TodaysWorkout";
import ProgramBuilder from "@/app/components/planner/ProgramBuilder";
import WorkoutPlanLibrary from "@/app/components/planner/WorkoutPlanLibrary";
import WorkoutHistory from "@/app/components/workout/WorkoutHistory";

export default function WorkoutPage() {
  const todayDisclosure = usePersistentDisclosure(
    "consistfit-workout-today-expanded",
    true,
  );
  const historyDisclosure = usePersistentDisclosure(
    "consistfit-workout-history-expanded",
    false,
  );
  const programDisclosure = usePersistentDisclosure(
    "consistfit-workout-program-builder-expanded",
    true,
  );
  const libraryDisclosure = usePersistentDisclosure(
    "consistfit-workout-plan-library-expanded",
    true,
  );
  const [activeSection, setActiveSection] = useState<
    "today" | "history" | "program" | "library" | null
  >(null);
  const [disclosuresInitialized, setDisclosuresInitialized] = useState(false);
  const [selectedWeek, setSelectedWeek] = useState(0);
  const disclosuresHydrated = [
    todayDisclosure.hydrated,
    historyDisclosure.hydrated,
    programDisclosure.hydrated,
    libraryDisclosure.hydrated,
  ].every(Boolean);

  useEffect(() => {
    if (!disclosuresHydrated || disclosuresInitialized) {
      return;
    }

    const savedSection = todayDisclosure.expanded
      ? "today"
      : programDisclosure.expanded
        ? "program"
        : libraryDisclosure.expanded
          ? "library"
          : historyDisclosure.expanded
            ? "history"
            : null;
    setActiveSection(savedSection);
    setDisclosuresInitialized(true);
  }, [
    disclosuresHydrated,
    disclosuresInitialized,
    historyDisclosure.expanded,
    libraryDisclosure.expanded,
    programDisclosure.expanded,
    todayDisclosure.expanded,
  ]);

  function toggleSection(
    section: "today" | "history" | "program" | "library",
  ) {
    const nextSection = activeSection === section ? null : section;
    todayDisclosure.setExpanded(nextSection === "today");
    historyDisclosure.setExpanded(nextSection === "history");
    programDisclosure.setExpanded(nextSection === "program");
    libraryDisclosure.setExpanded(nextSection === "library");
    setActiveSection(nextSection);
    setDisclosuresInitialized(true);
  }

  const todayExpanded = disclosuresInitialized && activeSection === "today";
  const historyExpanded = disclosuresInitialized && activeSection === "history";
  const programExpanded = disclosuresInitialized && activeSection === "program";
  const libraryExpanded = disclosuresInitialized && activeSection === "library";

  return (
    <div className="min-w-0 space-y-5">
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

      <section id="todays-workout" className="min-w-0 scroll-mt-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection("today")}
          aria-expanded={todayExpanded}
          aria-controls={todayExpanded ? "today-workout-panel" : undefined}
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
              <Dumbbell size={20} />
            </div>
            <div className="min-w-0">
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
              todayExpanded && todayDisclosure.hydrated ? "rotate-180" : ""
            }`}
          />
        </button>
        {todayExpanded && (
          <div id="today-workout-panel" className="min-w-0 border-t border-slate-200 p-3 sm:p-6">
            <TodaysWorkout />
          </div>
        )}
      </section>

      <ProgramBuilder
        selectedWeek={selectedWeek}
        setSelectedWeek={setSelectedWeek}
        disclosureExpanded={programExpanded}
        onDisclosureToggle={() => toggleSection("program")}
      />
      <WorkoutPlanLibrary
        selectedWeek={selectedWeek}
        onSelectedWeekChange={setSelectedWeek}
        disclosureExpanded={libraryExpanded}
        onDisclosureToggle={() => toggleSection("library")}
      />

      <section className="min-w-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <button
          type="button"
          onClick={() => toggleSection("history")}
          aria-expanded={historyExpanded}
          aria-controls={
            historyExpanded
              ? "workout-history-panel"
              : undefined
          }
          className="flex w-full items-center justify-between px-5 py-4 text-left transition hover:bg-slate-50"
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-secondary/20 text-orange-700">
              <History size={20} />
            </div>
            <div className="min-w-0">
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
              historyExpanded && historyDisclosure.hydrated ? "rotate-180" : ""
            }`}
          />
        </button>
        {historyExpanded && (
          <div id="workout-history-panel" className="min-w-0 border-t border-slate-200 p-3 sm:p-6">
            <WorkoutHistory />
          </div>
        )}
      </section>
    </div>
  );
}
