import NutritionTracker from "@/app/components/nutrition/NutritionTracker";

export default function NutritionPage() {
  return (
    <main className="w-full space-y-5">

      {/* Page Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
          Nutrition
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Your Nutrition
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Track your meals, calories and daily macronutrients.
        </p>
      </div>

      {/* Nutrition Tracker */}
      <NutritionTracker />

    </main>
  );
}