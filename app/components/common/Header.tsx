"use client";

export default function Header() {
  const today = new Date();

  const date = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <header className="bg-white rounded-2xl shadow-sm p-6 flex items-center justify-between">
      <div>
        <p className="text-gray-500 text-sm">Welcome back 👋</p>

        <h1 className="text-3xl font-bold text-slate-800 mt-1">
          Good Morning, Sunil
        </h1>

        <p className="text-gray-500 mt-2">{date}</p>
      </div>

      <div className="flex items-center gap-4">
        <button className="w-12 h-12 rounded-full bg-slate-100 hover:bg-slate-200 transition text-xl">
          🔔
        </button>

        <div className="w-12 h-12 rounded-full bg-green-600 text-white flex items-center justify-center font-bold">
          S
        </div>
      </div>
    </header>
  );
}