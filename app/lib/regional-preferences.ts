export const USER_DATE_FORMATS = [
  "DD/MM/YYYY",
  "MM/DD/YYYY",
  "YYYY-MM-DD",
] as const;

export const USER_TIME_FORMATS = ["12h", "24h"] as const;
export const USER_WEIGHT_UNITS = ["kg", "lb"] as const;
export const USER_HEIGHT_UNITS = ["cm", "ft_in"] as const;
export const USER_DISTANCE_UNITS = ["km", "miles"] as const;

export const DEFAULT_USER_PREFERENCES = {
  timezone: "Asia/Kolkata",
  country: "IN",
  locale: "en-IN",
  currency: "INR",
  weightUnit: "kg",
  heightUnit: "cm",
  distanceUnit: "km",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
} as const;

const ISO_3166_ALPHA_2_CODES = new Set(
  `AD AE AF AG AI AL AM AO AQ AR AS AT AU AW AX AZ BA BB BD BE BF BG BH BI BJ BL BM BN BO BQ BR BS BT BV BW BY BZ CA CC CD CF CG CH CI CK CL CM CN CO CR CU CV CW CX CY CZ DE DJ DK DM DO DZ EC EE EG EH ER ES ET FI FJ FK FM FO FR GA GB GD GE GF GG GH GI GL GM GN GP GQ GR GS GT GU GW GY HK HM HN HR HT HU ID IE IL IM IN IO IQ IR IS IT JE JM JO JP KE KG KH KI KM KN KP KR KW KY KZ LA LB LC LI LK LR LS LT LU LV LY MA MC MD ME MF MG MH MK ML MM MN MO MP MQ MR MS MT MU MV MW MX MY MZ NA NC NE NF NG NI NL NO NP NR NU NZ OM PA PE PF PG PH PK PL PM PN PR PS PT PW PY QA RE RO RS RU RW SA SB SC SD SE SG SH SI SJ SK SL SM SN SO SR SS ST SV SX SY SZ TC TD TF TG TH TJ TK TL TM TN TO TR TT TV TW TZ UA UG UM US UY UZ VA VC VE VG VI VN VU WF WS YE YT ZA ZM ZW`.split(
    " ",
  ),
);

export function isSupportedCountry(value: unknown): value is string {
  return typeof value === "string" && ISO_3166_ALPHA_2_CODES.has(value);
}

export function normalizeUserTimezone(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 100) {
    return null;
  }

  try {
    return new Intl.DateTimeFormat("en", {
      timeZone: value.trim(),
    }).resolvedOptions().timeZone;
  } catch {
    return null;
  }
}

export function normalizeUserLocale(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim() || value.length > 35) {
    return null;
  }

  try {
    const [locale] = Intl.getCanonicalLocales(value.trim());
    return locale && new Intl.DateTimeFormat(locale) ? locale : null;
  } catch {
    return null;
  }
}

export function isSupportedCurrency(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[A-Z]{3}$/.test(value) &&
    Intl.supportedValuesOf("currency").includes(value)
  );
}

// ========================================
// Regional preference model
// ========================================

/**
 * The complete set of regional/display preferences. Every layer of the
 * resolution chain (user, gym, browser/device, built-in) provides values
 * with this shape.
 */
export type RegionalPreferences = {
  timezone: string;
  country: string;
  locale: string;
  currency: string;
  weightUnit: string;
  heightUnit: string;
  distanceUnit: string;
  dateFormat: string;
  timeFormat: string;
};

export type RegionalPreferenceKey = keyof RegionalPreferences;

export const REGIONAL_PREFERENCE_KEYS = [
  "timezone",
  "country",
  "locale",
  "currency",
  "weightUnit",
  "heightUnit",
  "distanceUnit",
  "dateFormat",
  "timeFormat",
] as const satisfies readonly RegionalPreferenceKey[];

/** Where an effective value came from during resolution. */
export type RegionalPreferenceSource =
  | "user"
  | "gym"
  | "browser"
  | "builtin";

export type RegionalProvenance = Record<
  RegionalPreferenceKey,
  RegionalPreferenceSource
