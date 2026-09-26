"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarPlus, Clock3, UserRound } from "lucide-react";

type PTSession = {
  id: string;
  scheduledAt: string;
  durationMinutes: number;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";
  notes: string | null;
  clientMembership: { user: { id: string; name: string } };
};

type AssignedClient = {
  clientMembershipId: string;
  client: { name: string };
};

const statusLabel: Record<PTSession["status"], string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

function statusClassName(status: PTSession["status"]) {
  if (status === "COMPLETED") return "bg-green-50 text-green-700";
  if (status === "CANCELLED") return "bg-slate-100 text-slate-600";
  if (status === "NO_SHOW") return "bg-red-50 text-red-700";
  return "bg-blue-50 text-blue-700";
}

function formatSessionDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function PTSessionsClient({ gymId }: { gymId: string }) {
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [clients, setClients] = useState<AssignedClient[]>([]);
  const [now, setNow] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [clientMembershipId, setClientMembershipId] = useState("");
  const [scheduledAt, setScheduledAt] = useState("");
  const [durationMinutes, setDurationMinutes] = useState("60");
  const [notes, setNotes] = useState("");

  const sessionsUrl = `/api/gyms/${encodeURIComponent(gymId)}/pt-sessions`;

  async function loadData() {
    setError("");
    setLoading(true);

    try {
      const [sessionResponse, clientResponse] = await Promise.all([
        fetch(sessionsUrl, { cache: "no-store" }),
        fetch(`/api/gyms/${encodeURIComponent(gymId)}/trainer-clients`, { cache: "no-store" }),
      ]);
      const [sessionData, clientData] = await Promise.all([
        sessionResponse.json(),
        clientResponse.json(),
      ]) as [
        { sessions?: PTSession[]; serverTime?: string; error?: string },
        { clients?: AssignedClient[]; error?: string },
      ];

      if (!sessionResponse.ok) throw new Error(sessionData.error ?? "Unable to load sessions");
      if (!clientResponse.ok) throw new Error(clientData.error ?? "Unable to load assigned clients");

      setSessions(sessionData.sessions ?? []);
      setClients(clientData.clients ?? []);
      setNow(new Date(sessionData.serverTime ?? "").getTime());
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load PT sessions");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [sessionResponse, clientResponse] = await Promise.all([
          fetch(`/api/gyms/${encodeURIComponent(gymId)}/pt-sessions`, { cache: "no-store" }),
          fetch(`/api/gyms/${encodeURIComponent(gymId)}/trainer-clients`, { cache: "no-store" }),
        ]);
        const [sessionData, clientData] = await Promise.all([
          sessionResponse.json(),
          clientResponse.json(),
        ]) as [
          { sessions?: PTSession[]; serverTime?: string; error?: string },
          { clients?: AssignedClient[]; error?: string },
        ];

        if (!sessionResponse.ok) throw new Error(sessionData.error ?? "Unable to load sessions");
        if (!clientResponse.ok) throw new Error(clientData.error ?? "Unable to load assigned clients");

        if (active) {
          setSessions(sessionData.sessions ?? []);
          setClients(clientData.clients ?? []);
          setNow(new Date(sessionData.serverTime ?? "").getTime());
        }
      } catch (loadError) {
        if (active) {
          setError(loadError instanceof Error ? loadError.message : "Unable to load PT sessions");
        }
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      active = false;
    };
  }, [gymId]);

  async function handleSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");
    setSaving(true);

    try {
      const response = await fetch(sessionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientMembershipId,
          scheduledAt: new Date(scheduledAt).toISOString(),
          durationMinutes: Number(durationMinutes),
          notes,
        }),
      });
      const data = await response.json() as { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Unable to schedule session");

      setMessage("Session scheduled.");
      setClientMembershipId("");
      setScheduledAt("");
      setDurationMinutes("60");
      setNotes("");
      await loadData();
    } catch (scheduleError) {
      setError(scheduleError instanceof Error ? scheduleError.message : "Unable to schedule session");
    } finally {
      setSaving(false);
    }
  }

  async function updateStatus(sessionId: string, status: PTSession["status"]) {
    setError("");
    setUpdatingId(sessionId);

    try {
      const response = await fetch(`${sessionsUrl}/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = await response.json() as { error?: string };

      if (!response.ok) throw new Error(data.error ?? "Unable to update session");
      await loadData();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update session");
    } finally {
      setUpdatingId(null);
    }
  }

  const upcoming = sessions.filter((session) => session.status === "SCHEDULED" && new Date(session.scheduledAt).getTime() >= now);
  const past = sessions.filter((session) => session.status !== "SCHEDULED" || new Date(session.scheduledAt).getTime() < now);

  function renderSession(session: PTSession) {
    return (
      <article key={session.id} className="border-b border-slate-200 py-4 last:border-b-0">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="font-semibold text-slate-900">{session.clientMembership.user.name}</h3>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusClassName(session.status)}`}>
                {statusLabel[session.status]}
              </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-2 text-sm text-slate-600">
              <span className="inline-flex items-center gap-1.5"><CalendarPlus size={15} className="text-slate-400" />{formatSessionDate(session.scheduledAt)}</span>
              <span className="inline-flex items-center gap-1.5"><Clock3 size={15} className="text-slate-400" />{session.durationMinutes} minutes</span>
            </div>
            {session.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{session.notes}</p> : null}
          </div>
          {session.status === "SCHEDULED" ? (
            <div className="flex shrink-0 flex-wrap gap-2">
              <button type="button" disabled={updatingId === session.id} onClick={() => void updateStatus(session.id, "COMPLETED")} className="rounded-lg border border-green-200 px-3 py-2 text-xs font-semibold text-green-700 hover:bg-green-50 disabled:opacity-50">Complete</button>
              <button type="button" disabled={updatingId === session.id} onClick={() => void updateStatus(session.id, "NO_SHOW")} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-50 disabled:opacity-50">No show</button>
              <button type="button" disabled={updatingId === session.id} onClick={() => void updateStatus(session.id, "CANCELLED")} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
            </div>
          ) : null}
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-600">Trainer workspace</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">PT Sessions</h1>
        <p className="mt-2 text-slate-600">Schedule and track sessions with your assigned clients.</p>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {message ? <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Schedule a session</h2>
        <form onSubmit={handleSchedule} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="text-sm font-medium text-slate-700">
            Assigned client
            <select required value={clientMembershipId} onChange={(event) => setClientMembershipId(event.target.value)} disabled={loading || clients.length === 0} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100">
              <option value="">{clients.length ? "Select a client" : "No assigned clients"}</option>
              {clients.map((client) => <option key={client.clientMembershipId} value={client.clientMembershipId}>{client.client.name}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium text-slate-700">
            Date and time
            <input required type="datetime-local" value={scheduledAt} onChange={(event) => setScheduledAt(event.target.value)} className="mt-1.5 w-full min-w-0 rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" />
          </label>
          <label className="text-sm font-medium text-slate-700">
            Duration (minutes)
            <input required type="number" min="1" max="480" step="5" value={durationMinutes} onChange={(event) => setDurationMinutes(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" />
          </label>
          <label className="text-sm font-medium text-slate-700 sm:col-span-2 lg:col-span-1">
            Notes
            <textarea rows={1} value={notes} onChange={(event) => setNotes(event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" />
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button type="submit" disabled={saving || loading || clients.length === 0} className="inline-flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60">
              <CalendarPlus size={17} />{saving ? "Scheduling..." : "Schedule session"}
            </button>
          </div>
        </form>
      </section>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading PT sessions...</div>
      ) : (
        <div className="grid gap-6 xl:grid-cols-2">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Upcoming</h2>
              <span className="text-sm text-slate-500">{upcoming.length} sessions</span>
            </div>
            {upcoming.length ? upcoming.map(renderSession) : (
              <div className="py-8 text-center">
                <CalendarPlus className="mx-auto text-slate-300" size={25} />
                <p className="mt-2 font-medium text-slate-700">No upcoming sessions</p>
                <p className="mt-1 text-sm text-slate-500">Schedule one with an assigned client.</p>
              </div>
            )}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">Past sessions</h2>
              <span className="text-sm text-slate-500">{past.length} sessions</span>
            </div>
            {past.length ? past.map(renderSession) : (
              <div className="py-8 text-center">
                <UserRound className="mx-auto text-slate-300" size={25} />
                <p className="mt-2 font-medium text-slate-700">No past sessions yet</p>
                <p className="mt-1 text-sm text-slate-500">Completed sessions and session history will appear here.</p>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}