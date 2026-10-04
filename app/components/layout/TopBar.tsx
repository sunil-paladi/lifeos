"use client";

import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Settings,
  Shield,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import Sidebar from "./Sidebar";
import type { AppUser } from "./AppShell";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/app/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/app/components/ui/sheet";

type AppNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  internalLink: string | null;
  createdAt: string;
  readAt: string | null;
};

type NotificationResponse = {
  notifications: AppNotification[];
  unreadCount: number;
};

interface TopBarProps {
  authenticated: boolean;
  user: AppUser | null;
  hasTrainerMembership: boolean;
  hasOwnerMembership: boolean;
}

export default function TopBar({
  authenticated,
  user,
  hasTrainerMembership,
  hasOwnerMembership,
}: TopBarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notificationsLoading, setNotificationsLoading] = useState(false);
  const [notificationsError, setNotificationsError] = useState("");

  const loadNotifications = useCallback(async () => {
    setNotificationsLoading(true);
    setNotificationsError("");

    try {
      const response = await fetch("/api/notifications?pageSize=20", {
        cache: "no-store",
      });
      const data = (await response.json()) as NotificationResponse & { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Unable to load notifications");
      }

      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      setNotificationsError("Unable to load notifications.");
    } finally {
      setNotificationsLoading(false);
    }
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      if (authenticated) {
        void loadNotifications();
      } else {
        setNotifications([]);
        setUnreadCount(0);
        setNotificationsError("");
      }
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authenticated, loadNotifications]);

  async function markNotificationRead(notificationId: string) {
    try {
      const response = await fetch(
        `/api/notifications/${encodeURIComponent(notificationId)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ read: true }),
        },
      );
      const data = (await response.json()) as {
        notification?: AppNotification;
        markedRead?: boolean;
        unreadCount?: number;
        error?: string;
      };

      if (!response.ok || !data.notification) {
        throw new Error(data.error ?? "Unable to update notification");
      }

      setNotifications((current) =>
        current.map((notification) =>
          notification.id === notificationId ? data.notification! : notification,
        ),
      );
      if (typeof data.unreadCount === "number") {
        setUnreadCount(data.unreadCount);
      } else if (data.markedRead) {
        setUnreadCount((count) => Math.max(0, count - 1));
      }
      return true;
    } catch {
      setNotificationsError("Unable to mark notification as read.");
      return false;
    }
  }

  function isInternalNotificationLink(link: string | null): link is string {
    return Boolean(
      link &&
        link.startsWith("/") &&
        !link.startsWith("//") &&
        !link.includes("\\") &&
        !link.includes(":"),
    );
  }

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
      <header className="sticky top-0 z-30 border-b border-border bg-card/95 backdrop-blur">
        <div className="flex h-16 items-center px-4 sm:px-6 lg:px-8">

          {/* ======================================== */}
          {/* MOBILE MENU BUTTON */}
          {/* ======================================== */}

          {authenticated && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <button
                  type="button"
                  className="mr-2 flex min-h-11 min-w-11 items-center justify-center rounded-lg text-slate-600 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:mr-3 lg:hidden"
                  aria-label="Open navigation menu"
                >
                  <Menu size={24} />
                </button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="h-dvh w-72 max-w-[85vw] overflow-y-auto overscroll-contain p-0 pb-[env(safe-area-inset-bottom)] lg:hidden"
              >
                <SheetTitle className="sr-only">Navigation menu</SheetTitle>
                <Sidebar
                  mobile
                  user={user!}
                  hasTrainerMembership={hasTrainerMembership}
                  hasOwnerMembership={hasOwnerMembership}
                  onNavigate={() => setMobileMenuOpen(false)}
                />
              </SheetContent>
            </Sheet>
          )}

          {/* ======================================== */}
          {/* DESKTOP TITLE */}
          {/* ======================================== */}

          <div className="hidden lg:block">
            <p className="text-xs font-medium text-muted-foreground">
              PERSONAL OPERATING SYSTEM
            </p>

            <p className="text-sm font-semibold text-foreground">
              {authenticated
                ? "Your daily progress"
                : "Build a better life"}
            </p>
          </div>

          {/* ======================================== */}
          {/* MOBILE TITLE */}
          {/* ======================================== */}

          <div className="lg:hidden">
            <p className="text-base font-bold text-foreground">
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
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring sm:px-4"
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
                  className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 sm:px-4"
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
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setNotificationsOpen((open) => !open)}
                    className="relative flex min-h-11 min-w-11 items-center justify-center rounded-full text-slate-600 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
                    aria-expanded={notificationsOpen}
                    aria-controls="notifications-panel"
                  >
                    <Bell size={20} />
                    {unreadCount > 0 ? (
                      <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-primary px-1 text-center text-[10px] font-bold leading-4 text-primary-foreground">
                        {unreadCount > 99 ? "99+" : unreadCount}
                      </span>
                    ) : null}
                  </button>

                  {notificationsOpen ? (
                    <>
                      <button
                        type="button"
                        aria-label="Close notifications"
                        onClick={() => setNotificationsOpen(false)}
                        className="fixed inset-0 z-40 cursor-default"
                      />
                      <section
                        id="notifications-panel"
                        aria-label="Recent notifications"
                          className="absolute right-0 top-12 z-50 max-h-[calc(100dvh-5rem)] w-80 max-w-[calc(100vw-1.5rem)] overflow-y-auto overscroll-contain rounded-xl border border-border bg-popover text-popover-foreground shadow-xl sm:w-96"
                      >
                        <div className="flex items-center justify-between border-b border-border px-4 py-3">
                          <h2 className="text-sm font-semibold text-foreground">Notifications</h2>
                          {unreadCount > 0 ? (
                            <span className="text-xs text-slate-500">{unreadCount} unread</span>
                          ) : null}
                        </div>

                        {notificationsLoading ? (
                          <p className="px-4 py-6 text-center text-sm text-slate-500">
                            Loading notifications...
                          </p>
                        ) : notificationsError ? (
                          <div className="px-4 py-5 text-center">
                            <p role="alert" className="text-sm text-destructive">{notificationsError}</p>
                            <button
                              type="button"
                              onClick={() => void loadNotifications()}
                              className="mt-2 rounded-sm text-sm font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              Try again
                            </button>
                          </div>
                        ) : notifications.length === 0 ? (
                          <p className="px-4 py-6 text-center text-sm text-slate-500">
                            You have no notifications.
                          </p>
                        ) : (
                          <ul className="max-h-[min(65vh,28rem)] divide-y divide-slate-100 overflow-y-auto">
                            {notifications.map((notification) => (
                              <li
                                key={notification.id}
                                className={`px-4 py-3 ${notification.readAt ? "bg-card" : "bg-rose-50/70"}`}
                              >
                                <div className="flex items-start gap-2">
                                  {!notification.readAt ? (
                                    <span
                                      aria-label="Unread"
                                      className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-primary"
                                    />
                                  ) : null}
                                  <div className="min-w-0 flex-1">
                                    <p className="text-sm font-semibold text-foreground">
                                      {notification.title}
                                    </p>
                                    <p className="mt-1 text-sm text-muted-foreground">
                                      {notification.body}
                                    </p>
                                    <p className="mt-1 text-xs text-slate-400">
                                      {new Date(notification.createdAt).toLocaleString()}
                                    </p>
                                    <div className="mt-2 flex gap-3">
                                      {isInternalNotificationLink(notification.internalLink) ? (
                                        <a
                                          href={notification.internalLink}
                                          onClick={(event) => {
                                            setNotificationsOpen(false);
                                            if (!notification.readAt) {
                                              event.preventDefault();
                                              void markNotificationRead(notification.id).then((marked) => {
                                                if (marked) {
                                                  window.location.assign(notification.internalLink!);
                                                }
                                              });
                                            }
                                          }}
                                          className="rounded-sm text-xs font-semibold text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                          Open
                                        </a>
                                      ) : null}
                                      {!notification.readAt ? (
                                        <button
                                          type="button"
                                          onClick={() => void markNotificationRead(notification.id)}
                                          className="rounded-sm text-xs font-semibold text-slate-600 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                                        >
                                          Mark as read
                                        </button>
                                      ) : (
                                        <span className="text-xs text-slate-400">Read</span>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </section>
                    </>
                  ) : null}
                </div>

                {/* User Menu */}
                <DropdownMenu open={userMenuOpen} onOpenChange={setUserMenuOpen}>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center gap-2 rounded-full p-1.5 transition hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      aria-label="Open user menu"
                    >
                      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground shadow-sm">
                        {initials || "U"}
                      </span>
                      <ChevronDown size={16} className="hidden text-slate-500 sm:block" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-72">
                    <DropdownMenuLabel className="px-3 py-3">
                      <span className="block truncate text-sm font-semibold text-foreground">
                        {displayName}
                      </span>
                      <span className="mt-1 block truncate text-xs font-normal text-muted-foreground">
                        {user?.username
                          ? `@${user.username}`
                          : user?.email || "Personal Account"}
                      </span>
                    </DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="px-3 py-2.5"
                      onSelect={() => {
                        window.location.href = "/profile";
                      }}
                    >
                      <User size={18} className="text-muted-foreground" />
                      <span>Profile</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="px-3 py-2.5"
                      onSelect={() => {
                        window.location.href = "/settings";
                      }}
                    >
                      <Settings size={18} className="text-muted-foreground" />
                      <span>Settings</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="px-3 py-2.5"
                      onSelect={() => {
                        window.location.href = "/settings";
                      }}
                    >
                      <Shield size={18} className="text-muted-foreground" />
                      <span>Security</span>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      className="px-3 py-2.5 text-destructive focus:bg-destructive/10 focus:text-destructive"
                      disabled={loggingOut}
                      onSelect={(event) => {
                        event.preventDefault();
                        void handleLogout();
                      }}
                    >
                      <LogOut size={18} />
                      <span>{loggingOut ? "Logging out..." : "Logout"}</span>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            )}

          </div>
        </div>
      </header>

    </>
  );
}