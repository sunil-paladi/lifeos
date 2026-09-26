"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

type MemberSummary = {
  total: number;
  active: number;
  inactive: number;
  trainers: number;
  activeTrainers: number;
};

type TrendPoint = {
  date: string;
  count: number;
};

type StatsResponse = {
  memberSummary: MemberSummary;
  attendance: {
    todayCheckIns: number;
    currentlyCheckedIn: number;
    checkedInMembers: Array<{
      name: string;
      checkedInAt: string;
    }>;
    completedVisits: number;
    trend: TrendPoint[];
  };
  ptSessions: {
    scheduled: number;
    completed: number;
    cancelled: number;
    noShow: number;
  };
  memberGrowth: {
    newMembers: number;
    trend: TrendPoint[];
  };
  trainers: Array<{
    id: string;
    name: string;
    status: string;
    clients: Array<{ id: string; name: string }>;
    report: {
      scheduled: number;
      completed: number;
      cancelled: number;
      noShow: number;
      completedMinutes: number;
      clientsTrained: number;
      clients: Array<{ id: string; name: string; sessions: number }>;
    };
  }>;
  members: Array<{
    id: string;
    name: string;
    status: string;
    trainerName: string | null;
  }>;
  memberOverviewTotal: number;
  range: {
    from: string;
    to: string;
  };
};

function formatDateLabel(dateString: string) {
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(date);
}