>;

/**
 * One layer of the resolution chain. `undefined` means "layer does not
 * provide this field", `null` means "explicitly not set (inherit)".
 */
export type RegionalPreferenceLayer =
  | Partial<Record<RegionalPreferenceKey, string | null | undefined>>
  | null
  | undefined;

// ========================================
// COUNTRY_DEFAULTS registry
// ========================================
//
// One centralized, code-level registry of *recommended* per-country
// defaults. Country is stored everywhere as an ISO 3166-1 alpha-2 code;
// friendly display names come from Intl.DisplayNames. No Country table.
//
// These values are recommendations, not claims that a country has one
// universally correct timezone, locale, or unit system. Every individual
// field can be overridden by the owner (or by a member via their own
// profile), and multi-timezone countries use a single representative
// timezone here purely as a sensible starting point.
//
// Fields not overridden per country fall back to metric units, DD/MM/YYYY,
// and a 24-hour clock (common international defaults).

type CountryDefaultsSeed = {
  timezone: string;
  currency: string;
  locale: string;
  weightUnit?: (typeof USER_WEIGHT_UNITS)[number];
  heightUnit?: (typeof USER_HEIGHT_UNITS)[number];
  distanceUnit?: (typeof USER_DISTANCE_UNITS)[number];
  dateFormat?: (typeof USER_DATE_FORMATS)[number];
  timeFormat?: (typeof USER_TIME_FORMATS)[number];
};

