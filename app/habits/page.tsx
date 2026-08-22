import HabitTracker from "@/app/components/habits/HabitTracker";

export default function HabitsPage() {
  return (
    <main className="w-full space-y-5">

      {/* Page Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
          Habits
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Your Daily Habits
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Build consistency, complete your daily habits, and keep moving forward.
        </p>
      </div>

      {/* Habit Tracker */}
      <HabitTracker />

    </main>
  );
}