import assert from "node:assert/strict";
import test from "node:test";
import {
  createCalendarDateRange,
  getCalendarDateInTimeZone,
  getPreviousCalendarDateRange,
  parseCalendarDate,
} from "./date-range";

test("validates strict inclusive calendar dates", () => {
  assert.equal(parseCalendarDate("2024-02-29"), "2024-02-29");
  assert.equal(parseCalendarDate("2023-02-29"), null);
  assert.equal(parseCalendarDate("2024-2-09"), null);

  assert.throws(
    () => createCalendarDateRange("2024-02-02", "2024-02-01", "UTC"),
    /on or before/,
  );
  assert.throws(
    () => createCalendarDateRange("2024-02-01", "2024-02-01", "Not/AZone"),
    /Invalid IANA timezone/,
  );
});

test("uses inclusive local dates and exclusive next-day boundary", () => {
  const range = createCalendarDateRange(
    "2024-03-10",
    "2024-03-10",
    "America/Los_Angeles",
  );

  assert.equal(range.dayCount, 1);
  assert.equal(getCalendarDateInTimeZone(range.startAt, range.timezone), range.from);
  assert.equal(
    getCalendarDateInTimeZone(range.endExclusiveAt, range.timezone),
    "2024-03-11",
  );
  assert.equal(
    range.endExclusiveAt.getTime() - range.startAt.getTime(),
    23 * 60 * 60 * 1000,
  );
});

test("supports timezone offsets that cross UTC date boundaries", () => {
  const range = createCalendarDateRange(
    "2024-01-01",
    "2024-01-01",
    "Asia/Kolkata",
  );

  assert.equal(range.startAt.toISOString(), "2023-12-31T18:30:00.000Z");
  assert.equal(getCalendarDateInTimeZone(range.startAt, range.timezone), range.from);
});

test("handles an end boundary after a timezone skips a calendar date", () => {
  const range = createCalendarDateRange(
    "2011-12-29",
    "2011-12-29",
    "Pacific/Apia",
  );

  assert.equal(range.startAt.toISOString(), "2011-12-29T10:00:00.000Z");
  assert.equal(range.endExclusiveAt.toISOString(), "2011-12-30T10:00:00.000Z");
});

test("builds an immediately preceding equal-length period", () => {
  const current = createCalendarDateRange(
    "2024-03-08",
    "2024-03-10",
    "America/Los_Angeles",
  );
  const previous = getPreviousCalendarDateRange(current);

  assert.equal(previous.from, "2024-03-05");
  assert.equal(previous.to, "2024-03-07");
  assert.equal(previous.dayCount, current.dayCount);
  assert.equal(previous.timezone, current.timezone);
});
