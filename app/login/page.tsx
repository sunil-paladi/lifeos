"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/app/lib/auth-client";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export default function LoginPage() {
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checkingSession, setCheckingSession] = useState(true);
  const [showPassword, setShowPassword] = useState(false);

  // ========================================
  // CHECK EXISTING SESSION
  // ========================================

  useEffect(() => {
    async function checkSession() {
      const session = await authClient.getSession();

      if (session.data?.user) {
        router.replace("/");
        return;
      }

      setCheckingSession(false);
    }

    checkSession();
  }, [router]);

  // ========================================
  // LOGIN
  // ========================================

  async function handleLogin(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    const value = identifier.trim();

    if (!value) {
      setLoading(false);
      setMessage("Please enter your email or username.");
      return;
    }

    try {
      const result = value.includes("@")
        ? await authClient.signIn.email({ email: value, password })
        : await authClient.signIn.username({ username: value, password });

      if (result.error) {
        setMessage("Invalid email or username, or incorrect password.");
        return;
      }

      window.location.href = "/";
    } catch {
      setMessage("Unable to sign in right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ========================================
  // SESSION CHECK LOADING
  // ========================================

  if (checkingSession) {
    return (
      <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4">
        <div className="text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-primary" />

          <p className="mt-3 text-sm text-slate-500">
            Checking your session...
          </p>
        </div>
      </main>
    );
  }

  // ========================================
  // LOGIN UI
  // ========================================

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">

        {/* Brand */}
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-primary shadow-md">
            <Sparkles size={26} />
          </div>

          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Welcome back
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Continue your LifeOS journey.
          </p>
        </div>

        {/* Login Card */}
        <Card className="rounded-2xl p-6 shadow-lg sm:p-8">

          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Sparkles
                size={18}
                className="text-primary"
              />

              <h2 className="text-lg font-semibold text-slate-900">
                Login to LifeOS
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              Use your email or username to continue.
            </p>
          </div>

          <form
            onSubmit={handleLogin}
            className="space-y-5"
          >

            {/* Email / Username */}
            <div>
              <Label
                htmlFor="identifier"
                className="mb-2 block text-slate-700"
              >
                Email or Username
              </Label>

              <div className="relative">
                {identifier.includes("@") ? (
                  <Mail
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                ) : (
                  <UserRound
                    size={18}
                    className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                  />
                )}

                <Input
                  id="identifier"
                  type="text"
                  placeholder="you@example.com or username"
                  value={identifier}
                  onChange={(e) =>
                    setIdentifier(e.target.value)
                  }
                  required
                  autoComplete="username"
                  className="h-12 rounded-xl pl-10 pr-4 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <Label
                htmlFor="password"
                className="mb-2 block text-slate-700"
              >
                Password
              </Label>

              <div className="relative">
                <LockKeyhole
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <Input
                  id="password"
                  type={
                    showPassword
                      ? "text"
                      : "password"
                  }
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  autoComplete="current-password"
                  className="h-12 rounded-xl pl-10 pr-12 focus-visible:ring-offset-0"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      (visible) => !visible
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 rounded-md p-1 text-slate-400 hover:text-slate-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-label={
                    showPassword
                      ? "Hide password"
                      : "Show password"
                  }
                >
                  {showPassword ? (
                    <EyeOff size={18} />
                  ) : (
                    <Eye size={18} />
                  )}
                </button>
              </div>
            </div>

            {/* Error */}
            {message && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            )}

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl"
            >
              {loading
                ? "Logging in..."
                : "Login"}
            </Button>
          </form>

          <div className="mt-4 text-right">
            <Link
              href="/forgot-password"
              className="text-sm font-semibold text-primary hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              Forgot password?
            </Link>
          </div>

          {/* Signup */}
          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-primary hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Create one
              </Link>
            </p>
          </div>
        </Card>

        {/* Footer */}
        <p className="mt-5 text-center text-xs text-slate-400">
          LifeOS · Stay consistent
        </p>
      </div>
    </main>
  );
}