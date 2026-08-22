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
    <header className="rounded-2xl border border-slate-200 bg-white px-6 py-6 shadow-sm sm:px-7 sm:py-7">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

        {/* =====================================================
            LEFT SECTION
        ===================================================== */}

        <div className="min-w-0 flex-1">

          {/* Welcome */}
          <p className="text-xs font-medium text-slate-500 sm:text-sm">
            👋 Welcome back, {profile.name}!
          </p>

          {/* Main Heading */}
          <h1 className="mt-2 text-3xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl lg:text-4xl">
            Are you ready for today's challenge?
          </h1>

          {/* Date */}
          <p className="mt-3 flex items-center gap-2 text-sm font-medium text-slate-500">
            📅 {formattedDate}
          </p>

          {/* Quote */}
          <div className="mt-4 border-l-4 border-orange-400 pl-3 sm:pl-4">
            <p className="text-sm italic leading-relaxed text-slate-600">
              ❝ {quote} ❞
            </p>
          </div>

        </div>

        {/* =====================================================
            RIGHT SECTION
        ===================================================== */}

        <div className="flex shrink-0 items-center gap-3">

          {/* Fire Streak */}
          <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-2.5 shadow-sm">
            <div className="flex items-center gap-2.5">

              <span className="text-2xl">
                🔥
              </span>

              <div>
                <p className="text-base font-bold leading-tight text-orange-700">
                  {profile.fireDays} Day Streak
                </p>

                <p className="mt-0.5 text-xs text-orange-600">
                  Stay Consistent
                </p>
              </div>

            </div>
          </div>

          {/* Notification */}
          <button
            type="button"
            aria-label="Notifications"
            className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-base transition-all duration-200 hover:scale-105 hover:bg-orange-100"
          >
            🔔
          </button>

        </div>

      </div>
    </header>
  );
}