"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Clock3 } from "lucide-react";

type AttendanceRole = "MEMBER" | "TRAINER" | "OWNER";

type MembershipOption = {
  membershipId: string;
  gymId: string;
  gymName: string;
};

type AttendanceRecord = {
  id: string;
  memberMembershipId: string;
  checkedInAt: string;
  checkedOutAt: string | null;
  memberMembership: {
    user: { id: string; name: string };
  };
};

type AttendanceResponse = {
  attendance?: AttendanceRecord[];
  error?: string;
};

async function readResponse<T>(response: Response, fallback: string): Promise<T> {
  const text = await response.text();
  let data: (T & { error?: string }) | null = null;

  if (text) {
    try {
      data = JSON.parse(text) as T & { error?: string };
    } catch {
      throw new Error(response.ok ? fallback : `${fallback} (HTTP ${response.status})`);
    }
  }

  if (!response.ok) {
    throw new Error(data?.error ?? `${fallback} (HTTP ${response.status})`);
  }

  if (!data) throw new Error(fallback);
  return data;
}

async function getAttendance(gymId: string) {
  const response = await fetch(`/api/gyms/${encodeURIComponent(gymId)}/attendance`, {
    cache: "no-store",
  });
  const data = await readResponse<AttendanceResponse>(response, "Unable to load attendance");
  return data.attendance ?? [];
}

