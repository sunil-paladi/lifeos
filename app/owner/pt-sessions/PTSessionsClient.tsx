"use client";

import { useEffect, useState, type FormEvent } from "react";
import { CalendarPlus, CalendarDays, Clock3, Pencil, UserRound, X } from "lucide-react";
import { formatMoney, normalizeCurrency } from "@/app/lib/currency";

type SessionStatus = "SCHEDULED" | "COMPLETED" | "CANCELLED" | "NO_SHOW";

type PTSession = {
  id: string;
  trainerMembershipId: string;
  clientMembershipId: string;
  ptPricingId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: SessionStatus;
  notes: string | null;
  ptPricing: {
    id: string;
    name: string;
    price: string;
    currency: string;
    durationMinutes: number;
  } | null;
  trainerMembership: { user: { id: string; name: string } };
  clientMembership: { user: { id: string; name: string } };
};

type Member = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type Trainer = {
  membershipId: string;
  userId: string;
  name: string;
  status: string;
};

type Pricing = {
  id: string;
  name: string;
  price: string;
  currency: string;
  durationMinutes: number;
  isActive: boolean;
};

type Assignment = {
  clientMembershipId: string;
  trainerMembershipId: string;
};

type SessionDraft = {
  clientMembershipId: string;
  trainerMembershipId: string;
  ptPricingId: string;
  scheduledAt: string;
  durationMinutes: string;
  status: SessionStatus;
  notes: string;
};

const statuses: SessionStatus[] = ["SCHEDULED", "COMPLETED", "CANCELLED", "NO_SHOW"];

const statusLabels: Record<SessionStatus, string> = {
  SCHEDULED: "Scheduled",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

const statusStyles: Record<SessionStatus, string> = {
  SCHEDULED: "bg-blue-50 text-blue-700",
  COMPLETED: "bg-green-50 text-green-700",
  CANCELLED: "bg-slate-100 text-slate-600",
  NO_SHOW: "bg-red-50 text-red-700",
};

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none focus:border-green-600 focus:ring-2 focus:ring-green-100 disabled:bg-slate-100 disabled:text-slate-500";
const labelClass = "block text-sm font-medium text-slate-700";
const primaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass = "inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60";

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "The request could not be completed.");
  return data;
}

function formatPrice(amount: string | number, currency: string) {
  const normalized = normalizeCurrency(currency);
  return normalized ? formatMoney(amount, normalized) : `${currency} ${amount}`;
}

