import Header from "./components/common/Header";
import Sidebar from "./components/common/Sidebar";
import StatCard from "./components/StatCard";
import WorkoutTracker from "./components/WorkoutTracker";
import NutritionTracker from "./components/nutrition/NutritionTracker";
import HabitTracker from "./components/habits/HabitTracker";
import Journal from "./components/journal/Journal";
import { dashboardData } from "./data/dashboard";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        <Header />

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
          <StatCard
            title="Weight"
            value="72.2"
            unit="kg"
            icon="⚖️"
          />

          <StatCard
            title="Body Fat"
            value="24.5"
            unit="%"
            icon="🔥"
          />

          <StatCard
            title="Workouts"
            value="5/6"
            icon="💪"
          />
        </div>

        {/* Dashboard Content */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">

          {/* Left Column */}
          <div>
            <WorkoutTracker />

            <HabitTracker />
          </div>

          {/* Right Column */}
          <div>
            <NutritionTracker />

            <Journal />
          </div>

        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
  {dashboardData.stats.map((stat) => (
    <StatCard
      key={stat.title}
      title={stat.title}
      value={stat.value}
      unit={stat.unit}
      icon={stat.icon}
    />
  ))}
</div>
      </main>
    </div>
  );
}