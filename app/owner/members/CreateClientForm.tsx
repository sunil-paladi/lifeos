"use client";

import { FormEvent, useState } from "react";
import { Eye, EyeOff, LockKeyhole, Mail, User, UserPlus, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";

export default function CreateClientForm({
  gymId,
}: {
  gymId: string;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setSuccess(false);
    setLoading(true);

    try {
      const response = await fetch(
        `/api/gyms/${encodeURIComponent(gymId)}/members`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name,
            username,
            email,
            password,
          }),
        }
      );

      const data = (await response.json()) as {
        error?: string;
      };

      if (!response.ok) {
        setMessage(data.error ?? "Unable to create client");
        return;
      }

      setName("");
      setUsername("");
      setEmail("");
      setPassword("");
      setSuccess(true);
      router.refresh();
    } catch {
      setMessage("Unable to create client");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="font-bold text-slate-900">Add Client</h2>
          <p className="mt-1 text-sm text-slate-500">
            Create a client account and add it to this gym.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setOpen((current) => !current);
            setMessage("");
            setSuccess(false);
          }}
          className="inline-flex w-fit items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
        >
          <UserPlus size={17} />
          {open ? "Close" : "Add Client"}
        </button>
      </div>

      {open ? (
        <form onSubmit={handleSubmit} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="client-name" className="mb-1.5 block text-sm font-medium text-slate-700">
              Name
            </label>
            <div className="relative">
              <User size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="client-name"
                value={name}
                onChange={(event) => setName(event.target.value)}
                required
                autoComplete="name"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="client-username" className="mb-1.5 block text-sm font-medium text-slate-700">
              Username
            </label>
            <div className="relative">
              <UserRound size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="client-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                required
                autoComplete="username"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="client-email" className="mb-1.5 block text-sm font-medium text-slate-700">
              Email
            </label>
            <div className="relative">
              <Mail size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="client-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                autoComplete="email"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="client-password" className="mb-1.5 block text-sm font-medium text-slate-700">
              Password
            </label>
            <div className="relative">
              <LockKeyhole size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                id="client-password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                autoComplete="new-password"
                className="w-full rounded-lg border border-slate-300 py-2.5 pl-9 pr-10 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
              />
              <button
                type="button"
                onClick={() => setShowPassword((current) => !current)}
                aria-label={showPassword ? "Hide password" : "Show password"}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700"
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <div className="sm:col-span-2">
            {message ? (
              <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {message}
              </p>
            ) : null}
            {success ? (
              <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                Client created successfully.
              </p>
            ) : null}
            <button
              type="submit"
              disabled={loading}
              className="mt-4 inline-flex w-full items-center justify-center rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto"
            >
              {loading ? "Creating client..." : "Create Client"}
            </button>
          </div>
        </form>
      ) : null}
    </section>
  );
}