import type { CalendarDate, CalendarDateRange } from "./types";

const CALENDAR_DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const DAY_MILLISECONDS = 24 * 60 * 60 * 1000;

export function parseCalendarDate(value: string): CalendarDate | null {
  const match = CALENDAR_DATE_PATTERN.exec(value);
  if (!match) {
    return null;
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCHours(0, 0, 0, 0);
  date.setUTCFullYear(year, month - 1, day);

  return date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
    ? value
    : null;
}

export function assertTimeZone(timezone: string): string {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: timezone });
  } catch {
    throw new RangeError(`Invalid IANA timezone: ${timezone}`);
  }

  return timezone;
}

export function getCalendarDateInTimeZone(
  instant: Date,
  timezone: string,
): CalendarDate {
  if (!Number.isFinite(instant.getTime())) {
    throw new RangeError("Instant must be a valid date");
  }

  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: assertTimeZone(timezone),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return `${values.year.padStart(4, "0")}-${values.month}-${values.day}`;
}

function getTimeZoneParts(instant: Date, timezone: string) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  }).formatToParts(instant);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));

  return {
    year: Number(values.year),
    month: Number(values.month),
    day: Number(values.day),
    hour: Number(values.hour),
    minute: Number(values.minute),
    second: Number(values.second),
  };
}

function getStartOfDay(date: CalendarDate, timezone: string): Date | null {
  const [year, month, day] = date.split("-").map(Number);
  const desiredUtc = Date.UTC(year, month - 1, day);
  let candidate = desiredUtc;

  for (let attempt = 0; attempt < 4; attempt += 1) {
    const local = getTimeZoneParts(new Date(candidate), timezone);
    const representedUtc = Date.UTC(
      local.year,
      local.month - 1,
      local.day,
      local.hour,
      local.minute,
      local.second,
    );
    const adjustment = desiredUtc - representedUtc;

    if (adjustment === 0) {
      break;
    }

    candidate += adjustment;
  }

  const start = new Date(candidate);
  return getCalendarDateInTimeZone(start, timezone) === date ? start : null;
}

function getRequiredStartOfDay(date: CalendarDate, timezone: string): Date {
  const start = getStartOfDay(date, timezone);
  if (!start) {
    throw new RangeError(
      `Calendar date ${date} has no representable start in timezone ${timezone}`,
    );
  }
  return start;
}

function getExclusiveEnd(date: CalendarDate, timezone: string): Date {
  let boundaryDate = addCalendarDays(date, 1);
  for (let skippedDays = 0; skippedDays < 3; skippedDays += 1) {
    const start = getStartOfDay(boundaryDate, timezone);
    if (start) {
      return start;
    }
    boundaryDate = addCalendarDays(boundaryDate, 1);
  }

  throw new RangeError(
    `No representable calendar boundary follows ${date} in timezone ${timezone}`,
  );
}

export function addCalendarDays(date: CalendarDate, days: number): CalendarDate {
  if (!parseCalendarDate(date) || !Number.isInteger(days)) {
    throw new RangeError("A valid calendar date and integer day offset are required");
  }

  const [year, month, day] = date.split("-").map(Number);
  const shifted = new Date(0);
  shifted.setUTCHours(0, 0, 0, 0);
  shifted.setUTCFullYear(year, month - 1, day + days);

  return shifted.toISOString().slice(0, 10);
}

export function createCalendarDateRange(
  from: string,
  to: string,
  timezone: string,
): CalendarDateRange {
  const validFrom = parseCalendarDate(from);
  const validTo = parseCalendarDate(to);

  if (!validFrom || !validTo) {
    throw new RangeError("from and to must be valid YYYY-MM-DD calendar dates");
  }
  if (validFrom > validTo) {
    throw new RangeError("from must be on or before to");
  }

  const validTimezone = assertTimeZone(timezone);
  const startAt = getRequiredStartOfDay(validFrom, validTimezone);
  const endExclusiveAt = getExclusiveEnd(validTo, validTimezone);
  const firstUtc = new Date(`${validFrom}T00:00:00.000Z`).getTime();
  const lastUtc = new Date(`${validTo}T00:00:00.000Z`).getTime();

  return {
    from: validFrom,
    to: validTo,
    timezone: validTimezone,
    startAt,
    endExclusiveAt,
    dayCount: Math.floor((lastUtc - firstUtc) / DAY_MILLISECONDS) + 1,
  };
}

export function getCurrentCalendarDate(timezone: string): CalendarDate {
  return getCalendarDateInTimeZone(new Date(), assertTimeZone(timezone));
}

export function getPreviousCalendarDateRange(
  range: Pick<CalendarDateRange, "from" | "dayCount" | "timezone">,
): CalendarDateRange {
  const previousTo = addCalendarDays(range.from, -1);
  const previousFrom = addCalendarDays(previousTo, -(range.dayCount - 1));

  return createCalendarDateRange(previousFrom, previousTo, range.timezone);
}

export function getCalendarDates(
  range: Pick<CalendarDateRange, "from" | "dayCount">,
): CalendarDate[] {
  const [year, month, day] = range.from.split("-").map(Number);

  return Array.from({ length: range.dayCount }, (_, index) => {
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day + index);
    return date.toISOString().slice(0, 10);
  });
}
