"use client";

import Link from "next/link";
import { useState } from "react";
import { authClient } from "@/app/lib/auth-client";

export default function SecuritySettingsPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function changePassword(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setError("");

    if (newPassword !== confirmPassword) {
      setError("The new passwords do not match.");
      return;
    }
    if (newPassword.length < 12 || newPassword.length > 128) {
      setError("Your new password must be between 12 and 128 characters.");
      return;
    }

    setSaving(true);
    try {
      const result = await authClient.changePassword({
        currentPassword,
        newPassword,
        revokeOtherSessions: true,
      });
      if (result.error) {
        throw new Error(result.error.message || "Unable to change your password.");
      }
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setMessage("Password updated. Other active sessions were signed out.");
    } catch (changeError) {
      setError(
        changeError instanceof Error
          ? changeError.message
          : "Unable to change your password.",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="mx-auto w-full min-w-0 max-w-3xl space-y-5">
      <header>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
          Account
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
          Security
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your password and account access.
        </p>
      </header>

      <section className="min-w-0 rounded-xl border border-border bg-card p-4 shadow-sm sm:p-6">
        <h2 className="text-lg font-semibold text-card-foreground">
          Change password
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Changing your password signs out other active sessions.
        </p>

        <form onSubmit={changePassword} className="mt-5 space-y-4">
          <label className="block text-sm font-medium text-foreground">
            Current password
            <input
              type="password"
              autoComplete="current-password"
              required
              value={currentPassword}
              onChange={(event) => setCurrentPassword(event.target.value)}
              className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-foreground"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            New password
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-foreground"
            />
          </label>
          <label className="block text-sm font-medium text-foreground">
            Confirm new password
            <input
              type="password"
              autoComplete="new-password"
              minLength={12}
              maxLength={128}
              required
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              className="mt-1 min-h-11 w-full min-w-0 rounded-lg border border-input bg-background px-3 text-foreground"
            />
          </label>

          {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
          {message && <p role="status" className="text-sm text-primary">{message}</p>}

          <button
            type="submit"
            disabled={saving}
            className="min-h-11 w-full rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
          >
            {saving ? "Updating password..." : "Update password"}
          </button>
        </form>
      </section>

      <p className="text-sm text-muted-foreground">
        Forgot your current password?{" "}
        <Link href="/forgot-password" className="font-semibold text-primary underline">
          Request a password reset
        </Link>
        .
      </p>
    </main>
  );
}
