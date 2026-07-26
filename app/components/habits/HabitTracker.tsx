"use client";

export default function HabitTracker() {
  const habits = [
    { name: "🏃 Morning Walk", completed: true },
    { name: "💪 Gym", completed: true },
    { name: "📖 Read 30 Minutes", completed: false },
    { name: "🗣 English Practice", completed: true },
    { name: "🧘 Meditation", completed: false },
    { name: "💧 Drink 3L Water", completed: true },
  ];

  const completedCount = habits.filter((h) => h.completed).length;
  const progress = Math.round((completedCount / habits.length) * 100);

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-8">
      <h2 className="text-2xl font-bold mb-1">🎯 Today's Habits</h2>

      <p className="text-gray-500 mb-6">
        Build consistency every day
      </p>

      <div className="space-y-4">
        {habits.map((habit, index) => (
          <div
            key={index}
            className="flex items-center justify-between bg-gray-50 rounded-xl p-4"
          >
            <span className="font-medium">{habit.name}</span>

            <input
              type="checkbox"
              checked={habit.completed}
              readOnly
              className="w-5 h-5"
            />
          </div>
        ))}
      </div>

      <div className="mt-8">
        <div className="flex justify-between mb-2">
          <span className="font-semibold">Today's Progress</span>
          <span>{progress}%</span>
        </div>

        <div className="w-full bg-gray-200 rounded-full h-4">
          <div
            className="bg-green-500 h-4 rounded-full"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}