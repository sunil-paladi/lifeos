"use client";

import { useEffect, useState } from "react";

type SettingsForm = {
  gymName: string;
  country: string;
  timezone: string;
  currency: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  weightUnit: string;
  distanceUnit: string;
};

const DEFAULT_SETTINGS: SettingsForm = {
  gymName: "",
  country: "IN",
  timezone: "Asia/Kolkata",
  currency: "INR",
  language: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  weightUnit: "kg",
  distanceUnit: "km",
};

export default function OwnerSettingsClient({
  gymId,
  defaultGymName,
}: {
  gymId: string;
  defaultGymName: string;
}) {
  const [form, setForm] = useState<SettingsForm>({ ...DEFAULT_SETTINGS, gymName: defaultGymName });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    async function loadSettings() {
      try {
        const response = await fetch(`/api/gyms/${encodeURIComponent(gymId)}/settings`, {
          cache: "no-store",
        });

        if (!response.ok) {
          const body = await response.json().catch(() => null);
          throw new Error(body?.error ?? "You can not access gym settings");
        }

        const data = (await response.json()) as {
          gymName?: string;
          country?: string;
          timezone?: string;
          currency?: string;
          language?: string;
          dateFormat?: string;
          timeFormat?: string;
          weightUnit?: string;
          distanceUnit?: string;
        };

        setForm({
          gymName: data.gymName ?? defaultGymName,
          country: data.country ?? "IN",
          timezone: data.timezone ?? "Asia/Kolkata",
          currency: data.currency ?? "INR",
          language: data.language ?? "en",
          dateFormat: data.dateFormat ?? "DD/MM/YYYY",
          timeFormat: data.timeFormat ?? "12h",
          weightUnit: data.weightUnit ?? "kg",
          distanceUnit: data.distanceUnit ?? "km",
        });
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Unable to load gym settings");
      } finally {
        setLoading(false);
      }
    }

    void loadSettings();
  }, [defaultGymName, gymId]);

  function updateField(field: keyof SettingsForm, value: string) {
    setForm((previous) => ({ ...previous, [field]: value }));
    setSuccess(null);
    setError(null);
    setValidationErrors((previous) => ({ ...previous, [field]: "" }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setSuccess(null);
    setError(null);
    setValidationErrors({});

    try {
      const response = await fetch(`/api/gyms/${encodeURIComponent(gymId)}/settings`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const body = (await response.json().catch(() => null)) as {
        error?: string;
        details?: Record<string, string>;
        message?: string;
      };

      if (!response.ok) {
        if (body?.details) {
          setValidationErrors(body.details);
        }
        throw new Error(body?.error ?? "Unable to save gym settings");
      }

      setSuccess(body?.message ?? "Gym settings saved successfully");
      setForm((previous) => ({ ...previous, gymName: body?.message ? previous.gymName : previous.gymName }));
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save gym settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Gym settings</h1>
        <p className="mt-2 text-sm text-slate-600">Manage your gym profile, regional defaults, and unit preferences.</p>
      </div>

      {loading ? (
        <div className="mt-6 rounded-xl border border-slate-200 bg-white p-8 text-center text-slate-500">Loading settings…</div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Gym</h2>
            <div className="mt-4">
              <label className="block text-sm font-medium text-slate-700">
                Gym name
                <input
                  type="text"
                  value={form.gymName}
                  onChange={(event) => updateField("gymName", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500"
                />
              </label>
              {validationErrors.gymName ? <p className="mt-1 text-sm text-red-600">{validationErrors.gymName}</p> : null}
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Regional</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Country
                <select value={form.country} onChange={(event) => updateField("country", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500">
                  <option value="IN">IN</option>
                  <option value="US">US</option>
                  <option value="GB">GB</option>
                  <option value="CA">CA</option>
                  <option value="AU">AU</option>
                  <option value="DE">DE</option>
                  <option value="FR">FR</option>
                  <option value="AE">AE</option>
                  <option value="SG">SG</option>
                  <option value="NZ">NZ</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Timezone
                <select value={form.timezone} onChange={(event) => updateField("timezone", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500">
                  {[
                    "UTC",
                    "Asia/Kolkata",
                    "America/New_York",
                    "Europe/London",
                    "Europe/Paris",
                    "Asia/Dubai",
                    "Asia/Singapore",
                    "Australia/Sydney",
                  ].map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Currency
                <select value={form.currency} onChange={(event) => updateField("currency", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500">
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                  <option value="AED">AED</option>
                  <option value="SGD">SGD</option>
                  <option value="AUD">AUD</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Language
                <select value={form.language} onChange={(event) => updateField("language", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500">
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="es">Spanish</option>
                  <option value="ar">Arabic</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Date format
                <select value={form.dateFormat} onChange={(event) => updateField("dateFormat", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500">
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Time format
                <select value={form.timeFormat} onChange={(event) => updateField("timeFormat", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500">
                  <option value="12h">12h</option>
                  <option value="24h">24h</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Units</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700">
                Weight unit
                <select value={form.weightUnit} onChange={(event) => updateField("weightUnit", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500">
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Distance unit
                <select value={form.distanceUnit} onChange={(event) => updateField("distanceUnit", event.target.value)} className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-green-500">
                  <option value="km">km</option>
                  <option value="mi">mi</option>
                </select>
              </label>
            </div>
          </section>

          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {success ? <div className="rounded-xl border border-green-200 bg-green-50 p-3 text-sm text-green-700">{success}</div> : null}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:bg-green-400"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