const COUNTRY_SEEDS: Record<string, CountryDefaultsSeed> = {
  // Europe
  GB: { timezone: "Europe/London", currency: "GBP", locale: "en-GB", distanceUnit: "miles" },
  IE: { timezone: "Europe/Dublin", currency: "EUR", locale: "en-IE" },
  FR: { timezone: "Europe/Paris", currency: "EUR", locale: "fr-FR" },
  DE: { timezone: "Europe/Berlin", currency: "EUR", locale: "de-DE" },
  ES: { timezone: "Europe/Madrid", currency: "EUR", locale: "es-ES" },
  IT: { timezone: "Europe/Rome", currency: "EUR", locale: "it-IT" },
  NL: { timezone: "Europe/Amsterdam", currency: "EUR", locale: "nl-NL" },
  PT: { timezone: "Europe/Lisbon", currency: "EUR", locale: "pt-PT" },
  CH: { timezone: "Europe/Zurich", currency: "CHF", locale: "de-CH" },
  AT: { timezone: "Europe/Vienna", currency: "EUR", locale: "de-AT" },
  BE: { timezone: "Europe/Brussels", currency: "EUR", locale: "nl-BE" },
  SE: { timezone: "Europe/Stockholm", currency: "SEK", locale: "sv-SE", dateFormat: "YYYY-MM-DD" },
  NO: { timezone: "Europe/Oslo", currency: "NOK", locale: "nb-NO" },
  DK: { timezone: "Europe/Copenhagen", currency: "DKK", locale: "da-DK" },
  FI: { timezone: "Europe/Helsinki", currency: "EUR", locale: "fi-FI" },
  PL: { timezone: "Europe/Warsaw", currency: "PLN", locale: "pl-PL" },
  CZ: { timezone: "Europe/Prague", currency: "CZK", locale: "cs-CZ" },
  HU: { timezone: "Europe/Budapest", currency: "HUF", locale: "hu-HU" },
  RO: { timezone: "Europe/Bucharest", currency: "RON", locale: "ro-RO" },
  GR: { timezone: "Europe/Athens", currency: "EUR", locale: "el-GR" },
  RU: { timezone: "Europe/Moscow", currency: "RUB", locale: "ru-RU" },
  UA: { timezone: "Europe/Kyiv", currency: "UAH", locale: "uk-UA" },
  TR: { timezone: "Europe/Istanbul", currency: "TRY", locale: "tr-TR" },
  // Americas
  US: {
    timezone: "America/New_York",
    currency: "USD",
    locale: "en-US",
    weightUnit: "lb",
    heightUnit: "ft_in",
    distanceUnit: "miles",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  },
  CA: { timezone: "America/Toronto", currency: "CAD", locale: "en-CA", timeFormat: "12h" },
  MX: { timezone: "America/Mexico_City", currency: "MXN", locale: "es-MX" },
  BR: { timezone: "America/Sao_Paulo", currency: "BRL", locale: "pt-BR" },
  AR: { timezone: "America/Argentina/Buenos_Aires", currency: "ARS", locale: "es-AR" },
  CL: { timezone: "America/Santiago", currency: "CLP", locale: "es-CL" },
  CO: { timezone: "America/Bogota", currency: "COP", locale: "es-CO" },
  PE: { timezone: "America/Lima", currency: "PEN", locale: "es-PE" },
  // Asia
  IN: { timezone: "Asia/Kolkata", currency: "INR", locale: "en-IN", timeFormat: "12h" },
  PK: { timezone: "Asia/Karachi", currency: "PKR", locale: "ur-PK", timeFormat: "12h" },
  BD: { timezone: "Asia/Dhaka", currency: "BDT", locale: "bn-BD" },
  LK: { timezone: "Asia/Colombo", currency: "LKR", locale: "si-LK" },
  NP: { timezone: "Asia/Kathmandu", currency: "NPR", locale: "ne-NP" },
  AE: { timezone: "Asia/Dubai", currency: "AED", locale: "ar-AE", timeFormat: "12h" },
  SA: { timezone: "Asia/Riyadh", currency: "SAR", locale: "ar-SA", timeFormat: "12h" },
  QA: { timezone: "Asia/Qatar", currency: "QAR", locale: "ar-QA", timeFormat: "12h" },
  KW: { timezone: "Asia/Kuwait", currency: "KWD", locale: "ar-KW", timeFormat: "12h" },
  OM: { timezone: "Asia/Muscat", currency: "OMR", locale: "ar-OM", timeFormat: "12h" },
  IL: { timezone: "Asia/Jerusalem", currency: "ILS", locale: "he-IL" },
  SG: { timezone: "Asia/Singapore", currency: "SGD", locale: "en-SG" },
  MY: { timezone: "Asia/Kuala_Lumpur", currency: "MYR", locale: "ms-MY" },
  TH: { timezone: "Asia/Bangkok", currency: "THB", locale: "th-TH" },
  VN: { timezone: "Asia/Ho_Chi_Minh", currency: "VND", locale: "vi-VN" },
  ID: { timezone: "Asia/Jakarta", currency: "IDR", locale: "id-ID" },
  PH: {
    timezone: "Asia/Manila",
    currency: "PHP",
    locale: "en-PH",
    dateFormat: "MM/DD/YYYY",
    timeFormat: "12h",
  },
  JP: { timezone: "Asia/Tokyo", currency: "JPY", locale: "ja-JP", dateFormat: "YYYY-MM-DD" },
  KR: { timezone: "Asia/Seoul", currency: "KRW", locale: "ko-KR", dateFormat: "YYYY-MM-DD" },
  CN: { timezone: "Asia/Shanghai", currency: "CNY", locale: "zh-CN", dateFormat: "YYYY-MM-DD" },
  HK: { timezone: "Asia/Hong_Kong", currency: "HKD", locale: "zh-HK" },
  TW: { timezone: "Asia/Taipei", currency: "TWD", locale: "zh-TW", dateFormat: "YYYY-MM-DD" },
  // Africa
  ZA: { timezone: "Africa/Johannesburg", currency: "ZAR", locale: "en-ZA" },
  NG: { timezone: "Africa/Lagos", currency: "NGN", locale: "en-NG" },
  KE: { timezone: "Africa/Nairobi", currency: "KES", locale: "en-KE" },
  GH: { timezone: "Africa/Accra", currency: "GHS", locale: "en-GH" },
  MA: { timezone: "Africa/Casablanca", currency: "MAD", locale: "ar-MA" },
  EG: { timezone: "Africa/Cairo", currency: "EGP", locale: "ar-EG", timeFormat: "12h" },
  // Oceania
  AU: { timezone: "Australia/Sydney", currency: "AUD", locale: "en-AU", timeFormat: "12h" },
  NZ: { timezone: "Pacific/Auckland", currency: "NZD", locale: "en-NZ", timeFormat: "12h" },
};

