"use client";

import { useEffect, useMemo, useState } from "react";

type GoalCategory = "Workout" | "Learning" | "Health";

type Goal = {
  id: number;
  title: string;
  category: GoalCategory;
  emoji: string;
  completed: boolean;
};

type HabitDay = {
  date: string;
  goals: Goal[];
};

type StoredHabitData = {
  currentDate: string;
  goals: Goal[];
  history: HabitDay[];
};

const STORAGE_KEY = "lifeos-habits";

const initialGoals: Goal[] = [
  {
    id: 1,
    title: "Complete Chest Workout",
    category: "Workout",
    emoji: "💪",
    completed: true,
  },
  {
    id: 2,
    title: "Learn Kubernetes (30 mins)",
    category: "Learning",
    emoji: "💻",
    completed: false,
  },
  {
    id: 3,
    title: "Read 30 Minutes",
    category: "Learning",
    emoji: "📖",
    completed: false,
  },
  {
    id: 4,
    title: "English Practice",
    category: "Learning",
    emoji: "🗣️",
    completed: true,
  },
  {
    id: 5,
    title: "Morning Walk",
    category: "Health",
    emoji: "🏃",
    completed: true,
  },
  {
    id: 6,
    title: "Meditation",
    category: "Health",
    emoji: "🧘",
    completed: false,
  },
  {
    id: 7,
    title: "Drink 3L Water",
    category: "Health",
    emoji: "💧",
    completed: true,
  },
];

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function resetGoals(goals: Goal[]): Goal[] {
  return goals.map((goal) => ({
    ...goal,
    completed: false,
  }));
}

function saveDayToHistory(
  history: HabitDay[],
  date: string,
  goals: Goal[]
): HabitDay[] {
  const existingIndex = history.findIndex(
    (day) => day.date === date
  );

  const newDay: HabitDay = {
    date,
    goals,
  };

  if (existingIndex >= 0) {
    const updatedHistory = [...history];
    updatedHistory[existingIndex] = newDay;
    return updatedHistory;
  }

  return [...history, newDay].slice(-7);
}

