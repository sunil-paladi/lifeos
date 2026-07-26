"use client";

const menuItems = [
  { icon: "🏠", title: "Dashboard" },
  { icon: "🏋️", title: "Workout" },
  { icon: "🥗", title: "Nutrition" },
  { icon: "💧", title: "Water" },
  { icon: "📖", title: "Habits" },
  { icon: "📝", title: "Journal" },
  { icon: "📈", title: "Analytics" },
  { icon: "⚙️", title: "Settings" },
];

export default function Sidebar() {
  return (
    <aside className="w-72 min-h-screen bg-slate-900 text-white flex flex-col">

      <div className="p-8 border-b border-slate-700">

        <h1 className="text-3xl font-bold text-green-400">
          🌟 LifeOS
        </h1>

        <p className="text-sm text-slate-400 mt-2">
          Personal Productivity
        </p>

      </div>

      <nav className="flex-1 px-4 py-6">

        {menuItems.map((item) => (
          <button
            key={item.title}
            className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-800 transition text-left mb-2"
          >
            <span className="text-xl">{item.icon}</span>

            <span className="font-medium">
              {item.title}
            </span>
          </button>
        ))}

      </nav>

      <div className="p-6 border-t border-slate-700">

        <div className="bg-slate-800 rounded-xl p-4">

          <p className="text-sm text-slate-400">
            Logged in as
          </p>

          <p className="font-semibold mt-1">
            Sunil Kumar
          </p>

        </div>

      </div>

    </aside>
  );
}