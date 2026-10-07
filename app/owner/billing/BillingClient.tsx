"use client";

import { useEffect, useState, type FormEvent } from "react";
import { DEFAULT_TEST_CURRENCY, formatMoney, normalizeCurrency, SUPPORTED_CURRENCIES } from "@/app/lib/currency";

type CatalogItem = {
  id: string;
  name: string;
  description: string | null;
  price: string;
  currency: string;
  durationDays?: number;
  durationMinutes?: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

type Member = {
  id: string;
  name: string;
  role: string;
  status: string;
};

type PTSession = {
  id: string;
  clientMembershipId: string;
  ptPricingId: string | null;
  scheduledAt: string;
  durationMinutes: number;
  status: string;
  trainerMembership: { user: { name: string } };
  ptPricing: {
    id: string;
    name: string;
    price: string;
    currency: string;
    durationMinutes: number;
  } | null;
};

type Payment = {
  id: string;
  memberMembershipId: string;
  paymentType: "MEMBERSHIP" | "PT_SESSION";
  amount: string;
  currency: string;
  paymentMethod: string;
  provider: string;
  status: string;
  paidAt: string | null;
  createdAt: string;
  memberMembership: { user: { name: string } };
  membershipPlan: { name: string } | null;
  ptSession: { id: string } | null;
};

type CatalogDraft = {
  name: string;
  description: string;
  price: string;
  currency: string;
  duration: string;
  isActive: boolean;
};

type PaymentDraft = {
  paymentType: "MEMBERSHIP" | "PT_SESSION";
  memberMembershipId: string;
  membershipPlanId: string;
  ptSessionId: string;
  amount: string;
  currency: string;
  paymentMethod: string;
  status: string;
  notes: string;
};

type Filters = {
  status: string;
  memberMembershipId: string;
  paymentType: string;
  from: string;
  to: string;
};

const emptyCatalog: CatalogDraft = {
  name: "",
  description: "",
  price: "",
  currency: DEFAULT_TEST_CURRENCY,
  duration: "30",
  isActive: true,
};

const emptyPayment: PaymentDraft = {
  paymentType: "MEMBERSHIP",
  memberMembershipId: "",
  membershipPlanId: "",
  ptSessionId: "",
  amount: "",
  currency: DEFAULT_TEST_CURRENCY,
  paymentMethod: "CASH",
  status: "PAID",
  notes: "",
};

const emptyFilters: Filters = {
  status: "",
  memberMembershipId: "",
  paymentType: "",
  from: "",
  to: "",
};

const inputClass = "mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-primary focus:ring-2 focus:ring-primary/15";
const labelClass = "block text-sm font-medium text-slate-700";
const buttonClass = "inline-flex items-center justify-center rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60";
const secondaryButtonClass = "inline-flex items-center justify-center rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-60";

async function readResponse<T>(response: Response): Promise<T> {
  const data = (await response.json()) as T & { error?: string };
  if (!response.ok) throw new Error(data.error ?? "The request could not be completed.");
  return data;
}

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "—";
}

