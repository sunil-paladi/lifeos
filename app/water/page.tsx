import WaterTracker from "@/app/components/water/WaterTracker";

export default function WaterPage() {
  return (
    <main className="w-full space-y-5">
      {/* Page Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">
          Hydration
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Your Water
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Track your daily water intake and stay hydrated.
        </p>
      </div>

      {/* Water Tracker */}
      <WaterTracker />
    </main>
  );
}