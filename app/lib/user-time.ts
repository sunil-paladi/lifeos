import {
  USER_DATE_FORMATS,
  USER_TIME_FORMATS,
} from "@/app/lib/regional-preferences";

export type UserDateTimePreferences = {
  timezone: string;
  locale: string;
  dateFormat: (typeof USER_DATE_FORMATS)[number];
  timeFormat: (typeof USER_TIME_FORMATS)[number];
};

export type UserLocalDateTime = {
  date: string;
  time: string;
};

export function resolveUserTimeZone(timezone: string): string {
  if (!timezone.trim()) {
    throw new RangeError("A user timezone is required");
  }

  return new Intl.DateTimeFormat("en", {
    timeZone: timezone,
  }).resolvedOptions().timeZone;
}

export function getUserLocalDateTime(
  date: Date,
  timezone: string,
): UserLocalDateTime {
  const parts = new Intl.DateTimeFormat("en-US-u-nu-latn", {
    timeZone: resolveUserTimeZone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const year = part("year");
  const month = part("month");
  const day = part("day");

  return {
    date: `${year}-${month}-${day}`,
    time: `${part("hour")}:${part("minute")}`,
  };
}

export function getUserLocalDate(date: Date, timezone: string): string {
  return getUserLocalDateTime(date, timezone).date;
}

export function formatUserDateTime(
  date: Date,
  preferences: UserDateTimePreferences,
): string {
  const local = getUserLocalDateTime(date, preferences.timezone);
  const [year, month, day] = local.date.split("-");
  const formattedDate =
    preferences.dateFormat === "MM/DD/YYYY"
      ? `${month}/${day}/${year}`
      : preferences.dateFormat === "YYYY-MM-DD"
        ? local.date
        : `${day}/${month}/${year}`;
  const formattedTime = new Intl.DateTimeFormat(preferences.locale, {
    timeZone: resolveUserTimeZone(preferences.timezone),
    hour: "numeric",
    minute: "2-digit",
    hourCycle: preferences.timeFormat === "12h" ? "h12" : "h23",
  }).format(date);

  return `${formattedDate} ${formattedTime}`;
}