export default function HabitTracker() {
  const [goals, setGoals] = useState<Goal[]>(() => {
    if (typeof window === "undefined") {
      return initialGoals;
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return initialGoals;
      }

      const parsed: StoredHabitData = JSON.parse(saved);

      if (
        parsed.currentDate === getToday() &&
        Array.isArray(parsed.goals)
      ) {
        return parsed.goals;
      }

      if (Array.isArray(parsed.goals)) {
        return resetGoals(parsed.goals);
      }
    } catch (error) {
      console.error(
        "Failed to load habits:",
        error
      );
    }

    return initialGoals;
  });

  const [history, setHistory] = useState<HabitDay[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const saved = localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return [];
      }

      const parsed: StoredHabitData = JSON.parse(saved);

      if (Array.isArray(parsed.history)) {
        return parsed.history;
      }
    } catch (error) {
      console.error(
        "Failed to load habit history:",
        error
      );
    }

    return [];
  });

  const [editingId, setEditingId] =
    useState<number | null>(null);

  const [editingTitle, setEditingTitle] =
    useState("");

  const [showAddForm, setShowAddForm] =
    useState(false);

  const [newTitle, setNewTitle] =
    useState("");

  const [newCategory, setNewCategory] =
    useState<GoalCategory>("Health");

  /*
   * Save current habits and today's history.
   */
  useEffect(() => {
    try {
      const today = getToday();

      const updatedHistory = saveDayToHistory(
        history,
        today,
        goals
      );

      const data: StoredHabitData = {
        currentDate: today,
        goals,
        history: updatedHistory,
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error(
        "Failed to save habits:",
        error
      );
    }
  }, [goals, history]);

  /*
   * When the current goals change, update today's
   * history so Analytics always has the latest result.
   */
  useEffect(() => {
    const today = getToday();

    setHistory((currentHistory) =>
      saveDayToHistory(
        currentHistory,
        today,
        goals
      )
    );
  }, [goals]);

  const completedCount = useMemo(
    () =>
      goals.filter(
        (goal) => goal.completed
      ).length,
    [goals]
  );

  const progress =
    goals.length === 0
      ? 0
      : Math.round(
          (completedCount / goals.length) * 100
        );

  /*
   * Complete / incomplete
   */
  function toggleGoal(id: number) {
    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              completed: !goal.completed,
            }
          : goal
      )
    );
  }

  /*
   * Start editing
   */
  function startEditing(goal: Goal) {
    setEditingId(goal.id);
    setEditingTitle(goal.title);
  }

  /*
   * Save edit
   */
  function saveEdit(id: number) {
    const trimmedTitle =
      editingTitle.trim();

    if (!trimmedTitle) {
      return;
    }

    setGoals((currentGoals) =>
      currentGoals.map((goal) =>
        goal.id === id
          ? {
              ...goal,
              title: trimmedTitle,
            }
          : goal
      )
    );

    setEditingId(null);
    setEditingTitle("");
  }

  /*
   * Delete
   */
  function deleteGoal(id: number) {
    setGoals((currentGoals) =>
      currentGoals.filter(
        (goal) => goal.id !== id
      )
    );
  }

  /*
   * Add new habit
   */
  function addGoal() {
    const trimmedTitle =
      newTitle.trim();

    if (!trimmedTitle) {
      return;
    }

    const emoji =
      newCategory === "Workout"
        ? "💪"
        : newCategory === "Learning"
        ? "📚"
        : "🎯";

    const newGoal: Goal = {
      id: Date.now(),
      title: trimmedTitle,
      category: newCategory,
      emoji,
      completed: false,
    };

    setGoals((currentGoals) => [
      ...currentGoals,
      newGoal,
    ]);

    setNewTitle("");
    setNewCategory("Health");
    setShowAddForm(false);
  }

  /*
   * Category colors
   */
  function getCategoryStyle(
    category: GoalCategory
  ) {
    if (category === "Workout") {
      return "bg-orange-50 text-orange-700 border-orange-100";
    }

    if (category === "Learning") {
      return "bg-blue-50 text-blue-700 border-blue-100";
    }

    return "bg-green-50 text-green-700 border-green-100";
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
            🎯
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Today&apos;s Habits
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Build consistency every day.
            </p>
          </div>

        </div>

        {/* Progress Badge */}
        <div className="shrink-0 rounded-full bg-green-50 px-3 py-1.5">
          <span className="text-xs font-semibold text-green-700">
            {completedCount}/{goals.length} Completed
          </span>
        </div>

      </div>

      {/* Habit List */}
      <div className="mt-5 divide-y divide-slate-100">

        {goals.map((goal) => (

          <div
            key={goal.id}
            className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
          >

            {/* Checkbox */}
            <button
              type="button"
              onClick={() =>
                toggleGoal(goal.id)
              }
              aria-label={
                goal.completed
                  ? "Mark habit incomplete"
                  : "Mark habit complete"
              }
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${
                goal.completed
                  ? "border-green-600 bg-green-600 text-sm font-bold text-white"
                  : "border-slate-300 bg-white hover:border-green-500"
              }`}
            >
              {goal.completed && "✓"}
            </button>

            {/* Habit Information */}
            <div className="min-w-0 flex-1">

              {editingId === goal.id ? (

                <div className="flex gap-2">

                  <input
                    autoFocus
                    value={editingTitle}
                    onChange={(e) =>
                      setEditingTitle(
                        e.target.value
                      )
                    }
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        saveEdit(goal.id);
                      }

                      if (e.key === "Escape") {
                        setEditingId(null);
                        setEditingTitle("");
                      }
                    }}
                    className="w-full rounded-lg border border-green-400 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-100"
                  />

                  <button
                    type="button"
                    onClick={() =>
                      saveEdit(goal.id)
                    }
                    className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700"
                  >
                    Save
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setEditingId(null);
                      setEditingTitle("");
                    }}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50"
                  >
                    Cancel
                  </button>

                </div>

              ) : (

                <>
                  <p
                    className={`text-sm font-medium ${
                      goal.completed
                        ? "text-slate-900"
                        : "text-slate-700"
                    }`}
                  >
                    {goal.emoji} {goal.title}
                  </p>

                  <div className="mt-1 flex items-center gap-2">

                    <span
                      className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${getCategoryStyle(
                        goal.category
                      )}`}
                    >
                      {goal.category}
                    </span>

                    {goal.completed && (
                      <span className="text-[10px] font-medium text-green-600">
                        Completed
                      </span>
                    )}

                  </div>
                </>

              )}

            </div>

            {/* Actions */}
            {editingId !== goal.id && (

              <div className="flex shrink-0 items-center gap-2">

                <span
                  className={`hidden text-xs font-medium sm:block ${
                    goal.completed
                      ? "text-green-600"
                      : "text-slate-400"
                  }`}
                >
                  {goal.completed
                    ? "Done"
                    : "Pending"}
                </span>

                <button
                  type="button"
                  onClick={() =>
                    startEditing(goal)
                  }
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700"
                >
                  ✏️ Edit
                </button>

                <button
                  type="button"
                  onClick={() =>
                    deleteGoal(goal.id)
                  }
                  className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                  aria-label="Delete habit"
                >
                  🗑️
                </button>

              </div>

            )}

          </div>

        ))}

      </div>

      {/* Add Habit */}
      {showAddForm ? (

        <div className="mt-4 rounded-xl border border-green-200 bg-green-50/50 p-4">

          <p className="text-sm font-semibold text-slate-800">
            Add New Habit
          </p>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">

            <input
              value={newTitle}
              onChange={(e) =>
                setNewTitle(e.target.value)
              }
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  addGoal();
                }
              }}
              placeholder="Example: Drink 3L Water"
              autoFocus
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100"
            />

            <select
              value={newCategory}
              onChange={(e) =>
                setNewCategory(
                  e.target.value as GoalCategory
                )
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500"
            >
              <option value="Health">
                Health
              </option>

              <option value="Workout">
                Workout
              </option>

              <option value="Learning">
                Learning
              </option>
            </select>

          </div>

          <div className="mt-3 flex justify-end gap-2">

            <button
              type="button"
              onClick={() => {
                setShowAddForm(false);
                setNewTitle("");
              }}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={addGoal}
              disabled={!newTitle.trim()}
              className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add Habit
            </button>

          </div>

        </div>

      ) : (

        <button
          type="button"
          onClick={() =>
            setShowAddForm(true)
          }
          className="mt-4 flex w-full items-center justify-center rounded-xl border border-dashed border-green-300 bg-green-50/50 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-50"
        >
          + Add Habit
        </button>

      )}

      {/* Progress */}
      <div className="mt-5 border-t border-slate-100 pt-4">

        <div className="mb-2 flex items-center justify-between">

          <span className="text-xs font-medium text-slate-500">
            Today&apos;s Progress
          </span>

          <span className="text-sm font-bold text-slate-900">
            {progress}%
          </span>

        </div>

        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">

          <div
            className="h-full rounded-full bg-green-600 transition-all duration-500"
            style={{
              width: `${progress}%`,
            }}
          />

        </div>

        <div className="mt-2 flex justify-between text-[11px] text-slate-400">

          <span>
            {completedCount} of{" "}
            {goals.length} habits completed
          </span>

          <span>
            {goals.length -
              completedCount}{" "}
            remaining
          </span>

        </div>

      </div>

    </div>
  );
}