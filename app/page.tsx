import Header from "./components/common/Header";
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
import TodaysWorkout from "@/app/components/workout/TodaysWorkout";
import WorkoutHistory from "@/app/components/workout/WorkoutHistory";

export default function Home() {
  return (
    <main className="w-full">

      {/* Dashboard Header */}
      <Header />

      {/* Today's Mission */}
      <div className="mt-5">
        <TodaysMission />
      </div>

      {/* Top Statistics */}
      <div className="mt-5 grid grid-cols-1 gap-5 md:grid-cols-3">

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
      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">

        {/* Left Column */}
        <div className="space-y-5">
          <WorkoutTracker />
          <HabitTracker />
        </div>

        {/* Right Column */}
        <div className="space-y-5">
          <NutritionTracker />
          <Journal />
        </div>

      </div>

      {/* Weekly Progress */}
      <div className="mt-5">
        <WeeklyProgress />
      </div>

      {/* Workout Program */}
      <div className="mt-5">
        <ProgramBuilder />
      </div>

      {/* Exercise Library */}
      <div className="mt-5">
        <ExerciseLibrary />
      </div>

      {/* Today's Workout */}
      <div className="mt-5">
        <TodaysWorkout />
      </div>

      {/* Workout History */}
      <div className="mt-5">
        <WorkoutHistory />
      </div>

    </main>
  );
}