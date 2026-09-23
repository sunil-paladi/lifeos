"use client";

import { useEffect, useMemo, useState } from "react";

type Habit = {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  frequency: string;
  target: number | null;
  unit: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type DailyStatistic = { date: string; completed: boolean };
type Summary = {
  currentStreak: number;
  longestStreak: number;
  completedDays: number;
  missedDays: number;
  completionPercentage: number;
};
type WeeklyStatistic = Summary & { week: string };
type MonthlyStatistic = Summary & { month: string };
type Statistics = {
  summary: Summary;
  daily: DailyStatistic[];
  weekly: WeeklyStatistic[];
  monthly: MonthlyStatistic[];
};
type PeriodTab = "daily" | "weekly" | "monthly";

type HabitsResponse = { success: boolean; habits: Habit[] };
type HabitResponse = { success: boolean; habit: Habit };
type StatisticsResponse = Statistics & { success: boolean; habit: Habit };

function getToday() {
  return new Date().toISOString().split("T")[0];
}

async function readApiResponse<T>(response: Response): Promise<T> {
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Request failed.";
    throw new Error(message);
  }

  return data as T;
}

export default function HabitTracker() {
  const [habits, setHabits] = useState<Habit[]>([]);
  const [completedToday, setCompletedToday] = useState<Record<string, boolean>>({});
  const [selectedHabitId, setSelectedHabitId] = useState<string | null>(null);
  const [statistics, setStatistics] = useState<Statistics | null>(null);
  const [statisticsTab, setStatisticsTab] = useState<PeriodTab>("daily");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);
  const [showInactive, setShowInactive] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingStatistics, setLoadingStatistics] = useState(false);
  const [actionKey, setActionKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadHabits() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/habits");
        const data = await readApiResponse<HabitsResponse>(response);
        const activeHabits = data.habits.filter((habit) => habit.isActive);
        const completionResults = await Promise.all(
          activeHabits.map(async (habit) => {
            const completionResponse = await fetch(
              `/api/habits/${habit.id}/completions`
            );
            const completionData = await readApiResponse<{
              success: boolean;
              completions: { date: string; completed: boolean }[];
            }>(completionResponse);
            const todayCompletion = completionData.completions.find(
              (completion) =>
                new Date(completion.date).toISOString().split("T")[0] === getToday()
            );
            return [habit.id, todayCompletion?.completed === true] as const;
          })
        );

        if (!cancelled) {
          setHabits(data.habits);
          setCompletedToday(Object.fromEntries(completionResults));
        }
      } catch {
        if (!cancelled) {
          setError("We could not load your habits. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadHabits();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedHabitId) {
      setStatistics(null);
      return;
    }

    let cancelled = false;

    async function loadStatistics() {
      setLoadingStatistics(true);
      setError(null);

      try {
        const response = await fetch(
          `/api/habits/${selectedHabitId}/statistics`
        );
        const data = await readApiResponse<StatisticsResponse>(response);
        if (!cancelled) {
          setStatistics({
            summary: data.summary,
            daily: data.daily,
            weekly: data.weekly,
            monthly: data.monthly,
          });
        }
      } catch {
        if (!cancelled) {
          setError("We could not load this habit's statistics.");
        }
      } finally {
        if (!cancelled) {
          setLoadingStatistics(false);
        }
      }
    }

    void loadStatistics();
    return () => {
      cancelled = true;
    };
  }, [selectedHabitId]);

  const activeHabits = useMemo(
    () => habits.filter((habit) => habit.isActive),
    [habits]
  );
  const inactiveHabits = useMemo(
    () => habits.filter((habit) => !habit.isActive),
    [habits]
  );
  const completedCount = activeHabits.filter(
    (habit) => completedToday[habit.id]
  ).length;
  const progress = activeHabits.length === 0
    ? 0
    : Math.round((completedCount / activeHabits.length) * 100);

  function beginAction(key: string) {
    setActionKey(key);
    setError(null);
  }

  async function addHabit() {
    const name = newTitle.trim();
    if (!name) return;
    beginAction("create");

    try {
      const response = await fetch("/api/habits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          frequency: "DAILY",
        }),
      });
      const data = await readApiResponse<HabitResponse>(response);
      setHabits((current) => [...current, data.habit]);
      setNewTitle("");
      setShowAddForm(false);
    } catch {
      setError("We could not create that habit. Please try again.");
    } finally {
      setActionKey(null);
    }
  }

  async function saveEdit(habitId: string) {
    const name = editingTitle.trim();
    if (!name) return;
    beginAction(`update-${habitId}`);

    try {
      const response = await fetch(`/api/habits/${habitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await readApiResponse<HabitResponse>(response);
      setHabits((current) =>
        current.map((habit) => (habit.id === habitId ? data.habit : habit))
      );
      setEditingId(null);
      setEditingTitle("");
    } catch {
      setError("We could not update that habit. Please try again.");
    } finally {
      setActionKey(null);
    }
  }

  async function deleteHabit(habitId: string) {
    if (!window.confirm("Delete this habit and its completion history?")) return;
    beginAction(`delete-${habitId}`);

    try {
      const response = await fetch(`/api/habits/${habitId}`, { method: "DELETE" });
      await readApiResponse<{ success: boolean }>(response);
      setHabits((current) => current.filter((habit) => habit.id !== habitId));
      setCompletedToday((current) => {
        const next = { ...current };
        delete next[habitId];
        return next;
      });
      if (selectedHabitId === habitId) setSelectedHabitId(null);
    } catch {
      setError("We could not delete that habit. Please try again.");
    } finally {
      setActionKey(null);
    }
  }

  async function toggleActive(habit: Habit) {
    beginAction(`active-${habit.id}`);

    try {
      const response = await fetch(`/api/habits/${habit.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !habit.isActive }),
      });
      const data = await readApiResponse<HabitResponse>(response);
      setHabits((current) =>
        current.map((item) => (item.id === habit.id ? data.habit : item))
      );
    } catch {
      setError("We could not change that habit's active status.");
    } finally {
      setActionKey(null);
    }
  }

  async function toggleCompletion(habit: Habit) {
    const completed = completedToday[habit.id] === true;
    beginAction(`complete-${habit.id}`);

    try {
      const response = await fetch(`/api/habits/${habit.id}/completions`, {
        method: completed ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          completed
            ? { date: new Date().toISOString(), completed: false }
            : { completed: true }
        ),
      });
      await readApiResponse<{ success: boolean }>(response);
      setCompletedToday((current) => ({ ...current, [habit.id]: !completed }));
      if (selectedHabitId === habit.id) setStatistics(null);
    } catch {
      setError("We could not update today's completion. Please try again.");
    } finally {
      setActionKey(null);
    }
  }

  function toggleStatistics(habitId: string) {
    setSelectedHabitId((current) => (current === habitId ? null : habitId));
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">🎯</div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Today&apos;s Habits</h2>
            <p className="mt-0.5 text-xs text-slate-500">Build consistency every day.</p>
          </div>
        </div>
        <div className="shrink-0 rounded-full bg-green-50 px-3 py-1.5">
          <span className="text-xs font-semibold text-green-700">{completedCount}/{activeHabits.length} Completed</span>
        </div>
      </div>

      {error && <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">{error}</p>}

      {loading ? (
        <p className="mt-5 py-6 text-center text-sm text-slate-500">Loading habits...</p>
      ) : (
        <>
          <div className="mt-5 divide-y divide-slate-100">
            {activeHabits.length === 0 ? (
              <p className="py-5 text-center text-sm text-slate-500">No active habits yet. Add one to get started.</p>
            ) : activeHabits.map((habit) => {
              const completed = completedToday[habit.id] === true;
              const editing = editingId === habit.id;
              const busy = actionKey === `complete-${habit.id}`;

              return (
                <div key={habit.id} className="py-3 first:pt-0 last:pb-0">
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => void toggleCompletion(habit)} disabled={busy} aria-label={completed ? "Mark habit incomplete" : "Mark habit complete"} className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full border transition ${completed ? "border-green-600 bg-green-600 text-sm font-bold text-white" : "border-slate-300 bg-white hover:border-green-500"}`}>
                      {completed && "✓"}
                    </button>
                    <div className="min-w-0 flex-1">
                      {editing ? (
                        <div className="flex gap-2">
                          <input autoFocus value={editingTitle} onChange={(event) => setEditingTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void saveEdit(habit.id); if (event.key === "Escape") { setEditingId(null); setEditingTitle(""); } }} className="w-full rounded-lg border border-green-400 px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-green-100" />
                          <button type="button" onClick={() => void saveEdit(habit.id)} disabled={actionKey === `update-${habit.id}`} className="rounded-lg bg-green-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-green-700 disabled:opacity-50">Save</button>
                          <button type="button" onClick={() => { setEditingId(null); setEditingTitle(""); }} className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 hover:bg-slate-50">Cancel</button>
                        </div>
                      ) : (
                        <>
                          <p className={`text-sm font-medium ${completed ? "text-slate-900" : "text-slate-700"}`}>{habit.name}</p>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-[10px] font-medium text-green-700">{habit.frequency}</span>
                            {completed && <span className="text-[10px] font-medium text-green-600">Completed</span>}
                          </div>
                        </>
                      )}
                    </div>
                    {!editing && <div className="flex shrink-0 items-center gap-2">
                      <span className={`hidden text-xs font-medium sm:block ${completed ? "text-green-600" : "text-slate-400"}`}>{completed ? "Done" : "Pending"}</span>
                      <button type="button" onClick={() => toggleStatistics(habit.id)} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700">Stats</button>
                      <button type="button" onClick={() => { setEditingId(habit.id); setEditingTitle(habit.name); }} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-green-300 hover:bg-green-50 hover:text-green-700">✏️ Edit</button>
                      <button type="button" onClick={() => void deleteHabit(habit.id)} disabled={actionKey === `delete-${habit.id}`} className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 transition hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50" aria-label="Delete habit">🗑️</button>
                    </div>}
                  </div>
                  {selectedHabitId === habit.id && <StatisticsPanel statistics={statistics} loading={loadingStatistics} tab={statisticsTab} onTabChange={setStatisticsTab} />}
                </div>
              );
            })}
          </div>

          {showAddForm ? (
            <div className="mt-4 rounded-xl border border-green-200 bg-green-50/50 p-4">
              <p className="text-sm font-semibold text-slate-800">Add New Habit</p>
              <input value={newTitle} onChange={(event) => setNewTitle(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") void addHabit(); }} placeholder="Example: Drink 3L Water" autoFocus className="mt-3 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" />
              <div className="mt-3 flex justify-end gap-2">
                <button type="button" onClick={() => { setShowAddForm(false); setNewTitle(""); }} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-50">Cancel</button>
                <button type="button" onClick={() => void addHabit()} disabled={!newTitle.trim() || actionKey === "create"} className="rounded-lg bg-green-600 px-4 py-2 text-xs font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50">{actionKey === "create" ? "Adding..." : "+ Add Habit"}</button>
              </div>
            </div>
          ) : <button type="button" onClick={() => setShowAddForm(true)} className="mt-4 flex w-full items-center justify-center rounded-xl border border-dashed border-green-300 bg-green-50/50 py-3 text-sm font-semibold text-green-700 transition hover:bg-green-50">+ Add Habit</button>}

          <div className="mt-5 border-t border-slate-100 pt-4">
            <div className="mb-2 flex items-center justify-between"><span className="text-xs font-medium text-slate-500">Today&apos;s Progress</span><span className="text-sm font-bold text-slate-900">{progress}%</span></div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-green-600 transition-all duration-500" style={{ width: `${progress}%` }} /></div>
            <div className="mt-2 flex justify-between text-[11px] text-slate-400"><span>{completedCount} of {activeHabits.length} habits completed</span><span>{activeHabits.length - completedCount} remaining</span></div>
          </div>

          {inactiveHabits.length > 0 && <div className="mt-5 border-t border-slate-100 pt-4">
            <button type="button" onClick={() => setShowInactive((current) => !current)} className="text-xs font-semibold text-slate-500 hover:text-green-700">{showInactive ? "Hide" : "Manage"} inactive habits ({inactiveHabits.length})</button>
            {showInactive && <div className="mt-3 space-y-2">{inactiveHabits.map((habit) => <div key={habit.id} className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2"><span className="text-sm text-slate-600">{habit.name}</span><div className="flex gap-2"><button type="button" onClick={() => void toggleActive(habit)} disabled={actionKey === `active-${habit.id}`} className="rounded-lg border border-green-200 px-2.5 py-1 text-xs font-medium text-green-700 hover:bg-green-50">Activate</button><button type="button" onClick={() => void deleteHabit(habit.id)} disabled={actionKey === `delete-${habit.id}`} className="rounded-lg border border-red-100 px-2.5 py-1 text-xs text-red-600 hover:bg-red-50">Delete</button></div></div>)}</div>}
          </div>}
        </>
      )}
    </div>
  );
}

function StatisticsPanel({
  statistics,
  loading,
  tab,
  onTabChange,
}: {
  statistics: Statistics | null;
  loading: boolean;
  tab: PeriodTab;
  onTabChange: (tab: PeriodTab) => void;
}) {
  if (loading) return <p className="mt-3 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">Loading statistics...</p>;
  if (!statistics) return null;

  const recentDays = statistics.daily.slice(-14).reverse();

  return (
    <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3">
      <div className="grid grid-cols-5 gap-2 text-center">
        <StatValue label="Current" value={statistics.summary.currentStreak} suffix="days" />
        <StatValue label="Longest" value={statistics.summary.longestStreak} suffix="days" />
        <StatValue label="Complete" value={statistics.summary.completionPercentage} suffix="%" />
        <StatValue label="Done" value={statistics.summary.completedDays} />
        <StatValue label="Missed" value={statistics.summary.missedDays} />
      </div>

      <div className="mt-4 flex gap-1 rounded-lg bg-white p-1">
        {["daily", "weekly", "monthly"].map((period) => <button key={period} type="button" onClick={() => onTabChange(period as PeriodTab)} className={`flex-1 rounded-md px-2 py-1.5 text-xs font-semibold capitalize ${tab === period ? "bg-green-100 text-green-700" : "text-slate-500 hover:bg-slate-50"}`}>{period}</button>)}
      </div>

      <div className="mt-3 max-h-48 space-y-1.5 overflow-y-auto">
        {tab === "daily" && recentDays.map((day) => <PeriodRow key={day.date} label={day.date} completedDays={day.completed ? 1 : 0} missedDays={day.completed ? 0 : 1} completionPercentage={day.completed ? 100 : 0} />)}
        {tab === "weekly" && statistics.weekly.slice().reverse().map((week) => <PeriodRow key={week.week} label={week.week} completedDays={week.completedDays} missedDays={week.missedDays} completionPercentage={week.completionPercentage} />)}
        {tab === "monthly" && statistics.monthly.slice().reverse().map((month) => <PeriodRow key={month.month} label={month.month} completedDays={month.completedDays} missedDays={month.missedDays} completionPercentage={month.completionPercentage} />)}
      </div>

      <div className="mt-4 border-t border-slate-200 pt-3">
        <p className="mb-2 text-xs font-semibold text-slate-600">Recent history</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {recentDays.map((day) => <div key={day.date} className={`rounded-lg px-2 py-1.5 text-center text-[10px] ${day.completed ? "bg-green-100 text-green-700" : "bg-white text-slate-500"}`}><div>{day.date}</div><div className="font-semibold">{day.completed ? "Completed" : "Not completed"}</div></div>)}
        </div>
      </div>
    </div>
  );
}

function PeriodRow({
  label,
  completedDays,
  missedDays,
  completionPercentage,
}: {
  label: string;
  completedDays: number;
  missedDays: number;
  completionPercentage: number;
}) {
  return <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs"><span className="text-slate-600">{label}</span><span className="text-slate-500">{completedDays} done · {missedDays} missed · {completionPercentage}%</span></div>;
}

function StatValue({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return <div><p className="text-[10px] text-slate-500">{label}</p><p className="mt-0.5 text-sm font-bold text-slate-800">{value}{suffix && <span className="ml-0.5 text-[10px] font-medium">{suffix}</span>}</p></div>;
}
