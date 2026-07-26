"use client";

import { useState } from "react";
import StatCard from "./components/StatCard";
import WorkoutTracker from "./components/WorkoutTracker";

export default function Home() {
  const [weight] = useState(72.2);
  const [water] = useState(3.2);
  const [steps] = useState(7842);
  const [protein] = useState(92);

  return (
    <main className="min-h-screen bg-slate-100">

      {/* Header */}

      <header className="bg-gradient-to-r from-green-600 to-emerald-500 text-white shadow-lg">

        <div className="max-w-7xl mx-auto px-8 py-8">

          <h1 className="text-5xl font-bold">
            🌟 LifeOS
          </h1>

          <p className="mt-2 text-lg">
            Welcome back, Sunil 👋
          </p>

          <p className="text-green-100">
            Your personal productivity dashboard
          </p>

        </div>

      </header>

      {/* Dashboard */}

      <div className="max-w-7xl mx-auto p-8">

        {/* Progress */}

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">

          <div className="flex justify-between mb-3">

            <h2 className="text-2xl font-semibold">
              Overall Progress
            </h2>

            <span className="font-bold text-green-600">
              72%
            </span>

          </div>

          <div className="w-full h-5 bg-gray-200 rounded-full">

            <div
              className="h-5 bg-green-500 rounded-full"
              style={{ width: "72%" }}
            />

          </div>

        </div>

        {/* Stats */}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">

          <StatCard
            title="Weight"
            value={weight}
            unit="kg"
            icon="⚖️"
          />

          <StatCard
            title="Water"
            value={water}
            unit="L"
            icon="💧"
          />

          <StatCard
            title="Protein"
            value={protein}
            unit="g"
            icon="🥩"
          />

          <StatCard
            title="Steps"
            value={steps}
            icon="👣"
          />

        </div>

        {/* Workout */}

        <div className="mb-8">

          <WorkoutTracker />

        </div>

        {/* Daily Habits */}

        <div className="bg-white rounded-2xl shadow-md p-6 mb-8">

          <h2 className="text-2xl font-semibold mb-5">
            📖 Today's Habits
          </h2>

          <div className="grid md:grid-cols-2 gap-4">

            <Habit text="Gym Workout" done />
            <Habit text="Walk 20 Minutes" done />
            <Habit text="English Practice" done />
            <Habit text="DevOps Learning" />
            <Habit text="Meditation" />
            <Habit text="Read 10 Pages" />

          </div>

        </div>

        {/* Journal */}

        <div className="bg-white rounded-2xl shadow-md p-6">

          <h2 className="text-2xl font-semibold mb-5">
            📝 Journal
          </h2>

          <textarea
            className="w-full border rounded-xl p-4 h-40 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
            placeholder="Write today's notes..."
          />

        </div>

      </div>

    </main>
  );
}

function Habit({
  text,
  done = false,
}: {
  text: string;
  done?: boolean;
}) {
  return (
    <div
      className={`rounded-xl p-4 font-medium ${
        done
          ? "bg-green-100 text-green-700"
          : "bg-gray-100 text-gray-600"
      }`}
    >
      {done ? "✅" : "⬜"} {text}
    </div>
  );
}