function formatLabel(value: string) {
  return value.toLowerCase().replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export default function BillingClient({ gymId }: { gymId: string }) {
  const [view, setView] = useState<"plans" | "pricing" | "payments">("plans");
  const [plans, setPlans] = useState<CatalogItem[]>([]);
  const [pricing, setPricing] = useState<CatalogItem[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [sessions, setSessions] = useState<PTSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [catalogDraft, setCatalogDraft] = useState<CatalogDraft>(emptyCatalog);
  const [editing, setEditing] = useState<{ type: "plan" | "pricing"; id: string } | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<PaymentDraft>(emptyPayment);
  const [filters, setFilters] = useState<Filters>(emptyFilters);

  async function loadCatalog() {
    const [planResponse, pricingResponse] = await Promise.all([
      fetch("/api/owner/membership-plans", { cache: "no-store" }),
      fetch("/api/owner/pt-pricing", { cache: "no-store" }),
    ]);
    const [planData, pricingData] = await Promise.all([
      readResponse<{ plans: CatalogItem[] }>(planResponse),
      readResponse<{ pricing: CatalogItem[] }>(pricingResponse),
    ]);
    setPlans(planData.plans);
    setPricing(pricingData.pricing);
  }

  async function loadMembersAndSessions() {
    const [memberResponse, sessionResponse] = await Promise.all([
      fetch(`/api/gyms/${encodeURIComponent(gymId)}/members`, { cache: "no-store" }),
      fetch(`/api/gyms/${encodeURIComponent(gymId)}/pt-sessions`, { cache: "no-store" }),
    ]);
    const [memberData, sessionData] = await Promise.all([
      readResponse<{ memberships: Member[] }>(memberResponse),
      readResponse<{ sessions: PTSession[] }>(sessionResponse),
    ]);
    setMembers(memberData.memberships.filter((member) => member.role === "MEMBER" && member.status === "ACTIVE"));
    setSessions(sessionData.sessions);
  }

  async function loadPayments(nextFilters = filters) {
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(nextFilters)) {
      if (value) params.set(key, value);
    }
    const suffix = params.size ? `?${params.toString()}` : "";
    const data = await readResponse<{ payments: Payment[] }>(
      await fetch(`/api/owner/payments${suffix}`, { cache: "no-store" })
    );
    setPayments(data.payments);
  }

  async function loadAll() {
    try {
      await Promise.all([loadCatalog(), loadMembersAndSessions(), loadPayments(emptyFilters)]);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load billing data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);

    return () => window.clearTimeout(timeoutId);
    // Data is scoped to this server-verified gym membership.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gymId]);

  function startEdit(type: "plan" | "pricing", item: CatalogItem) {
    setEditing({ type, id: item.id });
    setCatalogDraft({
      name: item.name,
      description: item.description ?? "",
      price: item.price,
      currency: item.currency,
      duration: String(type === "plan" ? item.durationDays : item.durationMinutes),
      isActive: item.isActive,
    });
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditing(null);
    setCatalogDraft({ ...emptyCatalog, duration: view === "plans" ? "30" : "60" });
  }

  async function submitCatalog(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const duration = Number(catalogDraft.duration);
    const price = Number(catalogDraft.price);
    const currency = normalizeCurrency(catalogDraft.currency);
    if (!catalogDraft.name.trim() || !currency) {
      setError("Enter a name and select a supported currency.");
      return;
    }
    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be a positive number.");
      return;
    }
    if (!Number.isInteger(duration) || duration <= 0) {
      setError(view === "plans" ? "Duration must be a positive number of days." : "Duration must be a positive number of minutes.");
      return;
    }

    const type = editing?.type ?? (view === "plans" ? "plan" : "pricing");
    const collectionPath = type === "plan" ? "membership-plans" : "pt-pricing";
    const durationKey = type === "plan" ? "durationDays" : "durationMinutes";
    const payload = {
      name: catalogDraft.name.trim(),
      description: catalogDraft.description.trim() || null,
      price,
      currency,
      [durationKey]: duration,
      isActive: catalogDraft.isActive,
    };

    setSaving(true);
    try {
      const response = await fetch(
        editing ? `/api/owner/${collectionPath}/${encodeURIComponent(editing.id)}` : `/api/owner/${collectionPath}`,
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      await readResponse(response);
      await loadCatalog();
      setSuccess(editing ? "Changes saved." : `${type === "plan" ? "Membership plan" : "PT pricing"} created.`);
      setEditing(null);
      setCatalogDraft({ ...emptyCatalog, duration: type === "plan" ? "30" : "60" });
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save this item.");
    } finally {
      setSaving(false);
    }
  }

  async function toggleCatalog(type: "plan" | "pricing", item: CatalogItem) {
    setError("");
    setSuccess("");
    setSaving(true);
    const path = type === "plan" ? "membership-plans" : "pt-pricing";
    try {
      await readResponse(await fetch(`/api/owner/${path}/${encodeURIComponent(item.id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !item.isActive }),
      }));
      await loadCatalog();
      setSuccess(`${item.name} ${item.isActive ? "deactivated" : "activated"}.`);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to update this item.");
    } finally {
      setSaving(false);
    }
  }

  function selectMember(memberMembershipId: string) {
    setPaymentDraft({ ...emptyPayment, paymentType: paymentDraft.paymentType, memberMembershipId });
  }

  function selectPaymentType(paymentType: PaymentDraft["paymentType"]) {
    setPaymentDraft({ ...emptyPayment, paymentType, memberMembershipId: paymentDraft.memberMembershipId });
  }

  function selectPlan(membershipPlanId: string) {
    const plan = plans.find((item) => item.id === membershipPlanId);
    setPaymentDraft({
      ...paymentDraft,
      membershipPlanId,
      amount: plan?.price ?? "",
      currency: normalizeCurrency(plan?.currency) ?? paymentDraft.currency,
    });
  }

  function selectPTSession(ptSessionId: string) {
    const session = activeMemberSessions.find((item) => item.id === ptSessionId);
    const linkedPricing = session?.ptPricing ?? pricing.find((item) => item.id === session?.ptPricingId);
    setPaymentDraft({
      ...paymentDraft,
      ptSessionId,
      amount: linkedPricing?.price ?? "",
      currency: normalizeCurrency(linkedPricing?.currency) ?? DEFAULT_TEST_CURRENCY,
    });
  }

  async function submitPayment(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    const amount = Number(paymentDraft.amount);
    const usesPTPricing =
      paymentDraft.paymentType === "PT_SESSION" && Boolean(selectedSessionPricing);
    if (!paymentDraft.memberMembershipId) {
      setError("Select a member.");
      return;
    }
    if (!usesPTPricing && (!Number.isFinite(amount) || amount <= 0)) {
      setError("Payment amount must be a positive number.");
      return;
    }
    const currency = normalizeCurrency(paymentDraft.currency);
    if (!usesPTPricing && !currency) {
      setError("Select a supported currency.");
      return;
    }
    if (paymentDraft.paymentType === "MEMBERSHIP" && !paymentDraft.membershipPlanId) {
      setError("Select a membership plan.");
      return;
    }
    if (paymentDraft.paymentType === "PT_SESSION" && !paymentDraft.ptSessionId) {
      setError("Select a PT session belonging to the selected member.");
      return;
    }

    const payload = {
      paymentType: paymentDraft.paymentType,
      memberMembershipId: paymentDraft.memberMembershipId,
      paymentMethod: paymentDraft.paymentMethod,
      provider: "MANUAL",
      status: paymentDraft.status,
      notes: paymentDraft.notes.trim() || undefined,
      ...(!usesPTPricing ? { amount, currency } : {}),
      ...(paymentDraft.paymentType === "MEMBERSHIP"
        ? { membershipPlanId: paymentDraft.membershipPlanId }
        : { ptSessionId: paymentDraft.ptSessionId }),
    };

    setSaving(true);
    try {
      await readResponse(await fetch("/api/owner/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }));
      setPaymentDraft(emptyPayment);
      await loadPayments();
      setSuccess("Payment recorded.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to record payment.");
    } finally {
      setSaving(false);
    }
  }

  async function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      await loadPayments(filters);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to filter payments.");
    } finally {
      setLoading(false);
    }
  }

  const activeMemberSessions = sessions.filter((session) => session.clientMembershipId === paymentDraft.memberMembershipId);
  const selectedSession = activeMemberSessions.find((session) => session.id === paymentDraft.ptSessionId);
  const selectedSessionPricing =
    selectedSession?.ptPricing ??
    pricing.find((item) => item.id === selectedSession?.ptPricingId);
  const catalogItems = view === "plans" ? plans : pricing;
  const catalogType = view === "plans" ? "plan" : "pricing";
  const durationLabel = view === "plans" ? "Duration (days)" : "Duration (minutes)";

  return (
    <div className="space-y-6 py-2">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">Gym management</p>
        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">Plans & payments</h1>
        <p className="mt-2 text-slate-600">Manage membership terms, PT rates, and recorded payments.</p>
      </header>

      <div className="flex flex-wrap gap-2 border-b border-slate-200" role="tablist" aria-label="Billing sections">
        {([
          ["plans", "Membership plans"],
          ["pricing", "PT pricing"],
          ["payments", "Payments"],
        ] as const).map(([id, label]) => (
          <button key={id} type="button" role="tab" aria-selected={view === id} onClick={() => { setView(id); setError(""); setSuccess(""); }} className={`border-b-2 px-3 py-2.5 text-sm font-semibold ${view === id ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-800"}`}>
            {label}
          </button>
        ))}
      </div>

      {error ? <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{error}</p> : null}
      {success ? <p role="status" className="rounded-lg border border-primary/20 bg-primary/10 px-4 py-3 text-sm text-primary">{success}</p> : null}

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-8 text-center text-sm text-slate-500">Loading billing data...</div>
      ) : view === "payments" ? (
        <div className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Record a payment</h2>
            <form onSubmit={submitPayment} className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <label className={labelClass}>Payment type
                <select className={inputClass} value={paymentDraft.paymentType} onChange={(event) => selectPaymentType(event.target.value as PaymentDraft["paymentType"])}>
                  <option value="MEMBERSHIP">Membership</option>
                  <option value="PT_SESSION">PT session</option>
                </select>
              </label>
              <label className={labelClass}>Member
                <select required className={inputClass} value={paymentDraft.memberMembershipId} onChange={(event) => selectMember(event.target.value)}>
                  <option value="">Select member</option>
                  {members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
                </select>
              </label>
              {paymentDraft.paymentType === "MEMBERSHIP" ? (
                <label className={labelClass}>Membership plan
                  <select required className={inputClass} value={paymentDraft.membershipPlanId} onChange={(event) => selectPlan(event.target.value)}>
                    <option value="">Select active plan</option>
                    {plans.filter((plan) => plan.isActive).map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {formatMoney(plan.price, plan.currency)} · {plan.durationDays} days</option>)}
                  </select>
                </label>
              ) : (
                <label className={labelClass}>PT session
                  <select required className={inputClass} value={paymentDraft.ptSessionId} disabled={!paymentDraft.memberMembershipId} onChange={(event) => selectPTSession(event.target.value)}>
                    <option value="">{paymentDraft.memberMembershipId ? "Select this member's session" : "Select a member first"}</option>
                    {activeMemberSessions.map((session) => <option key={session.id} value={session.id}>{new Date(session.scheduledAt).toLocaleString()} · {session.ptPricing?.durationMinutes ?? session.durationMinutes} min · {session.trainerMembership.user.name} · {formatLabel(session.status)}</option>)}
                  </select>
                  {paymentDraft.memberMembershipId && activeMemberSessions.length === 0 ? <span className="mt-1 block text-xs text-slate-500">No PT sessions available for this member.</span> : null}
                </label>
              )}
              <label className={labelClass}>Amount
                <input required={!selectedSessionPricing || paymentDraft.paymentType === "MEMBERSHIP"} type="number" min="0.01" step="0.01" inputMode="decimal" className={inputClass} value={paymentDraft.amount} disabled={paymentDraft.paymentType === "PT_SESSION" && Boolean(selectedSessionPricing)} onChange={(event) => setPaymentDraft({ ...paymentDraft, amount: event.target.value })} />
                {selectedSessionPricing && paymentDraft.paymentType === "PT_SESSION" ? <span className="mt-1 block text-xs text-slate-500">Amount follows the session&apos;s PT pricing.</span> : null}
              </label>
              <label className={labelClass}>Currency
                <select required className={inputClass} value={paymentDraft.currency} disabled={paymentDraft.paymentType === "MEMBERSHIP" ? Boolean(plans.find((plan) => plan.id === paymentDraft.membershipPlanId)) : Boolean(selectedSessionPricing)} onChange={(event) => setPaymentDraft({ ...paymentDraft, currency: event.target.value })}>
                  {SUPPORTED_CURRENCIES.map(({ code, name }) => <option key={code} value={code}>{code} - {name}</option>)}
                </select>
                {selectedSessionPricing && paymentDraft.paymentType === "PT_SESSION" ? <span className="mt-1 block text-xs text-slate-500">Currency follows the session&apos;s PT pricing.</span> : null}
              </label>
              <label className={labelClass}>Payment method
                <select className={inputClass} value={paymentDraft.paymentMethod} onChange={(event) => setPaymentDraft({ ...paymentDraft, paymentMethod: event.target.value })}>
                  {[["CASH", "Cash"], ["CARD", "Card"], ["UPI", "UPI"], ["BANK_TRANSFER", "Bank transfer"], ["ONLINE", "Online"], ["OTHER", "Other"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className={labelClass}>Status
                <select className={inputClass} value={paymentDraft.status} onChange={(event) => setPaymentDraft({ ...paymentDraft, status: event.target.value })}>
                  {[["PENDING", "Pending"], ["PAID", "Paid"], ["FAILED", "Failed"], ["REFUNDED", "Refunded"], ["CANCELLED", "Cancelled"]].map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select>
              </label>
              <label className={`${labelClass} sm:col-span-2 lg:col-span-3`}>Notes <textarea rows={2} maxLength={1000} className={inputClass} value={paymentDraft.notes} onChange={(event) => setPaymentDraft({ ...paymentDraft, notes: event.target.value })} /></label>
              <div className="sm:col-span-2 lg:col-span-3"><button disabled={saving || members.length === 0} className={buttonClass}>{saving ? "Saving..." : "Record payment"}</button></div>
            </form>
            {members.length === 0 ? <p className="mt-3 text-sm text-slate-500">No active members are available for payment entry.</p> : null}
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">Payment history</h2>
            <form onSubmit={applyFilters} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
              <label className={labelClass}>Status<select className={inputClass} value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}><option value="">All statuses</option>{["PENDING", "PAID", "FAILED", "REFUNDED", "CANCELLED"].map((value) => <option key={value} value={value}>{formatLabel(value)}</option>)}</select></label>
              <label className={labelClass}>Member<select className={inputClass} value={filters.memberMembershipId} onChange={(event) => setFilters({ ...filters, memberMembershipId: event.target.value })}><option value="">All members</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
              <label className={labelClass}>Type<select className={inputClass} value={filters.paymentType} onChange={(event) => setFilters({ ...filters, paymentType: event.target.value })}><option value="">All types</option><option value="MEMBERSHIP">Membership</option><option value="PT_SESSION">PT session</option></select></label>
              <label className={labelClass}>From<input type="date" className={inputClass} value={filters.from} onChange={(event) => setFilters({ ...filters, from: event.target.value })} /></label>
              <label className={labelClass}>To<input type="date" className={inputClass} value={filters.to} onChange={(event) => setFilters({ ...filters, to: event.target.value })} /></label>
              <div className="sm:col-span-2 lg:col-span-5 flex gap-2"><button className={buttonClass}>Apply filters</button><button type="button" className={secondaryButtonClass} onClick={() => { setFilters(emptyFilters); void loadPayments(emptyFilters); }}>Clear</button></div>
            </form>
            {payments.length === 0 ? <p className="mt-5 rounded-lg border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500">No payment records found.</p> : (
              <div
                aria-label="Payment history table"
                className="-mx-5 mt-5 overflow-x-auto px-5 sm:mx-0 sm:px-0"
                role="region"
                tabIndex={0}
              >
                <table className="w-full min-w-[1050px] text-left text-sm">
                  <thead className="border-b border-slate-200 text-xs uppercase tracking-wide text-slate-500"><tr>{["Member", "Type", "Amount", "Method / provider", "Status", "Plan / session", "Paid", "Created"].map((heading) => <th key={heading} className="px-3 py-3 font-semibold">{heading}</th>)}</tr></thead>
                  <tbody className="divide-y divide-slate-100">{payments.map((payment) => <tr key={payment.id}>
                    <td className="px-3 py-3 font-medium text-slate-900">{payment.memberMembership.user.name}</td>
                    <td className="px-3 py-3">{payment.paymentType === "MEMBERSHIP" ? "Membership" : "PT session"}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatMoney(payment.amount, payment.currency)}</td>
                    <td className="px-3 py-3">{formatLabel(payment.paymentMethod)} / {formatLabel(payment.provider)}</td>
                    <td className="px-3 py-3">{formatLabel(payment.status)}</td>
                    <td className="px-3 py-3">{payment.membershipPlan?.name ?? (payment.ptSession ? `Session ${payment.ptSession.id.slice(-6)}` : "—")}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(payment.paidAt)}</td>
                    <td className="px-3 py-3 whitespace-nowrap">{formatDate(payment.createdAt)}</td>
                  </tr>)}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-[minmax(300px,0.8fr)_minmax(0,1.5fr)]">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <h2 className="text-lg font-bold text-slate-900">{editing ? "Edit" : "Create"} {view === "plans" ? "membership plan" : "PT pricing"}</h2>
            <form onSubmit={submitCatalog} className="mt-4 space-y-4">
              <label className={labelClass}>Name<input required maxLength={120} className={inputClass} value={catalogDraft.name} onChange={(event) => setCatalogDraft({ ...catalogDraft, name: event.target.value })} /></label>
              <label className={labelClass}>Description<textarea rows={3} maxLength={1000} className={inputClass} value={catalogDraft.description} onChange={(event) => setCatalogDraft({ ...catalogDraft, description: event.target.value })} /></label>
              <div className="grid grid-cols-2 gap-3">
                <label className={labelClass}>Price<input required type="number" min="0.01" step="0.01" inputMode="decimal" className={inputClass} value={catalogDraft.price} onChange={(event) => setCatalogDraft({ ...catalogDraft, price: event.target.value })} /></label>
                <label className={labelClass}>Currency<select required className={inputClass} value={catalogDraft.currency} onChange={(event) => setCatalogDraft({ ...catalogDraft, currency: event.target.value })}>{SUPPORTED_CURRENCIES.map(({ code, name }) => <option key={code} value={code}>{code} - {name}</option>)}</select></label>
              </div>
              <label className={labelClass}>{durationLabel}<input required type="number" min="1" step="1" inputMode="numeric" className={inputClass} value={catalogDraft.duration} onChange={(event) => setCatalogDraft({ ...catalogDraft, duration: event.target.value })} /></label>
              <label className="flex items-center gap-2 text-sm font-medium text-slate-700"><input type="checkbox" checked={catalogDraft.isActive} onChange={(event) => setCatalogDraft({ ...catalogDraft, isActive: event.target.checked })} className="h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary" />Active</label>
              <div className="flex flex-wrap gap-2"><button disabled={saving} className={buttonClass}>{saving ? "Saving..." : editing ? "Save changes" : "Create"}</button>{editing ? <button type="button" className={secondaryButtonClass} onClick={cancelEdit}>Cancel</button> : null}</div>
            </form>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="border-b border-slate-100 px-5 py-4 sm:px-6"><h2 className="font-bold text-slate-900">{view === "plans" ? "Membership plans" : "PT pricing"}</h2><p className="mt-1 text-sm text-slate-500">{catalogItems.length} record{catalogItems.length === 1 ? "" : "s"}</p></div>
            {catalogItems.length === 0 ? <p className="p-6 text-sm text-slate-500">No {view === "plans" ? "membership plans" : "PT pricing"} found.</p> : <div className="divide-y divide-slate-100">{catalogItems.map((item) => <article key={item.id} className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-6">
              <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h3 className="font-semibold text-slate-900">{item.name}</h3><span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.isActive ? "bg-primary/10 text-primary" : "bg-slate-100 text-slate-600"}`}>{item.isActive ? "Active" : "Inactive"}</span></div>
                {item.description ? <p className="mt-1 text-sm text-slate-600">{item.description}</p> : null}
                <p className="mt-2 text-sm text-slate-700">{formatMoney(item.price, item.currency)} <span className="text-slate-400">·</span> {view === "plans" ? `${item.durationDays} days` : `${item.durationMinutes} minutes`}</p>
                <p className="mt-1 text-xs text-slate-400">Updated {formatDate(item.updatedAt)}</p>
              </div>
              <div className="flex shrink-0 gap-2"><button type="button" className={secondaryButtonClass} onClick={() => startEdit(catalogType, item)}>Edit</button><button type="button" disabled={saving} className={secondaryButtonClass} onClick={() => void toggleCatalog(catalogType, item)}>{item.isActive ? "Deactivate" : "Activate"}</button></div>
            </article>)}</div>}
          </section>
        </div>
      )}
    </div>
  );
}