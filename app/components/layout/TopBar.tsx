"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import { useState } from "react";
import Sidebar from "./Sidebar";
import type { AppUser } from "./AppShell";

interface TopBarProps {
  authenticated: boolean;
  user: AppUser | null;
}

export default function TopBar({
  authenticated,
  user,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  // ========================================
  // LOGOUT
  // ========================================

  async function handleLogout() {
    setLoggingOut(true);

    try {
      const { authClient } = await import(
        "@/app/lib/auth-client"
      );

      await authClient.signOut();

      // Send the user back to the public landing page.
      window.location.href = "/";
    } catch {
      setLoggingOut(false);
    }
  }

  // ========================================
  // USER DISPLAY
  // ========================================

  const displayName =
    user?.name || "LifeOS User";

  const initials = displayName
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <>
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">

          {/* ======================================== */}
          {/* MOBILE MENU BUTTON */}
          {/* ======================================== */}

          {authenticated && (
            <button
              type="button"
              onClick={() =>
                setMobileMenuOpen(true)
              }
              className="mr-3 rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Open navigation menu"
            >
              <Menu size={24} />
            </button>
          )}

          {/* ======================================== */}
          {/* DESKTOP TITLE */}
          {/* ======================================== */}

          <div className="hidden lg:block">
            <p className="text-xs font-medium text-slate-400">
              PERSONAL OPERATING SYSTEM
            </p>

            <p className="text-sm font-semibold text-slate-800">
              {authenticated
                ? "Your daily progress"
                : "Build a better life"}
            </p>
          </div>

          {/* ======================================== */}
          {/* MOBILE TITLE */}
          {/* ======================================== */}

          <div className="lg:hidden">
            <p className="text-base font-bold text-slate-900">
              LifeOS
            </p>
          </div>

          {/* ======================================== */}
          {/* RIGHT SIDE */}
          {/* ======================================== */}

          <div className="ml-auto flex items-center gap-2 sm:gap-3">

            {/* ======================================== */}
            {/* LOGGED OUT */}
            {/* ======================================== */}

            {!authenticated && (
              <div className="flex items-center gap-2">

                {/* Login */}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "/login";
                  }}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100 sm:px-4"
                >
                  Login
                </button>

                {/* Sign Up */}
                <button
                  type="button"
                  onClick={() => {
                    window.location.href =
                      "/signup";
                  }}
                  className="rounded-lg bg-green-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 sm:px-4"
                >
                  Sign Up
                </button>

              </div>
            )}

            {/* ======================================== */}
            {/* LOGGED IN */}
            {/* ======================================== */}

            {authenticated && (
              <>
                {/* Notifications */}
                <button
                  type="button"
                  className="relative rounded-full p-2 text-slate-600 transition hover:bg-slate-100"
                  aria-label="Notifications"
                >
                  <Bell size={20} />

                  <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-green-500" />
                </button>

                {/* User Menu */}
                <div className="relative">

                  {/* User Button */}
                  <button
                    type="button"
                    onClick={() =>
                      setUserMenuOpen(
                        (open) => !open
                      )
                    }
                    className="flex items-center gap-2 rounded-full p-1.5 transition hover:bg-slate-100"
                    aria-label="Open user menu"
                    aria-expanded={
                      userMenuOpen
                    }
                  >
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white shadow-sm">
                      {initials || "U"}
                    </div>

                    <ChevronDown
                      size={16}
                      className={`hidden text-slate-500 transition sm:block ${
                        userMenuOpen
                          ? "rotate-180"
                          : ""
                      }`}
                    />
                  </button>

                  {/* ======================================== */}
                  {/* USER DROPDOWN */}
                  {/* ======================================== */}

                  {userMenuOpen && (
                    <>
                      {/* Click-away layer */}
                      <button
                        type="button"
                        aria-label="Close user menu"
                        onClick={() =>
                          setUserMenuOpen(false)
                        }
                        className="fixed inset-0 z-40 cursor-default"
                      />

                      <div className="absolute right-0 top-12 z-50 w-72 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl">

                        {/* User Information */}
                        <div className="border-b border-slate-100 bg-slate-50 px-4 py-4">
                          <div className="flex items-center gap-3">

                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-sm font-bold text-white">
                              {initials ||
                                "U"}
                            </div>

                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-slate-900">
                                {displayName}
                              </p>

                              <p className="truncate text-xs text-slate-500">
                                {user?.username
                                  ? `@${user.username}`
                                  : user?.email ||
                                    "Personal Account"}
                              </p>
                            </div>

                          </div>
                        </div>

                        {/* Menu Items */}
                        <div className="p-2">

                          {/* Profile */}
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(
                                false
                              );
                              window.location.href =
                                "/profile";
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                          >
                            <User
                              size={18}
                              className="text-slate-500"
                            />

                            <div>
                              <p className="font-medium">
                                Profile
                              </p>

                              <p className="text-xs text-slate-400">
                                Personal information
                              </p>
                            </div>
                          </button>

                          {/* Settings */}
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(
                                false
                              );
                              window.location.href =
                                "/settings";
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                          >
                            <Settings
                              size={18}
                              className="text-slate-500"
                            />

                            <div>
                              <p className="font-medium">
                                Settings
                              </p>

                              <p className="text-xs text-slate-400">
                                Manage preferences
                              </p>
                            </div>
                          </button>

                          {/* Security */}
                          <button
                            type="button"
                            onClick={() => {
                              setUserMenuOpen(
                                false
                              );
                              window.location.href =
                                "/settings";
                            }}
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm text-slate-700 transition hover:bg-slate-100"
                          >
                            <Shield
                              size={18}
                              className="text-slate-500"
                            />

                            <div>
                              <p className="font-medium">
                                Security
                              </p>

                              <p className="text-xs text-slate-400">
                                Account and password
                              </p>
                            </div>
                          </button>

                        </div>

                        {/* Logout */}
                        <div className="border-t border-slate-100 p-2">
                          <button
                            type="button"
                            onClick={
                              handleLogout
                            }
                            disabled={
                              loggingOut
                            }
                            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                          >
                            <LogOut
                              size={18}
                            />

                            <span>
                              {loggingOut
                                ? "Logging out..."
                                : "Logout"}
                            </span>
                          </button>
                        </div>

                      </div>
                    </>
                  )}

                </div>
              </>
            )}

          </div>
        </div>
      </header>

      {/* ======================================== */}
      {/* MOBILE NAVIGATION */}
      {/* ======================================== */}

      {authenticated &&
        mobileMenuOpen && (
          <div className="fixed inset-0 z-[100] lg:hidden">

            {/* Dark Background */}
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() =>
                setMobileMenuOpen(false)
              }
              className="absolute inset-0 bg-black/50"
            />

            {/* Mobile Sidebar */}
            <div className="relative z-[101] h-full w-72 max-w-[85vw]">

              {/* Close Button */}
              <button
                type="button"
                onClick={() =>
                  setMobileMenuOpen(false)
                }
                className="absolute right-3 top-3 z-[102] rounded-full bg-slate-700 p-2 text-white shadow-lg"
                aria-label="Close navigation menu"
              >
                <X size={20} />
              </button>

              <Sidebar
                mobile={true}
                user={user!}
                onNavigate={() =>
                  setMobileMenuOpen(false)
                }
              />

            </div>
          </div>
        )}
    </>
  );
}