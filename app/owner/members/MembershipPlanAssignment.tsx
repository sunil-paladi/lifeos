"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { formatMoney } from "@/app/lib/currency";

type Plan = {
  id: string;
  name: string;
  price: string;
  currency: string;
  durationDays: number;
};

type CurrentMembership = {
  plan: { id: string; name: string; price: string; currency: string; durationDays: number } | null;
  startDate: string | null;
  endDate: string | null;
};

function formatDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString() : "Not set";
}

function dateInputValue(value: string | null) {
  return value ? new Date(value).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10);
}

export default function MembershipPlanAssignment({
  membershipId,
  plans,
  initialMembership,
}: {
  membershipId: string;
  plans: Plan[];
  initialMembership: CurrentMembership;
}) {
  const router = useRouter();
  const [currentMembership, setCurrentMembership] = useState(initialMembership);
  const [planId, setPlanId] = useState(initialMembership.plan?.id ?? "");
  const [startDate, setStartDate] = useState(dateInputValue(initialMembership.startDate));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function assignPlan(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSuccess("");
    if (!planId || !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      setError("Select an active plan and a valid start date.");
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/owner/members/${encodeURIComponent(membershipId)}/membership-plan`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ membershipPlanId: planId, membershipStartDate: startDate }),
      });
      const data = (await response.json()) as {
        error?: string;
        membership?: {
          membershipPlan: CurrentMembership["plan"];
          membershipStartDate: string;
          membershipEndDate: string;
        };
      };
      if (!response.ok || !data.membership) {
        setError(data.error ?? "Unable to assign the membership plan.");
        return;
      }

      const updated = {
        plan: data.membership.membershipPlan,
        startDate: data.membership.membershipStartDate,
        endDate: data.membership.membershipEndDate,
      };
      setCurrentMembership(updated);
      setSuccess("Membership plan updated.");
      router.refresh();
    } catch {
      setError("Unable to assign the membership plan. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="sm:col-span-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-800">{currentMembership.plan?.name ?? "No membership plan assigned"}</p>
          <p className="mt-1 text-xs text-slate-500">
            {currentMembership.plan ? `${formatMoney(currentMembership.plan.price, currentMembership.plan.currency)} · ${currentMembership.plan.durationDays} days · ` : ""}
            {formatDate(currentMembership.startDate)} to {formatDate(currentMembership.endDate)}
          </p>
        </div>
        {plans.length === 0 ? <span className="text-xs text-slate-500">No active plans available.</span> : null}
      </div>
      {plans.length > 0 ? (
        <form onSubmit={assignPlan} className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(180px,0.7fr)_auto] sm:items-end">
          <label className="block text-xs font-semibold text-slate-600">Plan
            <select required value={planId} onChange={(event) => setPlanId(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800">
              <option value="">Select an active plan</option>
              {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} · {formatMoney(plan.price, plan.currency)} · {plan.durationDays} days</option>)}
            </select>
          </label>
          <label className="block text-xs font-semibold text-slate-600">Start date
            <input required type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-normal text-slate-800" />
          </label>
          <button disabled={loading} className="rounded-lg bg-primary px-3 py-2 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60">
            {loading ? "Saving..." : currentMembership.plan ? "Change plan" : "Assign plan"}
          </button>
        </form>
      ) : null}
      {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
      {success ? <p role="status" className="mt-2 text-sm text-primary">{success}</p> : null}
    </div>
  );
}