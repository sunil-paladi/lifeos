import Header from "./components/common/Header";
import Sidebar from "./components/common/Sidebar";
import StatCard from "./components/StatCard";
import WorkoutTracker from "./components/WorkoutTracker";
import NutritionTracker from "./components/nutrition/NutritionTracker";
import HabitTracker from "./components/habits/HabitTracker";
import Journal from "./components/journal/Journal";
import WeeklyProgress from "./components/analytics/WeeklyProgress";
import TodaysMission from "./components/mission/TodaysMission";
import { health } from "./data/health";
import ProgramBuilder from "./components/planner/ProgramBuilder";
import ExerciseLibrary from "./components/planner/ExerciseLibrary";

export default function Home() {
  return (
    <div className="flex min-h-screen bg-slate-100">
      {/* Sidebar */}
      <Sidebar />

      {/* Main Content */}
      <main className="flex-1 p-8 overflow-y-auto">
        {/* Header */}
        {/* Header */}
<Header />

{/* Today's Mission */}
<TodaysMission />

{/* Top Statistics */}

        {/* Top Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
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

        {/* Main Dashboard */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-8 mt-8">

          {/* Left Column */}
          <div className="space-y-8">
            <WorkoutTracker />
            <HabitTracker />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <NutritionTracker />
            <Journal />
          </div>

        </div>

        {/* Weekly Progress */}
        <div className="mt-8">
          <WeeklyProgress />
        </div>
<div className="mt-8">
  <ProgramBuilder />
</div>
 <div className="mt-8">
   <ExerciseLibrary />
</div>
      </main>
    </div>
 
);
}