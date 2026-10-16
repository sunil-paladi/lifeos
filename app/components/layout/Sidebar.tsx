"use client";

import Image from "next/image";
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
  Settings,
  ShieldCheck,
  UserCog,
  Users,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/app/components/theme/ThemeProvider";
import type { AppUser } from "./AppShell";

const mainMenu = [
  {
    label: "Dashboard",
    icon: LayoutDashboard,
    path: "/",
  },
  {
    label: "Workout",
    icon: Dumbbell,
    path: "/workout",
  },
  {
    label: "Nutrition",
    icon: "🍽️",
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

const ownerMenu = [
  { label: "Members", icon: Users, path: "/owner/members" },
  { label: "Attendance", icon: ClipboardCheck, path: "/owner/attendance" },
  { label: "PT Sessions", icon: CalendarDays, path: "/owner/pt-sessions" },
  { label: "Owner Statistics", icon: BarChart3, path: "/owner/statistics" },
  { label: "Billing", icon: CreditCard, path: "/owner/billing" },
  { label: "Gym Settings", icon: Settings, path: "/owner/settings" },
  { label: "Staff / Trainers", icon: UserCog, path: "/owner/staff" },
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
  const { theme } = useTheme();

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
          href="/"
          onClick={onNavigate}
          className="flex w-full items-center justify-center rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
        >
          <Image
            src={theme === "dark" ? "/consistfit-wordmark-dark.svg" : "/consistfit-wordmark-light.svg"}
            alt="ConsistFit"
            width={1800}
            height={615}
            className="h-auto w-full max-w-[208px] object-contain"
            priority
          />
        </Link>
      </div>

      {/* ======================================== */}
      {/* NAVIGATION */}
      {/* ======================================== */}

      <nav className="flex-1 overflow-y-auto px-3 py-5">
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
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
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
                  className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
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
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
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
              href="/trainer/attendance"
              onClick={onNavigate}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
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

            <Link
              href="/trainer/sessions"
              onClick={onNavigate}
              className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 ${
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
          </div>
        ) : null}

        {hasOwnerMembership ? (
          <div className="mt-7">
            <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Owner
            </p>
            <div className="space-y-1">
              {ownerMenu.map(({ label, icon: Icon, path }) => {
                const active = isActive(path);
                return (
                  <Link
                    key={path}
                    href={path}
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
                    <span>{label}</span>
                  </Link>
                );
              })}
            </div>
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
                <span className="h-2 w-2 rounded-full bg-green-500" />

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
            <div className="rounded-lg bg-muted px-2 py-2 text-center">
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
                Streak
              </p>

              <p className="mt-0.5 text-xs font-bold text-secondary">
                🔥 5 Days
              </p>
            </div>

            <div className="rounded-lg bg-muted px-2 py-2 text-center">
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