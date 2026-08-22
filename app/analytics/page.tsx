import WeeklyProgress from "@/app/components/analytics/WeeklyProgress";

export default function AnalyticsPage() {
  return (
    <main className="w-full space-y-5">

      {/* Page Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
          Analytics
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Your Progress
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Understand your consistency and see how you are progressing over time.
        </p>
      </div>

      {/* Weekly Progress */}
      <WeeklyProgress />

    </main>
  );
}