function buildRangeValues(rangeType: string, fromValue: string, toValue: string) {
  const today = new Date();
  const todayString = today.toISOString().slice(0, 10);

  if (rangeType === "custom") {
    return {
      from: fromValue || todayString,
      to: toValue || todayString,
    };
  }

  const end = new Date();
  const start = new Date();

  if (rangeType === "today") {
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else if (rangeType === "7d") {
    start.setDate(end.getDate() - 6);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  } else {
    start.setDate(end.getDate() - 29);
    start.setHours(0, 0, 0, 0);
    end.setHours(23, 59, 59, 999);
  }

  return {
    from: start.toISOString().slice(0, 10),
    to: end.toISOString().slice(0, 10),
  };
}

export default function OwnerStatisticsClient({
  gymId,
  gymName,
}: {
  gymId: string;
  gymName: string;
}) {
  const [rangeType, setRangeType] = useState("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState<StatsResponse | null>(null);
  const [expandedTrainers, setExpandedTrainers] = useState<Record<string, boolean>>({});
  const [expandedReports, setExpandedReports] = useState<Record<string, boolean>>({});
  const [checkedInExpanded, setCheckedInExpanded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const selectedRange = useMemo(() => buildRangeValues(rangeType, customFrom, customTo), [rangeType, customFrom, customTo]);

  useEffect(() => {
    const controller = new AbortController();

    async function loadStats() {
      setLoading(true);
      setError(null);

      try {
        const params = new URLSearchParams();
        if (rangeType === "custom") {
          if (customFrom) params.set("from", customFrom);
          if (customTo) params.set("to", customTo);
        } else {
          params.set("range", rangeType);
        }

        const response = await fetch(`/api/gyms/${encodeURIComponent(gymId)}/statistics?${params.toString()}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "Unable to load owner statistics");
        }

        const next = (await response.json()) as StatsResponse;
        setData(next);
      } catch (loadError) {
        if (loadError instanceof Error && loadError.name === "AbortError") {
          return;
        }
        setError(loadError instanceof Error ? loadError.message : "Unable to load owner statistics");
      } finally {
        setLoading(false);
      }
    }

    void loadStats();
    return () => controller.abort();
  }, [customFrom, customTo, gymId, rangeType]);

  const attendanceMax = Math.max(1, ...((data?.attendance.trend ?? []).map((item) => item.count)));
  const growthMax = Math.max(1, ...((data?.memberGrowth.trend ?? []).map((item) => item.count)));

  return (
    <div className="space-y-6">
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-600">Owner dashboard</p>
        <div className="mt-2 flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900">{gymName}</h1>
            <p className="mt-1 text-sm text-slate-600">Member, attendance, and growth performance.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {[
              { value: "today", label: "Today" },
              { value: "7d", label: "7 Days" },
              { value: "30d", label: "30 Days" },
              { value: "custom", label: "Custom" },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => setRangeType(option.value)}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  rangeType === option.value
                    ? "bg-green-600 text-white"
                    : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {rangeType === "custom" ? (
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm text-slate-600">
              <span className="mb-1 block">From</span>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-0"
              />
            </label>
            <label className="text-sm text-slate-600">
              <span className="mb-1 block">To</span>
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none ring-0"
              />
            </label>
          </div>
        ) : null}
      </header>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading statistics…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-5 text-red-800">{error}</div>
      ) : data ? (
        <>
          <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total members</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{data.memberSummary.total}</h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Active members</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{data.memberSummary.active}</h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Inactive members</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{data.memberSummary.inactive}</h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total trainers</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{data.memberSummary.trainers}</h2>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Active trainers</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900">{data.memberSummary.activeTrainers}</h2>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Attendance summary</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Today check-ins</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{data.attendance.todayCheckIns}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <button
                    type="button"
                    aria-expanded={checkedInExpanded}
                    aria-controls="checked-in-members"
                    onClick={() => setCheckedInExpanded((expanded) => !expanded)}
                    className="flex w-full items-center justify-between gap-2 text-left text-sm font-medium text-slate-700"
                  >
                    <span>Currently checked in: {data.attendance.currentlyCheckedIn}</span>
                    <span aria-hidden="true" className="text-base">{checkedInExpanded ? "▾" : "▸"}</span>
                  </button>
                  {checkedInExpanded ? (
                    <ul id="checked-in-members" className="mt-3 space-y-1 text-sm text-slate-600">
                      {data.attendance.checkedInMembers.length ? data.attendance.checkedInMembers.map((member, index) => (
                        <li key={`${member.checkedInAt}-${index}`}>
                          {member.name} — Checked in {new Date(member.checkedInAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                        </li>
                      )) : <li>No members are currently checked in.</li>}
                    </ul>
                  ) : null}
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Completed visits today</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{data.attendance.completedVisits}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Date range</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {new Date(data.range.from).toLocaleDateString()} – {new Date(data.range.to).toLocaleDateString()}
                  </p>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">PT session summary</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Scheduled</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{data.ptSessions.scheduled}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Completed</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{data.ptSessions.completed}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Cancelled</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{data.ptSessions.cancelled}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">No Show</p>
                  <p className="mt-2 text-2xl font-bold text-slate-900">{data.ptSessions.noShow}</p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Trainer overview</h2>
              {data.trainers.length ? (
                <div className="mt-3 divide-y divide-slate-100">
                  {data.trainers.map((trainer) => {
                    const isExpanded = Boolean(expandedTrainers[trainer.id]);
                    const reportExpanded = Boolean(expandedReports[trainer.id]);
                    const reportId = `trainer-report-${trainer.id}`;
                    const clientsId = `trainer-clients-${trainer.id}`;

                    return (
                      <article key={trainer.id} className="py-3 first:pt-0 last:pb-0">
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                          <button
                            type="button"
                            aria-expanded={isExpanded}
                            aria-controls={clientsId}
                            onClick={() => setExpandedTrainers((current) => ({ ...current, [trainer.id]: !current[trainer.id] }))}
                            className="flex min-w-0 flex-1 items-center gap-2 text-left font-semibold text-slate-900 hover:text-green-700"
                          >
                            <span className="shrink-0 text-base" aria-hidden="true">{isExpanded ? "▾" : "▸"}</span>
                            <span className="truncate">{trainer.name}</span>
                            <span className="shrink-0 rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                              {trainer.status === "ACTIVE" ? "Active" : "Inactive"}
                            </span>
                            <span className="shrink-0 text-sm font-normal text-slate-500">
                              {trainer.clients.length} {trainer.clients.length === 1 ? "client" : "clients"}
                            </span>
                          </button>
                          {isExpanded ? (
                            <button
                              type="button"
                              aria-expanded={reportExpanded}
                              aria-controls={reportId}
                              onClick={() => setExpandedReports((current) => ({ ...current, [trainer.id]: !current[trainer.id] }))}
                              className="shrink-0 text-sm font-semibold text-green-700 hover:text-green-800"
                            >
                              {reportExpanded ? "Hide report" : "View report"}
                            </button>
                          ) : null}
                        </div>

                        {isExpanded ? (
                          <div id={clientsId} className="ml-6 mt-2 space-y-3">
                            {trainer.clients.length ? (
                              <ul className="space-y-1 text-sm text-slate-600">
                                {trainer.clients.map((client) => <li key={client.id}>- {client.name}</li>)}
                              </ul>
                            ) : <p className="text-sm text-slate-500">No assigned clients.</p>}

                            {reportExpanded ? (
                              <div id={reportId} className="rounded-lg bg-slate-50 p-3 text-sm">
                                <h3 className="font-semibold text-slate-800">Report for selected date range</h3>
                                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-slate-600 sm:grid-cols-4">
                                  <div><dt>Scheduled</dt><dd className="font-semibold text-slate-900">{trainer.report.scheduled}</dd></div>
                                  <div><dt>Completed</dt><dd className="font-semibold text-slate-900">{trainer.report.completed}</dd></div>
                                  <div><dt>Cancelled</dt><dd className="font-semibold text-slate-900">{trainer.report.cancelled}</dd></div>
                                  <div><dt>No show</dt><dd className="font-semibold text-slate-900">{trainer.report.noShow}</dd></div>
                                </dl>
                                <p className="mt-3 text-slate-700">
                                  Completed training time: <strong>{trainer.report.completedMinutes} minutes</strong>
                                </p>
                                <p className="mt-1 text-slate-700">
                                  Clients trained: <strong>{trainer.report.clientsTrained}</strong>
                                </p>
                                <h4 className="mt-3 font-semibold text-slate-800">Sessions by client</h4>
                                {trainer.report.clients.length ? (
                                  <ul className="mt-1 space-y-1 text-slate-600">
                                    {trainer.report.clients.map((client) => (
                                      <li key={client.id}>{client.name} — {client.sessions} {client.sessions === 1 ? "session" : "sessions"}</li>
                                    ))}
                                  </ul>
                                ) : <p className="mt-1 text-slate-500">No sessions in this date range.</p>}
                              </div>
                            ) : null}
                          </div>
                        ) : null}
                      </article>
                    );
                  })}
                </div>
              ) : <p className="mt-3 text-sm text-slate-500">No trainers in this gym.</p>}
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="text-xl font-bold text-slate-900">Member overview</h2>
                <Link href="/owner/members" className="text-sm font-semibold text-green-700 hover:text-green-800">
                  View all members
                </Link>
              </div>
              {data.members.length ? (
                <ul className="mt-3 divide-y divide-slate-100">
                  {data.members.map((member) => (
                    <li key={member.id} className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 py-2 first:pt-0 last:pb-0 text-sm">
                      <span className="min-w-0 truncate font-medium text-slate-800">{member.name}</span>
                      <span className="text-slate-500">{member.status === "ACTIVE" ? "Active" : "Inactive"}</span>
                      <span className="w-full text-slate-500 sm:w-auto sm:text-right">
                        {member.trainerName ? `Trainer: ${member.trainerName}` : "No trainer assigned"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-sm text-slate-500">No members in this gym.</p>}
              {data.memberOverviewTotal > data.members.length ? (
                <p className="mt-3 text-xs text-slate-500">Showing {data.members.length} of {data.memberOverviewTotal} members.</p>
              ) : null}
            </div>
          </section>

          <section className="grid gap-4 xl:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Attendance trend</h2>
              <div className="mt-5 flex h-52 items-end gap-2">
                {data.attendance.trend.map((point) => (
                  <div key={point.date} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div className="flex w-full items-end justify-center rounded-t-md bg-green-500/80" style={{ height: `${Math.max(10, (point.count / attendanceMax) * 100)}%` }} title={`${point.count}`} />
                    <span className="text-[10px] text-slate-500">{formatDateLabel(point.date)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-xl font-bold text-slate-900">Member growth</h2>
              <div className="mt-4 rounded-lg bg-slate-50 p-4">
                <p className="text-sm text-slate-500">New members</p>
                <p className="mt-2 text-3xl font-bold text-slate-900">{data.memberGrowth.newMembers}</p>
              </div>
              <div className="mt-5 flex h-40 items-end gap-2">
                {data.memberGrowth.trend.map((point) => (
                  <div key={point.date} className="flex flex-1 flex-col items-center justify-end gap-2">
                    <div className="flex w-full items-end justify-center rounded-t-md bg-blue-500/80" style={{ height: `${Math.max(10, (point.count / growthMax) * 100)}%` }} title={`${point.count}`} />
                    <span className="text-[10px] text-slate-500">{formatDateLabel(point.date)}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}
