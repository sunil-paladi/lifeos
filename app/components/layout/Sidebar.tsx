"use client";

import {
  BarChart3,
  BookOpen,
  CheckSquare,
  Droplets,
  Dumbbell,
  LayoutDashboard,
  Settings,
  Utensils,
} from "lucide-react";

const mainMenu = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
  },
  {
    label: "Workout",
    icon: Dumbbell,
  },
  {
    label: "Nutrition",
    icon: Utensils,
  },
  {
    label: "Water",
    icon: Droplets,
  },
  {
    label: "Habits",
    icon: CheckSquare,
  },
  {
    label: "Journal",
    icon: BookOpen,
  },
];

const insightMenu = [
  {
    label: "Analytics",
    icon: BarChart3,
  },
];

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
}

export default function Sidebar({
  mobile = false,
  onNavigate,
}: SidebarProps) {
  return (
    <aside
      className={
        mobile
          ? "flex h-full w-72 flex-col overflow-hidden bg-slate-950 text-white"
          : "fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-slate-800 bg-slate-950 text-white lg:flex"
      }
    >

      {/* ========================================= */}
      {/* BRAND */}
      {/* ========================================= */}

      <div className="flex h-20 shrink-0 items-center border-b border-slate-800 px-6">

        <div className="flex items-center gap-3">

          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-xl shadow-sm">
            🌈
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              LifeOS
            </h1>

            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-green-400">
              Stay Consistent
            </p>
          </div>

        </div>

      </div>

      {/* ========================================= */}
      {/* NAVIGATION */}
      {/* ========================================= */}

      <nav className="flex-1 overflow-y-auto px-3 py-5">

        {/* Main */}
        <div>

          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Main
          </p>

          <div className="space-y-1">

            {mainMenu.map(
              (item, index) => {
                const Icon = item.icon;

                const isActive =
                  index === 0;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={onNavigate}
                    className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                      isActive
                        ? "bg-green-600 text-white shadow-sm"
                        : "text-slate-300 hover:bg-slate-800 hover:text-white"
                    }`}
                  >

                    <Icon
                      size={18}
                      strokeWidth={
                        isActive ? 2.2 : 1.8
                      }
                      className={
                        isActive
                          ? "text-white"
                          : "text-slate-400 transition-colors group-hover:text-white"
                      }
                    />

                    <span>
                      {item.label}
                    </span>

                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* Insights */}
        <div className="mt-7">

          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Insights
          </p>

          <div className="space-y-1">

            {insightMenu.map(
              (item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.label}
                    type="button"
                    onClick={onNavigate}
                    className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all duration-150 hover:bg-slate-800 hover:text-white"
                  >

                    <Icon
                      size={18}
                      strokeWidth={1.8}
                      className="text-slate-400 transition-colors group-hover:text-white"
                    />

                    <span>
                      {item.label}
                    </span>

                  </button>
                );
              }
            )}

          </div>

        </div>

        {/* Settings */}
        <div className="mt-7">

          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            System
          </p>

          <button
            type="button"
            onClick={onNavigate}
            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-300 transition-all duration-150 hover:bg-slate-800 hover:text-white"
          >

            <Settings
              size={18}
              strokeWidth={1.8}
              className="text-slate-400 transition-colors group-hover:text-white"
            />

            <span>
              Settings
            </span>

          </button>

        </div>

      </nav>

      {/* ========================================= */}
      {/* USER PROFILE */}
      {/* ========================================= */}

      <div className="shrink-0 border-t border-slate-800 p-3">

        <div className="rounded-xl border border-slate-800 bg-slate-900/80 p-3">

          <div className="flex items-center gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
              S
            </div>

            <div className="min-w-0 flex-1">

              <div className="flex items-center gap-1.5">

                <span className="h-2 w-2 rounded-full bg-green-500" />

                <p className="truncate text-sm font-semibold text-white">
                  Sunil Kumar
                </p>

              </div>

              <p className="mt-0.5 text-xs text-slate-400">
                Personal Account
              </p>

            </div>

          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">

            <div className="rounded-lg bg-slate-800/60 px-2 py-2 text-center">

              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Streak
              </p>

              <p className="mt-0.5 text-xs font-bold text-orange-400">
                🔥 5 Days
              </p>

            </div>

            <div className="rounded-lg bg-slate-800/60 px-2 py-2 text-center">

              <p className="text-[10px] uppercase tracking-wide text-slate-500">
                Status
              </p>

              <p className="mt-0.5 text-xs font-bold text-green-400">
                Active
              </p>

            </div>

          </div>

        </div>

      </div>

    </aside>
  );
}