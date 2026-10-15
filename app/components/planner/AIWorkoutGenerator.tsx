"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { exercises } from "@/app/data/exercises";
import { useProgram } from "@/app/context/ProgramContext";
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  WORKOUT_LOCATIONS,
  WORKOUT_SPLITS,
  WORKOUT_DAYS,
  DEFAULT_WORKOUT_TRAINING_DAYS,
} from "@/app/lib/ai-workout-types";
import type {
  GeneratedWorkout,
  WorkoutDayName,
  WorkoutPreferences,
  WorkoutSplit,
} from "@/app/lib/ai-workout-types";

interface Props {
  planId: string | null;
}

const initialPreferences: WorkoutPreferences = {
  fitnessGoal: "General fitness",
  experienceLevel: "Beginner",
  workoutLocation: "Gym",
  workoutSplit: "Let AI decide",
  trainingDays: [...DEFAULT_WORKOUT_TRAINING_DAYS],
  limitations: "None",
};

const exerciseById = new Map(
  Object.values(exercises)
    .flat()
    .map((exercise) => [exercise.id, exercise]),
);

function toggleSelection<T>(values: readonly T[], value: T): T[] {
  return values.includes(value)
    ? values.filter((current) => current !== value)
    : [...values, value];
}

export default function AIWorkoutGenerator({ planId }: Props) {
  const { refreshProgram } = useProgram();
  const [preferences, setPreferences] = useState(initialPreferences);
  const [workout, setWorkout] = useState<GeneratedWorkout | null>(null);
  const [busy, setBusy] = useState<"generate" | "save" | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function postJson(path: string, payload: unknown) {
    const response = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const data = await response.json().catch(() => null) as
      | {
          error?: string;
          workout?: GeneratedWorkout;
          success?: boolean;
          planId?: string;
          trainingPlanId?: string;
          savedDays?: string[];
          savedWeeks?: number;
          savedExercises?: number;
        }
      | null;
    if (!response.ok) {
      throw new Error(data?.error || "Request failed. Please try again.");
    }
    return data;
  }

  async function generate() {
    if (!planId) {
      setMessage("A saved training plan is required to generate a workout.");
      return;
    }
    setBusy("generate");
    setMessage(null);
    setWorkout(null);
    try {
      const data = await postJson(
        `/api/training-plans/${planId}/ai-workout/generate`,
        { preferences },
      );
      if (!data?.workout) {
        throw new Error("The generated workout response was incomplete.");
      }
      setWorkout(data.workout);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workout generation failed.");
    } finally {
      setBusy(null);
    }
  }

  async function save() {
    if (!planId || !workout) {
      return;
    }
    setBusy("save");
    setMessage(null);
    try {
      const data = await postJson(
        `/api/training-plans/${planId}/ai-workout/save`,
        { preferences, workout },
      );
      const savedWeeks = data?.savedWeeks;
      const expectedExerciseCount =
        workout.days.reduce(
          (count, day) => count + day.exercises.length,
          0,
        ) * (typeof savedWeeks === "number" ? savedWeeks : 0);
      const savedDays = data?.savedDays;
      if (
        !data?.success ||
        data.planId !== planId ||
        data.trainingPlanId !== planId ||
        !Array.isArray(savedDays) ||
        savedDays.length !== preferences.trainingDays.length ||
        preferences.trainingDays.some((day) => !savedDays.includes(day)) ||
        typeof savedWeeks !== "number" ||
        !Number.isInteger(savedWeeks) ||
        savedWeeks < 1 ||
        data.savedExercises !== expectedExerciseCount
      ) {
        throw new Error("The saved workout could not be confirmed. Please reload and check the plan.");
      }
      await refreshProgram(planId, workout, savedWeeks);
      setWorkout(null);
      setMessage("Workout saved and the planner was refreshed.");
      setBusy(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Workout save failed.");
      setBusy(null);
    }
  }

  return (
    <section className="mt-3 rounded-lg border border-primary/20 bg-primary/5 p-3">
      <div className="flex items-center gap-2">
        <Sparkles size={15} className="text-primary" />
        <h3 className="text-sm font-bold text-slate-900">AI Workout Generator</h3>
      </div>
      <p className="mt-1 text-xs text-slate-600">
        Create a strength-only weekly template from the ConsistFit exercise library.
      </p>

      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        <label className="text-xs font-medium text-slate-700">
          Workout location
          <select
            value={preferences.workoutLocation}
            onChange={(event) => {
              setWorkout(null);
              setPreferences((current) => ({
                ...current,
                workoutLocation: event.target.value as WorkoutPreferences["workoutLocation"],
              }));
            }}
            className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2"
          >
            {WORKOUT_LOCATIONS.map((location) => <option key={location}>{location}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700">
          Workout split
          <select
            value={preferences.workoutSplit}
            onChange={(event) => {
              setWorkout(null);
              setPreferences((current) => ({
                ...current,
                workoutSplit: event.target.value as WorkoutSplit,
              }));
            }}
            className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2"
          >
            {WORKOUT_SPLITS.map((split) => <option key={split}>{split}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700">
          Fitness goal
          <select
            value={preferences.fitnessGoal}
            onChange={(event) =>
              {
                setWorkout(null);
                setPreferences((current) => ({
                  ...current,
                  fitnessGoal: event.target.value as WorkoutPreferences["fitnessGoal"],
                }));
              }
            }
            className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2"
          >
            {FITNESS_GOALS.map((goal) => <option key={goal}>{goal}</option>)}
          </select>
        </label>
        <label className="text-xs font-medium text-slate-700">
          Experience level
          <select
            value={preferences.experienceLevel}
            onChange={(event) =>
              {
                setWorkout(null);
                setPreferences((current) => ({
                  ...current,
                  experienceLevel: event.target.value as WorkoutPreferences["experienceLevel"],
                }));
              }
            }
            className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2"
          >
            {EXPERIENCE_LEVELS.map((level) => <option key={level}>{level}</option>)}
          </select>
        </label>
      </div>

      <fieldset className="mt-3">
        <legend className="text-xs font-semibold text-slate-700">Training days</legend>
        <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1">
          {WORKOUT_DAYS.map((day) => (
            <label key={day} className="flex items-center gap-1 text-xs text-slate-600">
              <input
                type="checkbox"
                checked={preferences.trainingDays.includes(day)}
                onChange={() => {
                  setWorkout(null);
                  setPreferences((current) => ({
                    ...current,
                    trainingDays: toggleSelection(current.trainingDays, day) as WorkoutDayName[],
                  }));
                }}
              />
              {day}
            </label>
          ))}
        </div>
      </fieldset>

      <label className="mt-3 block text-xs font-medium text-slate-700">
        Limitations or movements to avoid (enter “None” if there are none)
        <textarea
          value={preferences.limitations}
          maxLength={500}
          onChange={(event) => {
            setWorkout(null);
            setPreferences((current) => ({ ...current, limitations: event.target.value }));
          }}
          rows={2}
          className="mt-1 block w-full rounded-md border border-slate-200 bg-white px-2.5 py-2"
        />
      </label>

      <button
        type="button"
        onClick={generate}
        disabled={busy !== null || !planId}
        className="mt-3 flex items-center justify-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {busy === "generate" && <Loader2 size={13} className="animate-spin" />}
        {busy === "generate" ? "Generating..." : "Generate workout"}
      </button>

      {workout && (
        <div className="mt-4 rounded-lg border border-slate-200 bg-white p-3">
          <h4 className="text-sm font-bold text-slate-900">Review your weekly template</h4>
          <p className="mt-1 text-xs text-amber-800">
            Confirming replaces exercises on these days in every week of this plan. Other days are unchanged.
          </p>
          <div className="mt-3 space-y-3">
            {workout.days.map((day) => (
              <div key={day.day}>
                <h5 className="text-xs font-semibold text-slate-800">{day.day}</h5>
                <ol className="mt-1 list-inside list-decimal space-y-1">
                  {day.exercises.map((exercise) => (
                    <li key={exercise.exerciseId} className="text-xs text-slate-600">
                      {exerciseById.get(exercise.exerciseId)?.name ?? `Exercise ${exercise.exerciseId}`}
                      {" — "}{exercise.sets} × {exercise.reps}, {exercise.restSeconds}s rest
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={save}
            disabled={busy !== null}
            className="mt-3 flex items-center gap-2 rounded-lg border border-primary bg-white px-3 py-2 text-xs font-semibold text-primary disabled:opacity-50"
          >
            {busy === "save" && <Loader2 size={13} className="animate-spin" />}
            {busy === "save" ? "Saving..." : "Confirm and save"}
          </button>
        </div>
      )}

      {message && (
        <p role="alert" className="mt-2 text-xs font-medium text-red-700">{message}</p>
      )}
    </section>
  );
}
