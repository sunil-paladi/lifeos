export default function TodaysMission() {
  const missions = [
    {
      title: "Complete Chest Workout",
      completed: true,
    },
    {
      title: "Learn Kubernetes (30 mins)",
      completed: false,
    },
    {
      title: "Drink 3L Water",
      completed: false,
    },
  ];

  const completed = missions.filter((m) => m.completed).length;
  const progress = (completed / missions.length) * 100;

  return (
    <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900">
            🎯 Today's Mission
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Complete your daily goals and keep your fire alive.
          </p>
        </div>

        <div className="rounded-full bg-green-100 px-4 py-2">
          <span className="text-sm font-semibold text-green-700">
            {completed}/{missions.length} Completed
          </span>
        </div>
      </div>

      {/* Mission List */}
      <div className="mt-6 space-y-3">
        {missions.map((mission, index) => (
          <div
            key={index}
            className="flex items-center justify-between rounded-xl border border-slate-200 p-4"
          >
            <div className="flex items-center gap-3">
              <div
                className={`flex h-6 w-6 items-center justify-center rounded-full border ${
                  mission.completed
                    ? "border-green-600 bg-green-600 text-white"
                    : "border-slate-300"
                }`}
              >
                {mission.completed ? "✓" : ""}
              </div>

              <p className="font-medium text-slate-700">
                {mission.title}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Progress */}
      <div className="mt-6">
        <div className="mb-2 flex justify-between text-sm">
          <span className="text-slate-500">Today's Progress</span>
          <span className="font-semibold text-slate-700">
            {Math.round(progress)}%
          </span>
        </div>

        <div className="h-3 rounded-full bg-slate-200">
          <div
            className="h-3 rounded-full bg-green-600 transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}