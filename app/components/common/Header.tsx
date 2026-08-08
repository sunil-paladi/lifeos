"use client";

import { profile } from "@/app/data/profile";
import { quotes } from "@/app/data/quotes";

export default function Header() {
  const today = new Date();

  const formattedDate = today.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  // Quote of the Day
  const quote = quotes[today.getDate() % quotes.length];

  return (
    <header className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
        {/* Left Section */}
        <div className="flex-1">
          <p className="text-sm font-medium text-slate-500">
            👋 Welcome back, {profile.name}!
          </p>

          <h1 className="mt-3 text-4xl font-bold leading-tight text-slate-900">
            Are you ready for today's challenge!
          </h1>

          <p className="mt-4 flex items-center gap-2 text-slate-500">
            📅 {formattedDate}
          </p>

          <div className="mt-5 border-l-4 border-orange-400 pl-4">
            <p className="italic text-slate-600 leading-relaxed">
              ❝ {quote} ❞
            </p>
          </div>
        </div>

        {/* Right Section */}
        <div className="flex items-start gap-4">
          {/* Fire Streak */}
          <div className="rounded-2xl border border-orange-200 bg-orange-50 px-5 py-3 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>

              <div>
                <p className="text-lg font-bold text-orange-700">
                  {profile.fireDays} Day Streak
                </p>

                <p className="text-sm text-orange-600">
                  Stay Consistent
                </p>
              </div>
            </div>
          </div>

          {/* Notification */}
          <button className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 transition-all duration-200 hover:bg-orange-100 hover:scale-105">
            🔔
          </button>

          {/* Avatar */}
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-green-600 font-bold text-white shadow-sm">
            {profile.name.charAt(0)}
          </div>
        </div>
      </div>
    </header>
  );
}