function localDateKey(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function durationLabel(record: AttendanceRecord) {
  if (!record.checkedOutAt) return "In progress";
  const minutes = Math.max(
    0,
    Math.floor((new Date(record.checkedOutAt).getTime() - new Date(record.checkedInAt).getTime()) / 60000),
  );
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours}h ${remainingMinutes}m` : `${remainingMinutes}m`;
}

export default function AttendanceView({
  role,
  memberships,
}: {
  role: AttendanceRole;
  memberships: MembershipOption[];
}) {
  const [gymId, setGymId] = useState(memberships[0]?.gymId ?? "");
  const [attendance, setAttendance] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(memberships.length > 0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [todayKey, setTodayKey] = useState("");
  const [memberFilter, setMemberFilter] = useState("");
  const [fromFilter, setFromFilter] = useState("");
  const [toFilter, setToFilter] = useState("");

  useEffect(() => {
    if (!gymId) {
      setAttendance([]);
      setLoading(false);
      return;
    }

    let active = true;
    void getAttendance(gymId)
      .then((records) => {
        if (!active) return;
        setAttendance(records);
        setTodayKey(localDateKey(new Date()));
        setError("");
      })
      .catch((loadError: unknown) => {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load attendance");
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [gymId]);

  async function handleAttendanceAction(action: "check-in" | "check-out") {
    if (!gymId) return;
    setSaving(true);
    setError("");
    setMessage("");

    try {
      const response = await fetch(
        `/api/gyms/${encodeURIComponent(gymId)}/attendance/${action}`,
        { method: "POST" },
      );
      await readResponse<{ attendance: AttendanceRecord }>(response, `Unable to ${action}`);
      setAttendance(await getAttendance(gymId));
      setTodayKey(localDateKey(new Date()));
      setMessage(action === "check-in" ? "You are checked in." : "You are checked out.");
    } catch (actionError) {
      setError(actionError instanceof Error ? actionError.message : `Unable to ${action}`);
    } finally {
      setSaving(false);
    }
  }

  const activeAttendance = attendance.find((record) => !record.checkedOutAt);
  const todayAttendance = attendance.filter((record) => localDateKey(new Date(record.checkedInAt)) === todayKey);
  const availableMembers = Array.from(
    new Map(attendance.map((record) => [record.memberMembershipId, record.memberMembership.user.name])),
    ([membershipId, name]) => ({ membershipId, name }),
  );
  const filteredAttendance = attendance.filter((record) => {
    const recordDate = localDateKey(new Date(record.checkedInAt));
    return (!memberFilter || record.memberMembershipId === memberFilter) &&
      (!fromFilter || recordDate >= fromFilter) &&
      (!toFilter || recordDate <= toFilter);
  });

  const isMember = role === "MEMBER";
  const title = isMember ? "Attendance" : role === "TRAINER" ? "Client Attendance" : "Gym Attendance";

  return (
    <div className="space-y-6 py-2">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-600">
          {isMember ? "Gym" : role === "TRAINER" ? "Trainer workspace" : "Owner workspace"}
        </p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">{title}</h1>
        <p className="mt-2 text-slate-600">
          {isMember ? "Check in for your visit and review recent attendance." : "Review attendance records within your authorized gym scope."}
        </p>
      </header>

      {memberships.length > 1 ? (
        <label className="block max-w-md text-sm font-medium text-slate-700">
          Gym
          <select
            value={gymId}
            onChange={(event) => {
              setLoading(true);
              setError("");
              setGymId(event.target.value);
            }}
            className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100"
          >
            {memberships.map((membership) => (
              <option key={membership.membershipId} value={membership.gymId}>{membership.gymName}</option>
            ))}
          </select>
        </label>
      ) : memberships[0] ? (
        <p className="text-sm font-medium text-slate-600">{memberships[0].gymName}</p>
      ) : null}

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {message ? <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div> : null}

      {isMember ? (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Today</h2>
          {loading ? (
            <p className="mt-3 text-sm text-slate-500">Loading your attendance...</p>
          ) : activeAttendance ? (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-green-700">Currently checked in</p>
                <p className="mt-1 text-sm text-slate-600">Checked in {formatDateTime(activeAttendance.checkedInAt)}</p>
              </div>
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleAttendanceAction("check-out")}
                className="rounded-lg bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Working..." : "Check Out"}
              </button>
            </div>
          ) : (
            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="font-medium text-slate-800">{todayAttendance.length ? "Visit recorded today" : "Not checked in"}</p>
                {todayAttendance.length ? <p className="mt-1 text-sm text-slate-600">Your visit appears in recent history below.</p> : null}
              </div>
              <button
                type="button"
                disabled={saving || !gymId}
                onClick={() => void handleAttendanceAction("check-in")}
                className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Working..." : "Check In"}
              </button>
            </div>
          )}
        </section>
      ) : (
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">Attendance records</h2>
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <label className="text-sm font-medium text-slate-700">
              Member
              <select value={memberFilter} onChange={(event) => setMemberFilter(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100">
                <option value="">All authorized members</option>
                {availableMembers.map((member) => <option key={member.membershipId} value={member.membershipId}>{member.name}</option>)}
              </select>
            </label>
            <label className="text-sm font-medium text-slate-700">
              From
              <input type="date" value={fromFilter} onChange={(event) => setFromFilter(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" />
            </label>
            <label className="text-sm font-medium text-slate-700">
              To
              <input type="date" value={toFilter} onChange={(event) => setToFilter(event.target.value)} className="mt-1.5 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm outline-none focus:border-green-500 focus:ring-4 focus:ring-green-100" />
            </label>
          </div>
        </section>
      )}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900">{isMember ? "Recent history" : "Attendance history"}</h2>
          <span className="text-sm text-slate-500">{isMember ? attendance.length : filteredAttendance.length} records</span>
        </div>

        {loading ? (
          <p className="py-8 text-center text-sm text-slate-500">Loading attendance...</p>
        ) : (isMember ? attendance : filteredAttendance).length === 0 ? (
          <div className="py-8 text-center">
            <CalendarCheck className="mx-auto text-slate-300" size={25} />
            <p className="mt-2 font-medium text-slate-700">No attendance records yet</p>
            <p className="mt-1 text-sm text-slate-500">Records will appear here after a visit is checked in.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {(isMember ? attendance : filteredAttendance).map((record) => (
              <article key={record.id} className="grid gap-2 py-4 sm:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto] sm:items-center">
                <div>
                  {!isMember ? <p className="font-semibold text-slate-900">{record.memberMembership.user.name}</p> : null}
                  <p className="text-sm font-medium text-slate-800">{formatDateTime(record.checkedInAt)}</p>
                  <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-500"><Clock3 size={14} />Checked in</p>
                </div>
                <div>
                  <p className="text-sm text-slate-700">{record.checkedOutAt ? formatDateTime(record.checkedOutAt) : "Not checked out"}</p>
                  <p className="mt-1 text-xs text-slate-500">Checked out</p>
                </div>
                <span className={`text-sm font-semibold ${record.checkedOutAt ? "text-slate-700" : "text-green-700"}`}>
                  {durationLabel(record)}
                </span>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}