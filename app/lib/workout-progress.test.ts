import assert from "node:assert/strict";
import test from "node:test";

import {
  getWorkoutWeekIndex,
  getWorkoutWeekRange,
  isWorkoutForDate,
} from "@/app/lib/workout-progress";

test("resolves week indices on either side of a seven-day boundary", () => {
  assert.equal(getWorkoutWeekIndex("2026-10-12T09:30:00.000Z", "2026-10-12"), 0);
  assert.equal(getWorkoutWeekIndex("2026-10-12", "2026-10-18"), 0);
  assert.equal(getWorkoutWeekIndex("2026-10-12", "2026-10-19"), 1);
  assert.equal(getWorkoutWeekIndex("2026-10-12", "2026-10-26"), 2);
  assert.equal(getWorkoutWeekIndex("2026-10-12", "2026-10-11"), null);
  assert.equal(getWorkoutWeekIndex("not-a-date", "2026-10-12"), null);
});

test("calculates independent seven-day ranges for each selected week", () => {
  const firstWeek = getWorkoutWeekRange("2026-10-12", 0);
  const secondWeek = getWorkoutWeekRange("2026-10-12", 1);

  assert.equal(firstWeek?.start, "2026-10-12");
  assert.equal(firstWeek?.end, "2026-10-18");
  assert.equal(secondWeek?.start, "2026-10-19");
  assert.equal(secondWeek?.end, "2026-10-25");
});

test("does not reuse completion state from another calendar week", () => {
  assert.equal(isWorkoutForDate("2026-10-12", "2026-10-12"), true);
  assert.equal(isWorkoutForDate("2026-10-12", "2026-10-19"), false);
  assert.equal(isWorkoutForDate(undefined, "2026-10-12"), false);
});
