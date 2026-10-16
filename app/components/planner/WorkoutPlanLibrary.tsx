"use client";

import { useEffect, useState } from "react";
import { BookOpen, ChevronDown, Loader2 } from "lucide-react";
import { useProgram } from "@/app/context/ProgramContext";
import { usePersistentDisclosure } from "@/app/hooks/usePersistentDisclosure";
import {
  filterWorkoutPlans,
  type WorkoutPlanFilters,
  type WorkoutPlanPreview,
} from "@/app/lib/workout-plan-library";

export default function WorkoutPlanLibrary() {
  const { trainingPlanId, refreshProgram } = useProgram();
  const {
    expanded,
    hydrated: disclosureHydrated,
    setExpanded,
  } = usePersistentDisclosure("consistfit-workout-plan-library-expanded", true);
  const [plans, setPlans] = useState<WorkoutPlanPreview[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<WorkoutPlanPreview | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [goalFilter, setGoalFilter] = useState<WorkoutPlanFilters["goal"] | "">("");
  const [experienceFilter, setExperienceFilter] = useState<
    WorkoutPlanFilters["experienceLevel"] | ""
  >("");
  const [locationFilter, setLocationFilter] = useState<
    WorkoutPlanFilters["location"] | ""
  >("");
  const [daysFilter, setDaysFilter] = useState<number | "">("");

  useEffect(() => {
    const controller = new AbortController();

    async function loadPlans() {
      try {
        const response = await fetch("/api/workout-plans/library", {
          signal: controller.signal,
        });
        const data = await response.json().catch(() => null) as
          | { error?: string; plans?: WorkoutPlanPreview[] }
          | null;
        if (!response.ok || !Array.isArray(data?.plans)) {
          throw new Error(data?.error || "Failed to load workout plans.");
        }
        setPlans(data.plans);
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setMessage(error instanceof Error ? error.message : "Failed to load workout plans.");
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }

    void loadPlans();
    return () => controller.abort();
  }, []);

  async function applySelectedPlan() {
    if (!trainingPlanId || !selectedPlan) {
      return;
    }

    setBusy(true);
    setMessage(null);
    try {
      const response = await fetch(
        `/api/training-plans/${trainingPlanId}/workout-plan-library`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ planTemplateId: selectedPlan.id }),
        },
      );
      const data = await response.json().catch(() => null) as
        | {
            error?: string;
            success?: boolean;
            planId?: string;
            trainingPlanId?: string;
            savedDays?: string[];
            savedWeeks?: number;
            savedExercises?: number;
            workout?: WorkoutPlanPreview["workout"];
          }
        | null;
      if (!response.ok) {
        throw new Error(data?.error || "Failed to apply workout plan.");
      }

      const expectedExerciseCount =
        selectedPlan.workout.days.reduce(
          (count, day) => count + day.exercises.length,
          0,
        ) * (typeof data?.savedWeeks === "number" ? data.savedWeeks : 0);
      const expectedDays = selectedPlan.workout.days.map(({ day }) => day);
      if (
        !data?.success ||
        data.planId !== trainingPlanId ||
        data.trainingPlanId !== trainingPlanId ||
        !Array.isArray(data.savedDays) ||
        expectedDays.some((day) => !data.savedDays?.includes(day)) ||
        data.savedDays.length !== expectedDays.length ||
        typeof data.savedWeeks !== "number" ||
        !Number.isInteger(data.savedWeeks) ||
        data.savedWeeks < 1 ||
        data.savedExercises !== expectedExerciseCount ||
        !data.workout ||
        JSON.stringify(data.workout) !== JSON.stringify(selectedPlan.workout)
      ) {
        throw new Error("The applied plan could not be confirmed. Reload and check the workout plan.");
      }

      await refreshProgram(trainingPlanId, selectedPlan.workout, data.savedWeeks);
      setMessage("Workout plan applied and the planner was refreshed.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to apply workout plan.");
    } finally {
      setBusy(false);
    }
  }

  const filteredPlans = filterWorkoutPlans(plans, {
    goal: goalFilter || undefined,
    experienceLevel: experienceFilter || undefined,
    location: locationFilter || undefined,
    daysPerWeek: daysFilter || undefined,
  });

  return (
    <section className="w-full min-w-0 max-w-full rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
      <button
        type="button"
        aria-expanded={expanded && disclosureHydrated}
        aria-controls="workout-plan-library-content"
        aria-label={
          !disclosureHydrated || !expanded
            ? "Expand Browse Workout Plans"
            : "Collapse Browse Workout Plans"
        }
        onClick={() => setExpanded(!expanded)}
        className="flex min-h-11 w-full items-center justify-between gap-3 rounded-md px-2 py-1 text-left transition hover:bg-slate-50"
      >
        <div className="flex min-w-0 items-center gap-2">
          <BookOpen size={17} className="shrink-0 text-primary" />
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900">Browse Workout Plans</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Preview an approved plan before applying it to your weekly planner.
            </p>
          </div>
        </div>
        <ChevronDown
          size={20}
          className={`shrink-0 text-slate-400 transition-transform ${
            expanded && disclosureHydrated ? "rotate-180" : ""
          }`}
        />
      </button>

      <div id="workout-plan-library-content" hidden={!disclosureHydrated || !expanded}>
      {loading && (
        <p className="mt-4 flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={14} className="animate-spin" /> Loading workout plans...
        </p>
      )}

      {!loading && plans.length > 0 && (
        <div className="mt-4 min-w-0">
          <div className="rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setFiltersOpen((open) => !open)}
              aria-expanded={filtersOpen}
              className="flex min-h-11 w-full items-center justify-between gap-2 px-3 text-left text-sm font-semibold text-slate-800"
            >
              <span>Filter plans</span>
              <ChevronDown
                size={16}
                className={`shrink-0 transition-transform ${filtersOpen ? "rotate-180" : ""}`}
              />
            </button>
            {filtersOpen && (
              <div className="grid grid-cols-1 gap-2 border-t border-slate-200 p-3 min-[400px]:grid-cols-2 lg:grid-cols-4">
                <label className="min-w-0 text-xs font-medium text-slate-600">
                  Goal
                  <select
                    value={goalFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setGoalFilter(plans.find((plan) => plan.goal === value)?.goal ?? "");
                    }}
                    className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                  >
                    <option value="">All goals</option>
                    {[...new Set(plans.map(({ goal }) => goal))].map((goal) => (
                      <option key={goal} value={goal}>{goal}</option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0 text-xs font-medium text-slate-600">
                  Experience
                  <select
                    value={experienceFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setExperienceFilter(
                        plans.flatMap(({ experienceLevels }) => experienceLevels)
                          .find((level) => level === value) ?? "",
                      );
                    }}
                    className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                  >
                    <option value="">All levels</option>
                    {[...new Set(plans.flatMap(({ experienceLevels }) => experienceLevels))]
                      .map((level) => <option key={level} value={level}>{level}</option>)}
                  </select>
                </label>
                <label className="min-w-0 text-xs font-medium text-slate-600">
                  Location
                  <select
                    value={locationFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setLocationFilter(plans.find((plan) => plan.location === value)?.location ?? "");
                    }}
                    className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                  >
                    <option value="">All locations</option>
                    {[...new Set(plans.map(({ location }) => location))].map((location) => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0 text-xs font-medium text-slate-600">
                  Days per week
                  <select
                    value={daysFilter}
                    onChange={(event) => {
                      const value = event.target.value;
                      setDaysFilter(value ? Number(value) : "");
                    }}
                    className="mt-1 min-h-11 w-full min-w-0 rounded-md border border-slate-200 bg-white px-2 text-sm text-slate-800"
                  >
                    <option value="">Any frequency</option>
                    {[...new Set(plans.map(({ daysPerWeek }) => daysPerWeek))]
                      .sort((a, b) => a - b)
                      .map((days) => (
                        <option key={days} value={days}>{days} days / week</option>
                      ))}
                  </select>
                </label>
              </div>
            )}
          </div>

          {filteredPlans.length > 0 ? (
            <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {filteredPlans.map((plan) => (
                <article key={plan.id} className="min-w-0 rounded-lg border border-slate-200 p-3">
                  <h3 className="break-words text-sm font-semibold text-slate-900">{plan.name}</h3>
                  <p className="mt-1 text-xs font-medium text-primary">{plan.focus}</p>
                  <p className="mt-1 text-xs text-slate-600">{plan.description}</p>
                  <p className="mt-2 text-xs font-semibold text-slate-700">
                    {plan.daysPerWeek} days per week
                  </p>
                  <p className="mt-1 break-words text-[11px] text-slate-500">
                    {plan.experienceLevels.join(" / ")} · {plan.location} · {plan.days.map(({ day }) => day).join(", ")}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedPlan(plan);
                      setMessage(null);
                    }}
                    className="mt-3 min-h-11 w-full rounded-md border border-primary/30 px-3 py-2 text-xs font-semibold text-primary transition hover:bg-primary/5 sm:w-auto"
                  >
                    Preview plan
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <p className="mt-3 rounded-lg border border-dashed border-slate-300 p-4 text-sm text-slate-500">
              No plans match these filters. Try a different combination.
            </p>
          )}
        </div>
      )}

      {selectedPlan && (
        <div className="mt-4 min-w-0 rounded-lg border border-primary/20 bg-primary/5 p-3">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="break-words text-sm font-bold text-slate-900">
                Preview: {selectedPlan.name}
              </h3>
              <p className="mt-1 max-w-prose text-xs text-slate-600">
                Applying replaces workouts only on the listed days across your program. Other days stay unchanged.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setSelectedPlan(null)}
              className="min-h-11 min-w-11 rounded-md px-2 text-xs font-medium text-slate-500 hover:text-slate-800"
            >
              Close preview
            </button>
          </div>

          <div className="mt-3 grid min-w-0 grid-cols-1 gap-3 md:grid-cols-2">
            {selectedPlan.days.map(({ day, exercises }) => (
              <div key={day} className="min-w-0 rounded-md border border-slate-200 bg-white p-3">
                <h4 className="text-sm font-bold text-slate-800">{day}</h4>
                <ul className="mt-2 space-y-2 text-sm text-slate-600">
                  {exercises.map(({ exerciseId, name, sets, reps, restSeconds }) => (
                    <li key={`${day}-${exerciseId}`} className="min-w-0 break-words">
                      <span>{name}</span>
                      <span className="block text-xs text-slate-500">
                        {sets} × {reps} · {restSeconds}s rest
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() => void applySelectedPlan()}
            disabled={!trainingPlanId || busy}
            className="mt-3 min-h-11 w-full rounded-md bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {busy ? "Applying plan..." : "Confirm and apply this plan"}
          </button>
        </div>
      )}

      {message && (
        <p
          role="status"
          className={`mt-3 text-xs ${
            message.includes("applied") ? "text-emerald-700" : "text-red-600"
          }`}
        >
          {message}
        </p>
      )}
      </div>
    </section>
  );
}
