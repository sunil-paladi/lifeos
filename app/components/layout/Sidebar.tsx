"use client";

import Link from "next/link";
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ClipboardCheck,
  CreditCard,
  Droplets,
  Dumbbell,
  FileText,
  LayoutDashboard,
  Salad,
  Settings,
  ShieldCheck,
  Users,
  UserCog,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { AppUser } from "./AppShell";

const mainMenu = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: "Workout",
    icon: Dumbbell,
    path: "/workout",
  },
  {
    label: "Attendance",
    icon: ClipboardCheck,
    path: "/attendance",
  },
  {
    label: "Nutrition",
    icon: Salad,
    path: "/nutrition",
  },
  {
    label: "Water",
    icon: Droplets,
    path: "/water",
  },
  {
    label: "Habits",
    icon: CheckSquare,
    path: "/habits",
  },
  {
    label: "Journal",
    icon: BookOpen,
    path: "/journal",
  },
];

const insightMenu = [
  {
    label: "Analytics",
    icon: BarChart3,
    path: "/analytics",
  },
  {
    label: "Reports",
    icon: FileText,
    path: "/reports",
  },
];

interface SidebarProps {
  mobile?: boolean;
  onNavigate?: () => void;
  user: AppUser;
  hasTrainerMembership: boolean;
  hasOwnerMembership: boolean;
}

