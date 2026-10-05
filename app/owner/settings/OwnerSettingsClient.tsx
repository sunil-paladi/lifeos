"use client";

import { useEffect, useState } from "react";
import { SUPPORTED_CURRENCIES } from "@/app/lib/currency";
import {
  COUNTRY_CODES,
  getCountryDefaults,
  getCountryDisplayName,
  getLocaleDisplayName,
  SUPPORTED_LOCALES,
} from "@/app/lib/regional-preferences";

type SettingsForm = {
  gymName: string;
  country: string;
  timezone: string;
  currency: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  weightUnit: string;
  heightUnit: string;
  distanceUnit: string;
};

const REGIONAL_FIELDS = [
  "country",
  "timezone",
  "currency",
  "locale",
  "dateFormat",
  "timeFormat",
  "weightUnit",
  "heightUnit",
  "distanceUnit",
] as const;

type RegionalField = (typeof REGIONAL_FIELDS)[number];

function buildFallbackForm(gymName: string, country?: string): SettingsForm {
  const defaults = getCountryDefaults(country ?? "IN");
  return {
    gymName,
    country: defaults.country,
    timezone: defaults.timezone,
    currency: defaults.currency,
    locale: defaults.locale,
    dateFormat: defaults.dateFormat,
    timeFormat: defaults.timeFormat,
    weightUnit: defaults.weightUnit,
    heightUnit: defaults.heightUnit,
    distanceUnit: defaults.distanceUnit,
  };
}

const TIMEZONE_OPTIONS: string[] = (() => {
  try {
    return Intl.supportedValuesOf("timeZone");
  } catch {
    return [
      "Asia/Kolkata",
      "America/New_York",
      "Europe/London",
      "Europe/Paris",
      "Asia/Dubai",
      "Asia/Singapore",
      "Australia/Sydney",
    ];
  }
})();

const COUNTRY_OPTIONS = COUNTRY_CODES.map((code) => ({
  value: code,
  label: `${getCountryDisplayName(code)} (${code})`,
}));

const LOCALE_OPTIONS = SUPPORTED_LOCALES.map((tag) => ({
  value: tag,
  label: getLocaleDisplayName(tag),
}));

function withValue(options: { value: string; label: string }[], value: string) {
  return options.some((option) => option.value === value)
    ? options
    : [...options, { value, label: value }];
}

