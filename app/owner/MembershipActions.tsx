"use client";

import { useState } from "react";
import { History, X } from "lucide-react";
import { useRouter } from "next/navigation";

type MembershipRole = "MEMBER" | "TRAINER";
type MembershipStatus = "ACTIVE" | "INACTIVE" | string;

type HistoryResponse = {
  membership?: {
    role: MembershipRole;
    status: MembershipStatus;
    joinedAt: string;
    updatedAt: string;
    gym: { name: string };
    user: {
      name: string;
      username: string | null;
      email: string | null;
    };
    statusHistory: Array<{
      status: MembershipStatus;
      changedAt: string;
      changedBy: {
        name: string;
        username: string | null;
      };
    }>;
  };
  error?: string;
};

function formatLabel(value: string) {
  return value
    .toLowerCase()
    .split("_")
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

function formatDate(value: string) {
  return new Date(value).toLocaleDateString();
}

export default function MembershipActions({
  gymId,
  membershipId,
  role,
  status,
}: {
  gymId: string;
  membershipId: string;
  role: MembershipRole;
  status: MembershipStatus;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [history, setHistory] = useState<HistoryResponse["membership"]>();
  const [historyError, setHistoryError] = useState("");

  const resource = role === "MEMBER" ? "members" : "trainers";
  const nextStatus = status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

  async function changeStatus() {
    const action = nextStatus === "INACTIVE" ? "deactivate" : "reactivate";

    if (!window.confirm(`Are you sure you want to ${action} this ${role.toLowerCase()}?`)) {
      return;
    }

    setMessage("");
    setLoading(true);

    try {
      const response = await fetch(
        `/api/gyms/${encodeURIComponent(gymId)}/${resource}/${encodeURIComponent(membershipId)}/status`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: nextStatus }),
        }
      );
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        setMessage(data.error ?? `Unable to ${action} ${role.toLowerCase()}`);
        return;
      }

      setMessage(`${role === "MEMBER" ? "Member" : "Trainer"} ${nextStatus === "ACTIVE" ? "reactivated" : "deactivated"}.`);
      router.refresh();
    } catch {
      setMessage(`Unable to ${action} ${role.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }

  async function openHistory() {
    setHistoryOpen(true);
    setHistoryLoading(true);
    setHistoryError("");

    try {
      const response = await fetch(
        `/api/gyms/${encodeURIComponent(gymId)}/${resource}/${encodeURIComponent(membershipId)}/history`,
        { cache: "no-store" }
      );
      const data = (await response.json()) as HistoryResponse;

      if (!response.ok || !data.membership) {
        setHistoryError(data.error ?? "Unable to load membership history");
        return;
      }

      setHistory(data.membership);
    } catch {
      setHistoryError("Unable to load membership history");
    } finally {
      setHistoryLoading(false);
    }
  }

  return (
    <div className="sm:col-span-4">
      <div className="flex flex-wrap items-center gap-2">
        {status === "ACTIVE" || status === "INACTIVE" ? (
          <button
            type="button"
            onClick={changeStatus}
            disabled={loading}
            className={`rounded-lg px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60 ${
              status === "ACTIVE"
                ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100"
                : "border border-green-200 bg-green-50 text-green-700 hover:bg-green-100"
            }`}
          >
            {loading ? "Saving..." : status === "ACTIVE" ? "Deactivate" : "Reactivate"}
          </button>
        ) : null}
        <button
          type="button"
          onClick={openHistory}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          <History size={15} />
          History
        </button>
      </div>

      {message ? <p className="mt-2 text-sm text-slate-600">{message}</p> : null}

      {historyOpen ? (
        <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-900">Membership history</h3>
              <p className="mt-1 text-sm text-slate-500">
                {history?.user.name ?? "Loading membership"}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setHistoryOpen(false)}
              aria-label="Close membership history"
              className="rounded-md p-1 text-slate-400 hover:bg-white hover:text-slate-700"
            >
              <X size={17} />
            </button>
          </div>

          {historyLoading ? (
            <p className="mt-3 text-sm text-slate-500">Loading history...</p>
          ) : historyError ? (
            <p className="mt-3 text-sm text-red-700">{historyError}</p>
          ) : history ? (
            <>
              <dl className="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">
                <div><dt className="text-xs uppercase tracking-wide text-slate-400">Gym</dt><dd>{history.gym.name}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-slate-400">Role</dt><dd>{formatLabel(history.role)}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-slate-400">Current status</dt><dd>{formatLabel(history.status)}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-slate-400">Joined</dt><dd>{formatDate(history.joinedAt)}</dd></div>
                <div><dt className="text-xs uppercase tracking-wide text-slate-400">Last updated</dt><dd>{formatDate(history.updatedAt)}</dd></div>
              </dl>
              <div className="mt-4 border-t border-slate-200 pt-3">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Status changes</p>
                {history.statusHistory.length === 0 ? (
                  <p className="mt-2 text-sm text-slate-500">No recorded status changes.</p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {history.statusHistory.map((entry, index) => (
                      <div key={`${entry.changedAt}-${index}`} className="flex flex-wrap justify-between gap-2 text-sm text-slate-600">
                        <span>{formatLabel(entry.status)} by {entry.changedBy.name}</span>
                        <span className="text-slate-400">{formatDate(entry.changedAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
