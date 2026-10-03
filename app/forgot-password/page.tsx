"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Mail } from "lucide-react";
import { authClient } from "@/app/lib/auth-client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setLoading(true);

    try {
      const { error } = await authClient.requestPasswordReset({
        email: email.trim(),
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setMessage("Unable to process the request right now. Please try again later.");
        return;
      }

      setSubmitted(true);
    } catch {
      setMessage("Unable to process the request right now. Please try again later.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-[calc(100vh-4rem)] items-center justify-center px-4 py-10 sm:px-6">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-slate-600 shadow-md">
            <Mail size={24} />
          </div>
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-slate-900">
            Forgot your password?
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Enter your account email to request a reset link.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-lg sm:p-8">
          {submitted ? (
            <div aria-live="polite" className="space-y-4 text-center">
              <p className="text-sm text-slate-700">
                If an account exists for that email, a password reset link will be sent.
              </p>
              <p className="text-sm text-slate-500">
                The link expires after 30 minutes. Check your spam folder if it does not arrive.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="mb-2 block text-sm font-medium text-slate-700">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  maxLength={254}
                  autoComplete="email"
                  required
                  className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-4 focus:ring-green-100"
                />
              </div>

              {message && (
                <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {message}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-xl bg-green-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700 focus:outline-none focus:ring-4 focus:ring-green-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Requesting link..." : "Send reset link"}
              </button>
            </form>
          )}

          <div className="mt-6 border-t border-slate-100 pt-6 text-center">
            <Link href="/login" className="inline-flex items-center gap-2 text-sm font-semibold text-green-600 hover:text-green-700">
              <ArrowLeft size={16} />
              Back to login
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}