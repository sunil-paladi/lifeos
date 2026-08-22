import StatCard from "./components/StatCard";
import WeeklyProgress from "./components/analytics/WeeklyProgress";
import { health } from "./data/health";

const features = [
  {
    icon: "🏋️",
    title: "Workout",
    description:
      "Plan your workouts, track exercises, sets, reps and progress.",
  },
  {
    icon: "🍽️",
    title: "Nutrition",
    description:
      "Track calories, protein, carbohydrates, fat and your daily meals.",
  },
  {
    icon: "🎯",
    title: "Habits",
    description:
      "Build consistency with daily habits and track your streaks.",
  },
  {
    icon: "💧",
    title: "Water",
    description:
      "Stay hydrated by tracking your daily water intake.",
  },
  {
    icon: "📝",
    title: "Journal",
    description:
      "Record your thoughts, achievements, mood and what you learned.",
  },
  {
    icon: "📊",
    title: "Analytics",
    description:
      "Understand your progress and identify areas to improve.",
  },
];

export default function Home() {
  return (
    <main className="w-full space-y-5">

      {/* ========================================= */}
      {/* HERO */}
      {/* ========================================= */}

      <section className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">

        {/* Background decoration */}
        <div className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-green-100/60 blur-3xl" />

        <div className="absolute -bottom-20 -left-20 h-64 w-64 rounded-full bg-blue-100/50 blur-3xl" />

        <div className="relative grid items-center gap-8 p-7 lg:grid-cols-[1.5fr_1fr] lg:p-10">

          {/* Hero Content */}
          <div>

            <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1.5 text-xs font-semibold text-green-700">
              🌱 Your Personal Operating System
            </div>

            <h1 className="mt-5 max-w-3xl text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-4xl lg:text-5xl">
              Build a better life,
              <span className="text-green-600">
                {" "}one day at a time.
              </span>
            </h1>

            <p className="mt-4 max-w-2xl text-base leading-7 text-slate-600">
              LifeOS brings your workouts, nutrition, habits, hydration,
              journaling and progress together in one simple place.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">
                  Focus
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  Consistency
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">
                  Goal
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  Daily Progress
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 px-4 py-3">
                <p className="text-xs font-medium text-slate-500">
                  Philosophy
                </p>
                <p className="mt-1 text-sm font-bold text-slate-900">
                  Small Steps
                </p>
              </div>

            </div>

          </div>

          {/* Motivational Visual */}
          <div className="flex justify-center lg:justify-end">

            <div className="relative flex h-64 w-64 items-center justify-center">

              <div className="absolute inset-0 rounded-full bg-green-100/70" />

              <div className="absolute inset-5 rounded-full bg-green-200/50" />

              <div className="relative flex h-48 w-48 flex-col items-center justify-center rounded-full border border-white bg-white shadow-xl">

                <div className="text-6xl">
                  🌄
                </div>

                <p className="mt-3 text-center text-sm font-bold text-slate-900">
                  Keep Moving
                </p>

                <p className="mt-1 text-center text-xs text-slate-500">
                  Progress over perfection.
                </p>

              </div>

            </div>

          </div>

        </div>
      </section>


      {/* ========================================= */}
      {/* WHY LIFEOS */}
      {/* ========================================= */}

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="text-center">

          <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
            Why LifeOS?
          </p>

          <h2 className="mt-2 text-2xl font-bold text-slate-900">
            Everything you need to improve your daily life
          </h2>

          <p className="mx-auto mt-2 max-w-2xl text-sm leading-6 text-slate-500">
            Instead of using different apps for different parts of your
            life, LifeOS gives you one place to plan, track and improve.
          </p>

        </div>


        {/* Feature Cards */}
        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">

          {features.map((feature) => (

            <div
              key={feature.title}
              className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-green-200 hover:bg-green-50/40"
            >

              <div className="flex items-start gap-3">

                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
                  {feature.icon}
                </div>

                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    {feature.title}
                  </h3>

                  <p className="mt-1 text-xs leading-5 text-slate-500">
                    {feature.description}
                  </p>
                </div>

              </div>

            </div>

          ))}

        </div>

      </section>


      {/* ========================================= */}
      {/* CURRENT OVERVIEW */}
      {/* ========================================= */}

      <section>

        <div className="mb-3">

          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your Overview
          </p>

          <h2 className="mt-1 text-xl font-bold text-slate-900">
            Keep an eye on your progress
          </h2>

        </div>

        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">

          <StatCard
            title="Weight"
            icon="⚖️"
            stat={health.weight}
          />

          <StatCard
            title="Body Fat"
            icon="🔥"
            stat={health.bodyFat}
          />

          <StatCard
            title="Workouts"
            icon="💪"
            stat={health.workouts}
          />

        </div>

      </section>


      {/* ========================================= */}
      {/* MOTIVATION */}
      {/* ========================================= */}

      <section className="overflow-hidden rounded-2xl border border-green-200 bg-green-50">

        <div className="flex flex-col items-center justify-between gap-4 px-6 py-6 text-center sm:flex-row sm:text-left">

          <div>

            <p className="text-xs font-semibold uppercase tracking-wider text-green-600">
              Today's Reminder
            </p>

            <h2 className="mt-1 text-xl font-bold text-slate-900">
              Small progress every day leads to big results.
            </h2>

            <p className="mt-1 text-sm text-slate-600">
              You don't need to be perfect. You just need to keep going.
            </p>

          </div>

          <div className="shrink-0 text-5xl">
            🔥
          </div>

        </div>

      </section>


      {/* ========================================= */}
      {/* WEEKLY PROGRESS */}
      {/* ========================================= */}

      <WeeklyProgress />

    </main>
  );
}