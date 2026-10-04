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