export default function Sidebar({
  mobile = false,
  onNavigate,
  user,
  hasTrainerMembership,
  hasOwnerMembership,
}: SidebarProps) {
  const pathname = usePathname();

  function isActive(path: string) {
    if (path === "/") {
      return pathname === "/";
    }

    return (
      pathname === path ||
      pathname.startsWith(`${path}/`)
    );
  }

  return (
    <aside
      className={
        mobile
          ? "flex h-full min-h-0 w-full flex-col overflow-hidden bg-card text-foreground"
          : "fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-border bg-card text-foreground lg:flex"
      }
    >
      {/* ======================================== */}
      {/* BRAND */}
      {/* ======================================== */}

      <div className="flex h-20 shrink-0 items-center border-b border-border px-6">
        <Link
          href="/dashboard"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary shadow-sm">
            <Dumbbell size={21} strokeWidth={2.2} />
          </div>

          <div>
            <h1 className="text-xl font-bold tracking-tight">
              LifeOS
            </h1>

            <p className="mt-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              Stay Consistent
            </p>
          </div>
        </Link>
      </div>

      {/* ======================================== */}
      {/* NAVIGATION */}
      {/* ======================================== */}

      <nav className="flex-1 overflow-y-auto px-3 py-5 [&_a:focus-visible]:outline-none [&_a:focus-visible]:ring-2 [&_a:focus-visible]:ring-primary [&_a:focus-visible]:ring-offset-2">
        {/* Main */}
        <div>
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Main
          </p>

          <div className="space-y-1">
            {mainMenu.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.label}
                  href={item.path}
                  onClick={onNavigate}
                  className={`group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
                  }`}
                >
                  {typeof Icon === "string" ? (
                    <span className="flex h-[18px] w-[18px] items-center justify-center text-base">
                      {Icon}
                    </span>
                  ) : (
                    <Icon
                      size={18}
                      strokeWidth={active ? 2.2 : 1.8}
                      className={
                        active
                          ? "text-primary-foreground"
                          : "text-slate-500 transition-colors group-hover:text-slate-900"
                      }
                    />
                  )}

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-7">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Insights
          </p>

          <div className="space-y-1">
            {insightMenu.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.path);

              return (
                <Link
                  key={item.label}
                  href={item.path}
                  onClick={onNavigate}
                  className={`group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                    active
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
                  }`}
                >
                  <Icon
                    size={18}
                    strokeWidth={active ? 2.2 : 1.8}
                    className={
                      active
                        ? "text-primary-foreground"
                        : "text-slate-500 transition-colors group-hover:text-slate-900"
                    }
                  />

                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        {hasTrainerMembership ? (
          <div className="mt-7">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Gym
            </p>

            <Link
              href="/trainer"
              onClick={onNavigate}
              className={`group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/trainer")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <ShieldCheck
                size={18}
                strokeWidth={isActive("/trainer") ? 2.2 : 1.8}
                className={
                  isActive("/trainer")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />

              <span>Trainer Dashboard</span>
            </Link>

            <Link
              href="/trainer/sessions"
              onClick={onNavigate}
              className={`group mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/trainer/sessions")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <CalendarDays
                size={18}
                strokeWidth={isActive("/trainer/sessions") ? 2.2 : 1.8}
                className={
                  isActive("/trainer/sessions")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />
              <span>PT Sessions</span>
            </Link>

            <Link
              href="/trainer/attendance"
              onClick={onNavigate}
              className={`group mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/trainer/attendance")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <ClipboardCheck
                size={18}
                strokeWidth={isActive("/trainer/attendance") ? 2.2 : 1.8}
                className={
                  isActive("/trainer/attendance")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />
              <span>Client Attendance</span>
            </Link>
          </div>
        ) : null}

        {hasOwnerMembership ? (
          <div className="mt-7">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Owner
            </p>

            <Link
              href="/owner/members"
              onClick={onNavigate}
              className={`group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/owner/members")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <Users
                size={18}
                strokeWidth={isActive("/owner/members") ? 2.2 : 1.8}
                className={
                  isActive("/owner/members")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />

              <span>Members</span>
            </Link>

            <Link
              href="/owner/attendance"
              onClick={onNavigate}
              className={`group mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/owner/attendance")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <ClipboardCheck
                size={18}
                strokeWidth={isActive("/owner/attendance") ? 2.2 : 1.8}
                className={
                  isActive("/owner/attendance")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />
              <span>Attendance</span>
            </Link>

            <Link
              href="/owner/pt-sessions"
              onClick={onNavigate}
              className={`group mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/owner/pt-sessions")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <CalendarDays
                size={18}
                strokeWidth={isActive("/owner/pt-sessions") ? 2.2 : 1.8}
                className={
                  isActive("/owner/pt-sessions")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />
              <span>PT Sessions</span>
            </Link>

            <Link
              href="/owner/statistics"
              onClick={onNavigate}
              className={`group mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/owner/statistics")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <BarChart3
                size={18}
                strokeWidth={isActive("/owner/statistics") ? 2.2 : 1.8}
                className={
                  isActive("/owner/statistics")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />
              <span>Owner Statistics</span>
            </Link>

            <Link
              href="/owner/billing"
              onClick={onNavigate}
              className={`group mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/owner/billing")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <CreditCard
                size={18}
                strokeWidth={isActive("/owner/billing") ? 2.2 : 1.8}
                className={
                  isActive("/owner/billing")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />
              <span>Billing</span>
            </Link>

            <Link
              href="/owner/settings"
              onClick={onNavigate}
              className={`group mt-1 flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/owner/settings")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <Settings
                size={18}
                strokeWidth={isActive("/owner/settings") ? 2.2 : 1.8}
                className={
                  isActive("/owner/settings")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />

              <span>Gym Settings</span>
            </Link>

            <Link
              href="/owner/staff"
              onClick={onNavigate}
              className={`group flex min-h-11 w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
                isActive("/owner/staff")
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
              }`}
            >
              <UserCog
                size={18}
                strokeWidth={isActive("/owner/staff") ? 2.2 : 1.8}
                className={
                  isActive("/owner/staff")
                    ? "text-primary-foreground"
                    : "text-slate-500 transition-colors group-hover:text-slate-900"
                }
              />

              <span>Staff / Trainers</span>
            </Link>
          </div>
        ) : null}

        {/* Settings */}
        <div className="mt-7">
          <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            System
          </p>

          <Link
            href="/settings"
            onClick={onNavigate}
            className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
              isActive("/settings")
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-slate-600 hover:bg-primary/10 hover:text-slate-900"
            }`}
          >
            <Settings
              size={18}
              strokeWidth={
                isActive("/settings") ? 2.2 : 1.8
              }
              className={
                isActive("/settings")
                  ? "text-primary-foreground"
                  : "text-slate-500 transition-colors group-hover:text-slate-900"
              }
            />

            <span>Settings</span>
          </Link>
        </div>
      </nav>

      {/* ======================================== */}
      {/* USER PROFILE */}
      {/* ======================================== */}

      <div className="shrink-0 border-t border-border p-3">
        <div className="rounded-xl border border-border bg-muted/60 p-3">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
              {user.name
                .split(" ")
                .filter(Boolean)
                .map((part) => part[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-primary" />

                <p className="truncate text-sm font-semibold text-foreground">
                  {user.name}
                </p>
              </div>

              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {user.username
                  ? `@${user.username}`
                  : "Personal Account"}
              </p>
            </div>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-2 border-t border-border pt-3">
            <div className="rounded-lg bg-card px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Streak
              </p>

              <p className="mt-0.5 text-xs font-bold text-orange-400">
                🔥 5 Days
              </p>
            </div>

            <div className="rounded-lg bg-card px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Status
              </p>

              <p className="mt-0.5 text-xs font-bold text-primary">
                Active
              </p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}