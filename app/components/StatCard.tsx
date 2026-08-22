type BaseStat = {
  start?: number;
  current?: number;
  goal?: number;
  unit?: string;
  lastUpdated?: string;

  completed?: number;
  target?: number;
  streak?: number;
};

type StatCardProps = {
  title: string;
  icon: string;
  stat: BaseStat;
};

export default function StatCard({
  title,
  icon,
  stat,
}: StatCardProps) {
  const isWorkout =
    stat.completed !== undefined &&
    stat.target !== undefined;

  // Progress
  let progress = 0;

  if (isWorkout) {
    progress = Math.round(
      ((stat.completed ?? 0) / (stat.target ?? 1)) * 100
    );
  } else {
    const start = stat.start ?? 0;
    const current = stat.current ?? 0;
    const goal = stat.goal ?? 0;

    if (start !== goal) {
      progress = Math.round(
        ((start - current) / (start - goal)) * 100
      );
    }
  }

  progress = Math.max(0, Math.min(progress, 100));

  // Remaining
  let remainingText = "";

  if (!isWorkout) {
    const current = stat.current ?? 0;
    const goal = stat.goal ?? 0;
    const unit = stat.unit ?? "";

    if (current > goal) {
      remainingText = `⬇ ${(current - goal).toFixed(1)} ${unit} Remaining`;
    } else if (current < goal) {
      remainingText = `⬆ ${(goal - current).toFixed(1)} ${unit} To Gain`;
    } else {
      remainingText = "🎉 Goal Achieved";
    }
  }

  // Status
  let status = "";
  let statusColor = "";
  let progressColor = "";

  if (progress >= 80) {
    status = "🟢 Excellent";
    statusColor = "text-green-600";
    progressColor = "bg-green-500";
  } else if (progress >= 50) {
    status = "🟡 Keep Going";
    statusColor = "text-yellow-600";
    progressColor = "bg-yellow-500";
  } else {
    status = "🔴 Let's Push";
    statusColor = "text-red-600";
    progressColor = "bg-red-500";
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium uppercase tracking-wide text-slate-500">
            {title}
          </p>

          {isWorkout ? (
            <h2 className="mt-2 text-4xl font-bold text-slate-900">
              {stat.completed}
              <span className="ml-1 text-2xl text-slate-400">
                /{stat.target}
              </span>
            </h2>
          ) : (
            <h2 className="mt-2 text-4xl font-bold text-slate-900">
              {stat.current}

              {stat.unit && (
                <span className="ml-2 text-lg font-medium text-slate-500">
                  {stat.unit}
                </span>
              )}
            </h2>
          )}
        </div>

        <div className="text-5xl">
          {icon}
        </div>
      </div>

      {/* Divider */}
      <div className="my-5 border-t border-slate-200" />

      {isWorkout ? (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              Current Streak
            </span>

            <span className="font-semibold text-orange-600">
              🔥 {stat.streak} Days

              <p className={`mt-2 text-sm font-semibold ${statusColor}`}>
                {status}
              </p>
            </span>
          </div>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${progressColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="flex justify-between text-sm">
            <span className="text-slate-500">
              🎯 Goal
            </span>

            <span className="font-semibold text-slate-800">
              {stat.goal} {stat.unit}
            </span>
          </div>

          <p className={`mt-2 text-sm font-semibold ${statusColor}`}>
            {status}
          </p>

          <div className="mt-4">
            <div className="mb-1 flex justify-between text-xs text-slate-500">
              <span>Progress</span>
              <span>{progress}%</span>
            </div>

            <div className="h-2 w-full rounded-full bg-slate-200">
              <div
                className={`h-2 rounded-full transition-all duration-700 ${progressColor}`}
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          <div className="mt-4 flex justify-between text-xs text-slate-400">
            <span>Updated</span>
            <span>{stat.lastUpdated}</span>
          </div>
        </>
      )}
    </div>
  );
}