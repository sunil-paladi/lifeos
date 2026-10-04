"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  Sparkles,
  User,
  UserRound,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { authClient } from "@/app/lib/auth-client";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Input } from "@/app/components/ui/input";
import { Label } from "@/app/components/ui/label";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
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
  // SIGNUP
  // ========================================

  async function handleSignup(
    event: React.FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setMessage("");
    setLoading(true);

    try {
      const { error } = await authClient.signUp.email({
        name,
        username,
        email,
        password,
      });

      if (error) {
        setMessage("Could not create an account with those details.");
        return;
      }

      window.location.href = "/";
    } catch {
      setMessage("Unable to create an account right now. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  // ========================================
  // LOADING
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
  // UI
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
            Create your LifeOS account
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Start building a better life, one day at a time.
          </p>
        </div>

        {/* Card */}
        <Card className="rounded-2xl p-6 shadow-lg sm:p-8">

          {/* Card heading */}
          <div className="mb-6">
            <div className="flex items-center gap-2">
              <Sparkles
                size={18}
                className="text-primary"
              />

              <h2 className="text-lg font-semibold text-slate-900">
                Create your account
              </h2>
            </div>

            <p className="mt-1 text-sm text-slate-500">
              We'll start with the basics. You can complete your fitness profile later.
            </p>
          </div>

          <form
            onSubmit={handleSignup}
            className="space-y-5"
          >
            {/* Name */}
            <div>
              <Label
                htmlFor="name"
                className="mb-2 block text-slate-700"
              >
                Full Name
              </Label>

              <div className="relative">
                <User
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <Input
                  id="name"
                  type="text"
                  placeholder="Your name"
                  value={name}
                  onChange={(e) =>
                    setName(e.target.value)
                  }
                  required
                  autoComplete="name"
                  className="h-12 rounded-xl pl-10 pr-4 focus-visible:ring-offset-0"
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <Label
                htmlFor="username"
                className="mb-2 block text-slate-700"
              >
                Username
              </Label>

              <div className="relative">
                <UserRound
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <Input
                  id="username"
                  type="text"
                  placeholder="Choose a username"
                  value={username}
                  onChange={(e) =>
                    setUsername(e.target.value)
                  }
                  required
                  autoComplete="username"
                  className="h-12 rounded-xl pl-10 pr-4 focus-visible:ring-offset-0"
                />
              </div>

              <p className="mt-1.5 text-xs text-slate-400">
                Your username cannot be changed later.
              </p>
            </div>

            {/* Email */}
            <div>
              <Label
                htmlFor="email"
                className="mb-2 block text-slate-700"
              >
                Email
              </Label>

              <div className="relative">
                <Mail
                  size={18}
                  className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
                />

                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) =>
                    setEmail(e.target.value)
                  }
                  required
                  autoComplete="email"
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
                  placeholder="Create a password"
                  value={password}
                  onChange={(e) =>
                    setPassword(e.target.value)
                  }
                  required
                  minLength={12}
                  maxLength={128}
                  autoComplete="new-password"
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

              <p className="mt-1.5 text-xs text-slate-400">
                Use 12 to 128 characters.
              </p>
            </div>

            {/* Error */}
            {message && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {message}
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={loading}
              className="h-12 w-full rounded-xl"
            >
              {loading
                ? "Creating account..."
                : "Create Account"}
            </Button>
          </form>

          {/* Login */}
          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <p className="text-sm text-slate-500">
              Already have an account?{" "}
              <Link
                href="/login"
                className="font-semibold text-primary hover:text-primary/80 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                Login
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