function buildCountryDefaults(
  seeds: Record<string, CountryDefaultsSeed>,
): Record<string, RegionalPreferences> {
  const registry: Record<string, RegionalPreferences> = {};

  for (const [country, seed] of Object.entries(seeds)) {
    registry[country] = {
      timezone: seed.timezone,
      country,
      locale: seed.locale,
      currency: seed.currency,
      weightUnit: seed.weightUnit ?? "kg",
      heightUnit: seed.heightUnit ?? "cm",
      distanceUnit: seed.distanceUnit ?? "km",
      dateFormat: seed.dateFormat ?? "DD/MM/YYYY",
      timeFormat: seed.timeFormat ?? "24h",
    };
  }

  return registry;
}

/**
 * Recommended country defaults (ISO alpha-2 code -> preferences).
 * Recommendations only; every field remains individually overridable.
 */
export const COUNTRY_DEFAULTS: Readonly<Record<string, RegionalPreferences>> =
  Object.freeze(buildCountryDefaults(COUNTRY_SEEDS));

/** Sorted ISO alpha-2 codes covered by the registry (drives UI selectors). */
export const COUNTRY_CODES: readonly string[] = Object.freeze(
  Object.keys(COUNTRY_DEFAULTS).sort(),
);

/**
 * Recommended defaults for a country code. Unknown-but-valid ISO codes fall
 * back to the built-in defaults (keeping the country code); anything else
 * falls back to the built-in defaults entirely.
 */
export function getCountryDefaults(value: unknown): RegionalPreferences {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  const defaults = COUNTRY_DEFAULTS[code];

  if (defaults) {
    return { ...defaults };
  }

  return {
    ...DEFAULT_USER_PREFERENCES,
    country: isSupportedCountry(code) ? code : DEFAULT_USER_PREFERENCES.country,
  };
}

// ========================================
// Layered resolution
// ========================================

function normalizeLayerValue(value: string | null | undefined): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Resolves the effective regional preferences field-by-field with the chain:
 * user explicit value -> gym (business) defaults -> browser/device ->
 * built-in defaults. Returns both the effective values and, per field, which
 * layer supplied it (for provenance badges in the UI).
 */
export function resolveRegionalPreferences(layers: {
  user?: RegionalPreferenceLayer;
  gym?: RegionalPreferenceLayer;
  browser?: RegionalPreferenceLayer;
  builtIn?: RegionalPreferences;
}): {
  effective: RegionalPreferences;
  provenance: RegionalProvenance;
} {
  const builtIn: RegionalPreferences =
    layers.builtIn ?? { ...DEFAULT_USER_PREFERENCES };
  const effective = {} as RegionalPreferences;
  const provenance = {} as RegionalProvenance;

  for (const key of REGIONAL_PREFERENCE_KEYS) {
    const userValue = normalizeLayerValue(layers.user?.[key]);
    if (userValue) {
      effective[key] = userValue;
      provenance[key] = "user";
      continue;
    }

    const gymValue = normalizeLayerValue(layers.gym?.[key]);
    if (gymValue) {
      effective[key] = gymValue;
      provenance[key] = "gym";
      continue;
    }

    const browserValue = normalizeLayerValue(layers.browser?.[key]);
    if (browserValue) {
      effective[key] = browserValue;
      provenance[key] = "browser";
      continue;
    }

    effective[key] = builtIn[key];
    provenance[key] = "builtin";
  }

  return { effective, provenance };
}

/**
 * Browser/device-derived preferences (client-side only). Uses the device
 * timezone, the preferred language, and — when the language tag carries a
 * region subtag — the country recommendations as a starting point.
 */
