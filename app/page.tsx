"use client";
import StatCard from "./components/StatCard";
import { useState } from "react";
export default function Home() {
  const [weight, setWeight] = useState(72);
  const [water, setWater] = useState(3);
  const [steps, setSteps] = useState(8000);
    return (
    <main className="min-h-screen bg-gray-100 p-8">
      <h1 className="text-4xl font-bold text-green-600">
        🏠 Sunil's LifeOS
      </h1>

      <p className="mt-2 text-green-600">
        Hello Sunil! This is your personal dashboard.
      </p>

      <div className="mt-8 rounded-xl bg-sky-200 p-6 shadow-lg">
        <h2 className="text-2xl font-semibold">Today's Goals</h2>

        <ul className="mt-4 space-y-2">
          <li>✅ Morning Walk</li>
          <li>🏋️ Gym</li>
          <li>📚 Study Next.js</li>
          <li>💧 Drink 3 Liters Water</li>
          <li>💰 Learn Stock Investing</li>
          </ul>
      </div>
      <div className="mt-6 rounded-xl bg-sky-200 p-6 shadow-lg">
  <h2 className="text-2xl font-semibold">
    📊 Today's Stats
  </h2>
<StatCard
  title="⚖️ Weight"
  value={weight}
  unit="kg"
  onIncrease={() => setWeight(weight + 1)}
  onDecrease={() => setWeight(weight - 1)}
/>
  <StatCard
  title="💧 Water"
  value={water}
  unit="L"
  onIncrease={() => setWater(water + 1)}
  onDecrease={() => setWater(water - 1)}
/>
<StatCard
  title="👣 Steps"
  value={steps}
  unit=""
  onIncrease={() => setSteps(steps + 1)}
  onDecrease={() => setSteps(steps - 1)}
/>
</div>
<div className="mt-6 rounded-xl bg-sky-200 p-6 shadow-lg">
  <h2 className="text-2xl font-semibold">
    📚 Learning Progress
  </h2>

  <div className="mt-4">
    <p>Next.js</p>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div className="bg-green-500 h-3 rounded-full w-1/4"></div>
    </div>
  </div>

  <div className="mt-4">
    <p>Kubernetes</p>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div className="bg-blue-500 h-3 rounded-full w-1/2"></div>
    </div>
  </div>

  <div className="mt-4">
    <p>OpenShift</p>
    <div className="w-full bg-gray-200 rounded-full h-3">
      <div className="bg-red-500 h-3 rounded-full w-1/3"></div>
    </div>
  </div>
</div>
    </main>
  );
}