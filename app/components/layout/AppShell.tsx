"use client";

import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import { authClient } from "@/app/lib/auth-client";

interface AppShellProps {
  children: ReactNode;
}

export type AppUser = {
  id: string;
  name: string;
  username?: string | null;
  email?: string | null;
};

const publicRoutes = ["/login", "/signup"];

export default function AppShell({
  children,
}: AppShellProps) {
  const pathname = usePathname();
  const router = useRouter();

  const [user, setUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  const isPublicRoute = publicRoutes.includes(pathname);

  useEffect(() => {
    async function checkSession() {
      const session = await authClient.getSession();

      if (session.data?.user) {
        setUser({
          id: session.data.user.id,
          name: session.data.user.name,
          username: session.data.user.username,
          email: session.data.user.email,
        });
      } else {
        setUser(null);

        // Root "/" is our public landing page.
        // Login and signup are also public.
        if (pathname !== "/" && !isPublicRoute) {
          router.replace("/login");
          return;
        }
      }

      setLoading(false);
    }

    checkSession();
  }, [pathname, router, isPublicRoute]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-green-600" />

          <p className="mt-3 text-sm text-slate-500">
            Loading LifeOS...
          </p>
        </div>
      </div>
    );
  }

  // ========================================
  // LOGGED OUT
  // ========================================

  if (!user) {
    // Login / Signup pages
    if (isPublicRoute) {
      return (
        <div className="min-h-screen bg-slate-100">
          <TopBar
            authenticated={false}
            user={null}
          />

          <main className="min-h-[calc(100vh-4rem)]">
            {children}
          </main>
        </div>
      );
    }

    // Public landing page at "/"
    if (pathname === "/") {
      return (
        <div className="min-h-screen bg-slate-100">
          <TopBar
            authenticated={false}
            user={null}
          />

          <main className="min-h-[calc(100vh-4rem)]">
            <section className="mx-auto max-w-7xl px-6 py-16 lg:px-8 lg:py-24">
              <div className="grid items-center gap-12 lg:grid-cols-2">

                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-green-200 bg-green-50 px-4 py-2 text-sm font-semibold text-green-700">
                    🌱 Your Personal Operating System
                  </div>

                  <h1 className="mt-6 text-4xl font-bold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl">
                    Build a better life,
                    <span className="text-green-600">
                      {" "}one day at a time.
                    </span>
                  </h1>

                  <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
                    LifeOS brings workouts, nutrition, habits,
                    hydration, journaling and progress together
                    in one simple place.
                  </p>

                  <div className="mt-8 flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => router.push("/signup")}
                      className="rounded-xl bg-green-600 px-6 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
                    >
                      Get Started
                    </button>

                    <button
                      type="button"
                      onClick={() => router.push("/login")}
                      className="rounded-xl border border-slate-300 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                    >
                      Login
                    </button>
                  </div>
                </div>

                <div className="flex justify-center">
                  <div className="relative flex h-72 w-72 items-center justify-center">
                    <div className="absolute inset-0 rounded-full bg-green-100" />

                    <div className="absolute inset-6 rounded-full bg-green-200/60" />

                    <div className="relative flex h-56 w-56 flex-col items-center justify-center rounded-full border border-white bg-white shadow-xl">
                      <div className="text-7xl">
                        🌄
                      </div>

                      <p className="mt-4 text-lg font-bold text-slate-900">
                        Keep Moving
                      </p>

                      <p className="mt-1 text-sm text-slate-500">
                        Progress over perfection.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

              <div className="mt-20 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {[
                  {
                    icon: "🏋️",
                    title: "Workout",
                    text: "Plan and track your training.",
                  },
                  {
                    icon: "🍽️",
                    title: "Nutrition",
                    text: "Understand and improve your food habits.",
                  },
                  {
                    icon: "🎯",
                    title: "Habits",
                    text: "Build consistency every day.",
                  },
                  {
                    icon: "💧",
                    title: "Water",
                    text: "Stay on top of hydration.",
                  },
                  {
                    icon: "📝",
                    title: "Journal",
                    text: "Reflect and record your progress.",
                  },
                  {
                    icon: "📊",
                    title: "Analytics",
                    text: "See how your efforts are improving.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
                  >
                    <div className="text-2xl">
                      {item.icon}
                    </div>

                    <h3 className="mt-3 font-bold text-slate-900">
                      {item.title}
                    </h3>

                    <p className="mt-1 text-sm text-slate-500">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </main>
        </div>
      );
    }

    return null;
  }

  // ========================================
  // LOGGED IN
  // ========================================

  return (
    <div className="min-h-screen bg-slate-100">

      {/* Authenticated Sidebar */}
      <div className="relative z-50">
        <Sidebar user={user} />
      </div>

      {/* Main Application Area */}
      <div className="relative min-h-screen lg:ml-64">

        {/* Top Bar */}
        <div className="relative z-30">
          <TopBar
            authenticated={true}
            user={user}
          />
        </div>

        {/* Page Content */}
        <main className="relative z-0 px-4 py-5 sm:px-6 lg:px-8">
          <div className="mx-auto w-full max-w-[1600px]">
            {children}
          </div>
        </main>

      </div>
    </div>
  );
}