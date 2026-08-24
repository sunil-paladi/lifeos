"use client";

import Image from "next/image";
import { profile } from "@/app/data/profile";

import {
  Home,
  Dumbbell,
  Salad,
  Droplets,
  BookOpen,
  NotebookPen,
  BarChart3,
  FileText,
  Settings,
} from "lucide-react";

const menuItems = [
  { icon: Home, title: "Dashboard" },
  { icon: Dumbbell, title: "Workout" },
  { icon: Salad, title: "Nutrition" },
  { icon: Droplets, title: "Water" },
  { icon: BookOpen, title: "Habits" },
  { icon: NotebookPen, title: "Journal" },
  { icon: BarChart3, title: "Analytics" },
  { icon: FileText, title: "Reports" },
  { icon: Settings, title: "Settings" },
];

export default function Sidebar() {
  // ==========================
  // Consistency Badge
  // ==========================
  let badge = "";
  let badgeColor = "";

  if (profile.consistency >= 100) {
    badge = "💎 Diamond";
    badgeColor = "text-cyan-400";
  } else if (profile.consistency >= 90) {
    badge = "🥇 Gold";
    badgeColor = "text-yellow-400";
  } else if (profile.consistency >= 80) {
    badge = "🥈 Silver";
    badgeColor = "text-slate-300";
  } else if (profile.consistency >= 70) {
    badge = "🥉 Bronze";
    badgeColor = "text-orange-400";
  } else {
    badge = "🌱 Beginner";
    badgeColor = "text-green-400";
  }

  // ==========================
  // Streak Color
  // ==========================
  let streakColor = "text-orange-400";

  if (profile.fireDays >= 100) {
    streakColor = "text-purple-400";
  } else if (profile.fireDays >= 30) {
    streakColor = "text-blue-400";
  } else if (profile.fireDays >= 7) {
    streakColor = "text-green-400";
  }

  return (
    <aside className="flex min-h-screen w-72 flex-col bg-slate-900 text-white">
      {/* ================= Logo ================= */}
      <div className="flex flex-col items-center border-b border-slate-700 py-8">
        <Image
          src="/lifeos-logo.svg"
          alt="LifeOS Logo"
          width={60}
          height={60}
          priority
          className="transition-transform duration-300 hover:scale-110"
        />

        <h1 className="mt-4 text-3xl font-bold tracking-tight text-white">
          LifeOS
        </h1>

        <p className="mt-1 text-xs font-medium tracking-wide text-green-400">
          Stay Consistent
        </p>
      </div>

      {/* ================= Navigation ================= */}
      <nav className="flex-1 px-4 py-6">
        {menuItems.map((item, index) => {
          const Icon = item.icon;
          const isActive = index === 0;

          return (
            <button
              key={item.title}
              className={`mb-2 flex w-full items-center gap-4 rounded-xl px-4 py-3 text-left transition-all duration-200 ${
                isActive
                  ? "bg-green-600 text-white shadow-md"
                  : "hover:translate-x-1 hover:bg-slate-800"
              }`}
            >
              <Icon
                size={22}
                className={isActive ? "text-white" : "text-slate-300"}
              />

              <span className="font-medium">{item.title}</span>
            </button>
          );
        })}
      </nav>

      {/* ================= User Card ================= */}
      <div className="border-t border-slate-700 p-6">
        <div className="rounded-2xl border border-slate-700 bg-gradient-to-br from-slate-800 to-slate-900 p-5 shadow-lg transition-all duration-300 hover:scale-[1.02] hover:border-green-500">
          {/* Online */}
          <div className="flex items-center gap-2">
            <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-green-400"></div>

            <span className="text-xs text-slate-400">Online</span>
          </div>

          {/* Name */}
          <h3 className="mt-3 text-lg font-bold text-white">
            {profile.name}
          </h3>

          {/* Motto */}
          <p className="mt-2 text-base italic font-bold tracking-wide text-amber-300">
            ★ Small Wins Matter ★
          </p>

          <div className="my-4 border-t border-slate-700"></div>

          {/* Current Streak */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-slate-400">
              🔥 Current Streak
            </span>

            <span
              className={`font-semibold ${
                profile.fireDays >= 100
                  ? "text-purple-400"
                  : profile.fireDays >= 30
                  ? "text-blue-400"
                  : profile.fireDays >= 7
                  ? "text-green-400"
                  : "text-orange-400"
              }`}
            >
              {profile.fireDays} Days
            </span>
          </div>

          {/* Active Days */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-slate-400">
              📅 Active Days
            </span>

            <span className="font-semibold text-white">
              {profile.activeDays}/{profile.totalDays}
            </span>
          </div>

          {/* Consistency */}
          <div className="flex items-center justify-between py-1">
            <span className="text-sm text-slate-400">
              🏆 Consistency
            </span>

            <div className="text-right">
              <p className={`font-bold ${badgeColor}`}>
                {badge}
              </p>

              <p className="text-xs text-slate-400">
                {profile.consistency}%
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
