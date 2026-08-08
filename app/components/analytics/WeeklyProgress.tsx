export default function WeeklyProgress() {
  const progress = [
    { day: "Mon", value: 100 },
    { day: "Tue", value: 80 },
    { day: "Wed", value: 90 },
    { day: "Thu", value: 60 },
    { day: "Fri", value: 100 },
    { day: "Sat", value: 75 },
    { day: "Sun", value: 70 },
  ];

  return (
    <div className="bg-white rounded-2xl shadow-md p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold">📈 Weekly Progress</h2>
          <p className="text-sm text-gray-500">
            Track your consistency throughout the week
          </p>
        </div>

        <div className="text-right">
          <p className="text-sm text-gray-500">🔥 Fire</p>
          <p className="text-2xl font-bold text-orange-500">77%</p>
        </div>
      </div>

      <div className="space-y-4">
        {progress.map((item) => (
          <div key={item.day}>
            <div className="flex justify-between text-sm mb-1">
              <span>{item.day}</span>
              <span>{item.value}%</span>
            </div>

            <div className="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-500 rounded-full"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}