export function getClientBrowserPreferences(): RegionalPreferenceLayer {
  if (typeof window === "undefined" || typeof navigator === "undefined") {
    return null;
  }

  const browser: Partial<Record<RegionalPreferenceKey, string>> = {};

  const timezone = normalizeUserTimezone(
    Intl.DateTimeFormat().resolvedOptions().timeZone,
  );
  if (timezone) browser.timezone = timezone;

  const rawLocale = navigator.languages?.[0] ?? navigator.language;
  const locale = normalizeUserLocale(rawLocale);
  if (locale) browser.locale = locale;

  const segments = locale ? locale.split("-") : [];
  const region = segments[segments.length - 1]?.toUpperCase();
  if (region && isSupportedCountry(region)) {
    Object.assign(browser, getCountryDefaults(region));
    // The device's own timezone/locale are more precise than country-level
    // recommendations, so they win over what the country seed suggests.
    if (timezone) browser.timezone = timezone;
    if (locale) browser.locale = locale;
  }

  return browser;
}

// ========================================
// Friendly display helpers (names are display-only, storage stays ISO)
// ========================================

let regionDisplayNames: Intl.DisplayNames | null | undefined;

/** Friendly name for an ISO alpha-2 country code (e.g. IN -> "India"). */
export function getCountryDisplayName(code: unknown): string {
  const normalized = typeof code === "string" ? code.trim().toUpperCase() : "";
  if (!isSupportedCountry(normalized)) {
    return typeof code === "string" ? code : "";
  }

  if (regionDisplayNames === undefined) {
    try {
      regionDisplayNames = new Intl.DisplayNames(["en"], { type: "region" });
    } catch {
      regionDisplayNames = null;
    }
  }
  if (!regionDisplayNames) return normalized;

  try {
    return regionDisplayNames.of(normalized) ?? normalized;
  } catch {
    return normalized;
  }
}

let languageDisplayNames: Intl.DisplayNames | null | undefined;

/** Friendly name for a BCP 47 locale tag (e.g. en-IN -> "English (India)"). */
export function getLocaleDisplayName(tag: unknown): string {
  const normalized = normalizeUserLocale(tag);
  if (!normalized) return typeof tag === "string" ? tag : "";

  if (languageDisplayNames === undefined) {
    try {
      languageDisplayNames = new Intl.DisplayNames(["en"], { type: "language" });
    } catch {
      languageDisplayNames = null;
    }
  }
  if (!languageDisplayNames) return normalized;

  try {
    const name = languageDisplayNames.of(normalized);
    return name && name !== normalized ? `${name} (${normalized})` : normalized;
  } catch {
    return normalized;
  }
}

let currencyDisplayNames: Intl.DisplayNames | null | undefined;

/** Friendly name for an ISO 4217 currency code (e.g. INR -> "INR (Indian Rupee)"). */
export function getCurrencyDisplayName(code: unknown): string {
  const normalized =
    typeof code === "string" && /^[A-Za-z]{3}$/.test(code.trim())
      ? code.trim().toUpperCase()
      : "";
  if (!normalized) return typeof code === "string" ? code : "";

  if (currencyDisplayNames === undefined) {
    try {
      currencyDisplayNames = new Intl.DisplayNames(["en"], { type: "currency" });
    } catch {
      currencyDisplayNames = null;
    }
  }
  if (!currencyDisplayNames) return normalized;

  try {
    const name = currencyDisplayNames.of(normalized);
    return name && name !== normalized ? `${normalized} (${name})` : normalized;
  } catch {
    return normalized;
  }
}

/** Human-friendly timezone label (storage keeps the IANA identifier). */
export function getTimezoneDisplayName(timezone: unknown): string {
  const normalized = normalizeUserTimezone(timezone);
  if (!normalized) return typeof timezone === "string" ? timezone : "";
  return normalized.replace(/_/g, " ");
}

/**
 * Locale options for selectors: every country-registry locale plus a few
 * widely used extras. Validation still accepts any canonical BCP 47 tag.
 */
export const SUPPORTED_LOCALES: readonly string[] = Object.freeze(
  Array.from(
    new Set([
      ...Object.values(COUNTRY_DEFAULTS).map((defaults) => defaults.locale),
      "en",
      "hi-IN",
      "fr-CA",
      "es-419",
    ]),
  ).sort(),
);