export default function OwnerSettingsClient({
  gymId,
  defaultGymName,
}: {
  gymId: string;
  defaultGymName: string;
}) {
  const [form, setForm] = useState<SettingsForm>(() => buildFallbackForm(defaultGymName));
  // Tracks fields the owner edited manually, so a country change can
  // prefill recommendations only for fields the owner has not touched.
  const [touched, setTouched] = useState<Record<RegionalField, boolean>>({
    country: false,
    timezone: false,
    currency: false,
    locale: false,
    dateFormat: false,
    timeFormat: false,
    weightUnit: false,
    heightUnit: false,
    distanceUnit: false,
  });
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
          locale?: string;
          dateFormat?: string;
          timeFormat?: string;
          weightUnit?: string;
          heightUnit?: string;
          distanceUnit?: string;
        };

        const fallback = buildFallbackForm(data.gymName ?? defaultGymName, data.country);
        setForm({
          gymName: data.gymName ?? defaultGymName,
          country: data.country ?? fallback.country,
          timezone: data.timezone ?? fallback.timezone,
          currency: data.currency ?? fallback.currency,
          locale: data.locale ?? fallback.locale,
          dateFormat: data.dateFormat ?? fallback.dateFormat,
          timeFormat: data.timeFormat ?? fallback.timeFormat,
          weightUnit: data.weightUnit ?? fallback.weightUnit,
          heightUnit: data.heightUnit ?? fallback.heightUnit,
          // Normalize legacy "mi" to the canonical "miles" vocabulary.
          distanceUnit:
            data.distanceUnit === "mi"
              ? "miles"
              : data.distanceUnit ?? fallback.distanceUnit,
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
    setSuccess(null);
    setError(null);
    setValidationErrors((previous) => ({ ...previous, [field]: "" }));

    const nextTouched =
      field in touched ? { ...touched, [field]: true } : touched;
    setTouched(nextTouched);

    const next: SettingsForm = { ...form, [field]: value };

    // Country change: prefill the country's recommended timezone/locale/
    // currency/units for every field the owner has NOT edited by hand.
    // Recommendations only — the owner can still override each one after.
    if (field === "country" && value !== form.country) {
      const recommended = getCountryDefaults(value);
      for (const key of REGIONAL_FIELDS) {
        if (key === "country") continue;
        if (!nextTouched[key]) {
          next[key] = recommended[key];
        }
      }
    }

    setForm(next);
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
        message?: string;
        error?: string;
        details?: Record<string, string>;
      } | null;

      if (!response.ok) {
        if (body?.details) {
          setValidationErrors(body.details);
        }
        throw new Error(body?.error ?? "Unable to save gym settings");
      }

      setSuccess(body?.message ?? "Gym settings updated successfully");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save gym settings");
    } finally {
      setSaving(false);
    }
  }

  const selectClassName =
    "mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-primary";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Gym Settings</h1>
        <p className="mt-1 text-sm text-slate-500">
          Regional defaults for your gym. Members without personal overrides inherit these values.
          Country changes suggest matching defaults for fields you have not edited yourself.
        </p>
      </div>

      {loading ? (
        <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-500 shadow-sm">
          Loading settings…
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-6">
          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">General</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <label className="block text-sm font-medium text-slate-700 md:col-span-2">
                Gym name
                <input
                  type="text"
                  value={form.gymName}
                  onChange={(event) => updateField("gymName", event.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-slate-900 outline-none focus:border-primary"
                  maxLength={100}
                  required
                />
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Country
                <select
                  value={form.country}
                  onChange={(event) => updateField("country", event.target.value)}
                  className={selectClassName}
                >
                  {withValue(COUNTRY_OPTIONS, form.country).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-normal text-slate-400">
                  Stored as ISO 3166-1 alpha-2. Suggestions, not requirements — every field below
                  stays editable.
                </span>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Currency
                <select
                  value={form.currency}
                  onChange={(event) => updateField("currency", event.target.value)}
                  className={selectClassName}
                >
                  {withValue(
                    SUPPORTED_CURRENCIES.map(({ code, name }) => ({
                      value: code,
                      label: `${code} — ${name}`,
                    })),
                    form.currency,
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Timezone
                <select
                  value={form.timezone}
                  onChange={(event) => updateField("timezone", event.target.value)}
                  className={selectClassName}
                >
                  {withValue(
                    TIMEZONE_OPTIONS.map((timezone) => ({
                      value: timezone,
                      label: timezone.replace(/_/g, " "),
                    })),
                    form.timezone,
                  ).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Locale (language)
                <select
                  value={form.locale}
                  onChange={(event) => updateField("locale", event.target.value)}
                  className={selectClassName}
                >
                  {withValue(LOCALE_OPTIONS, form.locale).map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <span className="mt-1 block text-xs font-normal text-slate-400">
                  BCP 47 language tag, such as en-IN or fr-CA.
                </span>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Date format
                <select value={form.dateFormat} onChange={(event) => updateField("dateFormat", event.target.value)} className={selectClassName}>
                  <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                  <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                  <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Time format
                <select value={form.timeFormat} onChange={(event) => updateField("timeFormat", event.target.value)} className={selectClassName}>
                  <option value="12h">12h</option>
                  <option value="24h">24h</option>
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-bold text-slate-900">Units</h2>
            <div className="mt-4 grid gap-4 md:grid-cols-3">
              <label className="block text-sm font-medium text-slate-700">
                Weight unit
                <select value={form.weightUnit} onChange={(event) => updateField("weightUnit", event.target.value)} className={selectClassName}>
                  <option value="kg">kg</option>
                  <option value="lb">lb</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Height unit
                <select value={form.heightUnit} onChange={(event) => updateField("heightUnit", event.target.value)} className={selectClassName}>
                  <option value="cm">cm</option>
                  <option value="ft_in">ft / in</option>
                </select>
              </label>

              <label className="block text-sm font-medium text-slate-700">
                Distance unit
                <select value={form.distanceUnit} onChange={(event) => updateField("distanceUnit", event.target.value)} className={selectClassName}>
                  <option value="km">km</option>
                  <option value="miles">miles</option>
                </select>
              </label>
            </div>
          </section>

          {Object.values(validationErrors).some(Boolean) ? (
            <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {Object.entries(validationErrors)
                .filter(([, message]) => Boolean(message))
                .map(([field, message]) => (
                  <div key={field}>
                    <span className="font-semibold">{field}:</span> {message}
                  </div>
                ))}
            </div>
          ) : null}
          {error ? <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div> : null}
          {success ? <div className="rounded-xl border border-primary/20 bg-primary/10 p-3 text-sm text-primary">{success}</div> : null}

          <div className="flex items-center justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-primary px-4 py-2.5 text-sm font-semibold text-white hover:bg-primary/90 disabled:cursor-not-allowed disabled:bg-primary/60"
            >
              {saving ? "Saving…" : "Save settings"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