function formatDate(value: string) {
  return new Date(value).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function toLocalDateTime(value: string) {
  const date = new Date(value);
  const localDate = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return localDate.toISOString().slice(0, 16);
}

function getEmptyDraft(): SessionDraft {
  return {
    clientMembershipId: "",
    trainerMembershipId: "",
    ptPricingId: "",
    scheduledAt: "",
    durationMinutes: "60",
    status: "SCHEDULED",
    notes: "",
  };
}

export default function PTSessionsClient({ gymId }: { gymId: string }) {
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [trainers, setTrainers] = useState<Trainer[]>([]);
  const [pricing, setPricing] = useState<Pricing[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [draft, setDraft] = useState<SessionDraft>(getEmptyDraft);
  const [editId, setEditId] = useState<string | null>(null);
  const [editDraft, setEditDraft] = useState<SessionDraft>(getEmptyDraft);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  const sessionsUrl = `/api/gyms/${encodeURIComponent(gymId)}/pt-sessions`;

  useEffect(() => {
    let active = true;

    async function loadInitialData() {
      try {
        const [memberResponse, trainerResponse, pricingResponse, sessionResponse, assignmentResponse] = await Promise.all([
          fetch(`/api/gyms/${encodeURIComponent(gymId)}/members`, { cache: "no-store" }),
          fetch(`/api/gyms/${encodeURIComponent(gymId)}/trainers?status=ACTIVE`, { cache: "no-store" }),
          fetch("/api/owner/pt-pricing", { cache: "no-store" }),
          fetch(sessionsUrl, { cache: "no-store" }),
          fetch(`/api/gyms/${encodeURIComponent(gymId)}/trainer-clients`, { cache: "no-store" }),
        ]);
        const [memberData, trainerData, pricingData, sessionData, assignmentData] = await Promise.all([
          readResponse<{ memberships: Member[] }>(memberResponse),
          readResponse<{ trainers: Trainer[] }>(trainerResponse),
          readResponse<{ pricing: Pricing[] }>(pricingResponse),
          readResponse<{ sessions: PTSession[] }>(sessionResponse),
          readResponse<{ clients: Array<{ clientMembershipId: string; trainer: { id: string } }> }>(assignmentResponse),
        ]);

        if (!active) return;

        const activeMembers = memberData.memberships.filter((member) => member.role === "MEMBER" && member.status === "ACTIVE");
        const activeTrainers = trainerData.trainers.filter((trainer) => trainer.status === "ACTIVE");
        const trainerMembershipByUserId = new Map(activeTrainers.map((trainer) => [trainer.userId, trainer.membershipId]));

        setMembers(activeMembers);
        setTrainers(activeTrainers);
        setPricing(pricingData.pricing.filter((item) => item.isActive));
        setSessions(sessionData.sessions);
        setAssignments(assignmentData.clients.flatMap((assignment) => {
          const trainerMembershipId = trainerMembershipByUserId.get(assignment.trainer.id);
          return trainerMembershipId
            ? [{ clientMembershipId: assignment.clientMembershipId, trainerMembershipId }]
            : [];
        }));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load PT sessions.");
      } finally {
        if (active) setLoading(false);
      }
    }

    void loadInitialData();
    return () => {
      active = false;
    };
  }, [gymId, sessionsUrl]);

  async function reloadSessions() {
    const data = await readResponse<{ sessions: PTSession[] }>(await fetch(sessionsUrl, { cache: "no-store" }));
    setSessions(data.sessions);
  }

  function trainersForClient(clientMembershipId: string) {
    const assignedTrainerIds = new Set(
      assignments
        .filter((assignment) => assignment.clientMembershipId === clientMembershipId)
        .map((assignment) => assignment.trainerMembershipId)
    );
    return trainers.filter((trainer) => assignedTrainerIds.has(trainer.membershipId));
  }

  function selectCreateClient(clientMembershipId: string) {
    const availableTrainers = trainersForClient(clientMembershipId);
    setDraft((current) => ({
      ...current,
      clientMembershipId,
      trainerMembershipId: availableTrainers.some((trainer) => trainer.membershipId === current.trainerMembershipId)
        ? current.trainerMembershipId
        : availableTrainers[0]?.membershipId ?? "",
    }));
  }

  function selectPricing(nextPricingId: string, current: SessionDraft, update: (value: SessionDraft) => void) {
    const selectedPricing = pricing.find((item) => item.id === nextPricingId);
    update({
      ...current,
      ptPricingId: nextPricingId,
      durationMinutes: selectedPricing ? String(selectedPricing.durationMinutes) : current.durationMinutes,
    });
  }

  async function handleSchedule(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setMessage("");

    const durationMinutes = Number(draft.durationMinutes);
    if (!draft.clientMembershipId || !draft.trainerMembershipId) {
      setError("Select a client and an assigned trainer.");
      return;
    }
    if (!draft.scheduledAt) {
      setError("Select a scheduled date and time.");
      return;
    }
    if (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480) {
      setError("Duration must be a positive whole number of minutes (up to 480).");
      return;
    }

    setSaving(true);
    try {
      await readResponse(await fetch(sessionsUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trainerMembershipId: draft.trainerMembershipId,
          clientMembershipId: draft.clientMembershipId,
          ptPricingId: draft.ptPricingId || null,
          scheduledAt: new Date(draft.scheduledAt).toISOString(),
          durationMinutes,
          status: draft.status,
          notes: draft.notes,
        }),
      }));
      await reloadSessions();
      setDraft(getEmptyDraft());
      setMessage("PT session scheduled.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to schedule this PT session.");
    } finally {
      setSaving(false);
    }
  }

  function startEditing(session: PTSession) {
    setError("");
    setMessage("");
    setEditId(session.id);
    setEditDraft({
      clientMembershipId: session.clientMembershipId,
      trainerMembershipId: session.trainerMembershipId,
      ptPricingId: session.ptPricingId ?? "",
      scheduledAt: toLocalDateTime(session.scheduledAt),
      durationMinutes: String(session.durationMinutes),
      status: session.status,
      notes: session.notes ?? "",
    });
  }

  async function handleEdit(event: FormEvent<HTMLFormElement>, session: PTSession) {
    event.preventDefault();
    setError("");
    setMessage("");

    const durationMinutes = Number(editDraft.durationMinutes);
    if (session.status === "SCHEDULED" && (!Number.isInteger(durationMinutes) || durationMinutes <= 0 || durationMinutes > 480)) {
      setError("Duration must be a positive whole number of minutes (up to 480).");
      return;
    }

    setUpdatingId(session.id);
    try {
      const payload = {
        ptPricingId: editDraft.ptPricingId || null,
        notes: editDraft.notes,
        ...(session.status === "SCHEDULED"
          ? {
              scheduledAt: new Date(editDraft.scheduledAt).toISOString(),
              durationMinutes,
              status: editDraft.status,
            }
          : {}),
      };
      await readResponse(await fetch(`${sessionsUrl}/${encodeURIComponent(session.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }));
      await reloadSessions();
      setEditId(null);
      setMessage("PT session updated.");
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update this PT session.");
    } finally {
      setUpdatingId(null);
    }
  }

  async function cancelSession(sessionId: string) {
    setError("");
    setMessage("");
    setUpdatingId(sessionId);
    try {
      await readResponse(await fetch(`${sessionsUrl}/${encodeURIComponent(sessionId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "CANCELLED" }),
      }));
      await reloadSessions();
      setMessage("PT session cancelled.");
    } catch (cancelError) {
      setError(cancelError instanceof Error ? cancelError.message : "Unable to cancel this PT session.");
    } finally {
      setUpdatingId(null);
    }
  }

  function renderPricingOptions(currentPricingId: string) {
    const currentInactivePricing = currentPricingId && !pricing.some((item) => item.id === currentPricingId)
      ? sessions.find((session) => session.ptPricingId === currentPricingId)?.ptPricing
      : null;

    return (
      <>
        <option value="">No pricing linked</option>
        {currentInactivePricing ? (
          <option value={currentInactivePricing.id} disabled>
            {currentInactivePricing.name} (inactive, existing)
          </option>
        ) : null}
        {pricing.map((item) => (
          <option key={item.id} value={item.id}>
            {item.name} · {formatPrice(item.price, item.currency)} · {item.durationMinutes} min
          </option>
        ))}
      </>
    );
  }

  return (
    <div className="space-y-6 py-2">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-green-600">Gym management</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">PT Sessions</h1>
        <p className="mt-2 text-slate-600">Schedule and manage personal training sessions.</p>
      </header>

      {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</div> : null}
      {message ? <div role="status" className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">{message}</div> : null}

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 className="text-lg font-bold text-slate-900">Schedule a PT session</h2>
        <p className="mt-1 text-sm text-slate-600">A session connects an assigned client and trainer with a PT service.</p>
        <form onSubmit={handleSchedule} className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <label className={labelClass}>
            Client
            <select required value={draft.clientMembershipId} onChange={(event) => selectCreateClient(event.target.value)} disabled={loading || members.length === 0} className={inputClass}>
              <option value="">{members.length ? "Select a member" : "No active members"}</option>
              {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            Trainer
            <select required value={draft.trainerMembershipId} onChange={(event) => setDraft({ ...draft, trainerMembershipId: event.target.value })} disabled={loading || trainersForClient(draft.clientMembershipId).length === 0} className={inputClass}>
              <option value="">{draft.clientMembershipId ? "Select an assigned trainer" : "Select a client first"}</option>
              {trainersForClient(draft.clientMembershipId).map((trainer) => <option key={trainer.membershipId} value={trainer.membershipId}>{trainer.name}</option>)}
            </select>
          </label>
          <label className={labelClass}>
            PT Pricing <span className="font-normal text-slate-500">(optional)</span>
            <select value={draft.ptPricingId} onChange={(event) => selectPricing(event.target.value, draft, setDraft)} disabled={loading} className={inputClass}>
              {renderPricingOptions(draft.ptPricingId)}
            </select>
          </label>
          <label className={labelClass}>
            Scheduled date and time
            <input required type="datetime-local" value={draft.scheduledAt} onChange={(event) => setDraft({ ...draft, scheduledAt: event.target.value })} className={inputClass} />
          </label>
          <label className={labelClass}>
            Duration (minutes)
            <input required type="number" min="1" max="480" step="1" value={draft.durationMinutes} onChange={(event) => setDraft({ ...draft, durationMinutes: event.target.value })} className={inputClass} />
          </label>
          <label className={labelClass}>
            Status
            <select value={draft.status} onChange={(event) => setDraft({ ...draft, status: event.target.value as SessionStatus })} className={inputClass}>
              {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
            </select>
          </label>
          <label className={`${labelClass} sm:col-span-2`}>
            Notes <span className="font-normal text-slate-500">(optional)</span>
            <textarea rows={2} value={draft.notes} onChange={(event) => setDraft({ ...draft, notes: event.target.value })} className={`${inputClass} resize-y`} />
          </label>
          <div className="sm:col-span-2 xl:col-span-4">
            {draft.clientMembershipId && trainersForClient(draft.clientMembershipId).length === 0 ? (
              <p className="mb-3 text-sm text-amber-700">This member has no active trainer assignment. Assign a trainer from Members before scheduling.</p>
            ) : null}
            <button type="submit" disabled={saving || loading || members.length === 0 || trainersForClient(draft.clientMembershipId).length === 0} className={primaryButtonClass}>
              <CalendarPlus size={17} />{saving ? "Scheduling..." : "Schedule PT Session"}
            </button>
          </div>
        </form>
      </section>

      <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-3">
          <h2 className="text-lg font-bold text-slate-900">Sessions</h2>
          <span className="text-sm text-slate-500">{sessions.length} total</span>
        </div>

        {loading ? (
          <p className="py-10 text-center text-sm text-slate-500">Loading PT sessions...</p>
        ) : sessions.length === 0 ? (
          <div className="py-10 text-center">
            <CalendarDays className="mx-auto text-slate-300" size={26} />
            <p className="mt-2 font-medium text-slate-700">No PT sessions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-200">
            {sessions.map((session) => (
              <article key={session.id} className="py-5 first:pt-4 last:pb-0">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-slate-900">{session.clientMembership.user.name}</h3>
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${statusStyles[session.status]}`}>{statusLabels[session.status]}</span>
                    </div>
                    <div className="mt-3 grid gap-x-6 gap-y-2 text-sm text-slate-600 sm:grid-cols-2 xl:grid-cols-3">
                      <span className="inline-flex items-center gap-2"><UserRound size={15} className="shrink-0 text-slate-400" />Trainer: {session.trainerMembership.user.name}</span>
                      <span className="inline-flex items-center gap-2"><CalendarDays size={15} className="shrink-0 text-slate-400" />{formatDate(session.scheduledAt)}</span>
                      <span className="inline-flex items-center gap-2"><Clock3 size={15} className="shrink-0 text-slate-400" />{session.durationMinutes} minutes</span>
                    </div>
                    <div className="mt-2 text-sm text-slate-700">
                      <span className="font-medium">PT Pricing: </span>
                      {session.ptPricing ? (
                        <>{session.ptPricing.name} <span className="text-slate-500">· {formatPrice(session.ptPricing.price, session.ptPricing.currency)}</span></>
                      ) : <span className="text-slate-500">No pricing linked</span>}
                    </div>
                    {session.notes ? <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{session.notes}</p> : null}
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button type="button" onClick={() => startEditing(session)} disabled={updatingId === session.id} className={secondaryButtonClass}>
                      <Pencil size={15} />Edit
                    </button>
                    {session.status === "SCHEDULED" ? (
                      <button type="button" onClick={() => void cancelSession(session.id)} disabled={updatingId === session.id} className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-60">
                        <X size={15} />{updatingId === session.id ? "Updating..." : "Cancel"}
                      </button>
                    ) : null}
                  </div>
                </div>

                {editId === session.id ? (
                  <form onSubmit={(event) => void handleEdit(event, session)} className="mt-5 rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                      <label className={labelClass}>
                        PT Pricing
                        <select value={editDraft.ptPricingId} onChange={(event) => selectPricing(event.target.value, editDraft, setEditDraft)} className={inputClass}>
                          {renderPricingOptions(editDraft.ptPricingId)}
                        </select>
                      </label>
                      <label className={labelClass}>
                        Scheduled date and time
                        <input required type="datetime-local" value={editDraft.scheduledAt} onChange={(event) => setEditDraft({ ...editDraft, scheduledAt: event.target.value })} disabled={session.status !== "SCHEDULED"} className={inputClass} />
                      </label>
                      <label className={labelClass}>
                        Duration (minutes)
                        <input required type="number" min="1" max="480" step="1" value={editDraft.durationMinutes} onChange={(event) => setEditDraft({ ...editDraft, durationMinutes: event.target.value })} disabled={session.status !== "SCHEDULED"} className={inputClass} />
                      </label>
                      <label className={labelClass}>
                        Status
                        <select value={editDraft.status} onChange={(event) => setEditDraft({ ...editDraft, status: event.target.value as SessionStatus })} disabled={session.status !== "SCHEDULED"} className={inputClass}>
                          {statuses.map((status) => <option key={status} value={status}>{statusLabels[status]}</option>)}
                        </select>
                      </label>
                      <label className={`${labelClass} sm:col-span-2 xl:col-span-4`}>
                        Notes
                        <textarea rows={2} value={editDraft.notes} onChange={(event) => setEditDraft({ ...editDraft, notes: event.target.value })} className={`${inputClass} resize-y`} />
                      </label>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="submit" disabled={updatingId === session.id} className={primaryButtonClass}>{updatingId === session.id ? "Saving..." : "Save changes"}</button>
                      <button type="button" onClick={() => setEditId(null)} className={secondaryButtonClass}>Discard</button>
                    </div>
                  </form>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}