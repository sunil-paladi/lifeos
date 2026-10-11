import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMemberReportWhere,
  parseMemberReportRange,
  summarizeMemberReport,
} from "./member-report";

test("builds inclusive calendar date filters with an exclusive end", () => {
  const range = parseMemberReportRange(
    new URLSearchParams({
      from: "2024-03-10",
      to: "2024-03-10",
      timezone: "America/Los_Angeles",
    }),
  );
  const filters = buildMemberReportWhere("member-1", range);

  assert.equal(filters.workouts.userId, "member-1");
  assert.equal(filters.workouts.startedAt.gte.toISOString(), "2024-03-10T08:00:00.000Z");
  assert.equal(filters.workouts.startedAt.lt.toISOString(), "2024-03-11T07:00:00.000Z");
  assert.deepEqual(filters.nutritionDays.date, filters.workouts.startedAt);
});

test("rejects missing and invalid date filters", () => {
  assert.throws(
    () => parseMemberReportRange(new URLSearchParams()),
    /from, to, and timezone are required/,
  );
  assert.throws(
    () =>
      parseMemberReportRange(
        new URLSearchParams({
          from: "2024-02-30",
          to: "2024-03-01",
          timezone: "UTC",
        }),
      ),
    /valid YYYY-MM-DD/,
  );
  assert.throws(
    () =>
      parseMemberReportRange(
        new URLSearchParams({
          from: "2024-03-02",
          to: "2024-03-01",
          timezone: "UTC",
        }),
      ),
    /on or before/,
  );
});

test("keeps empty workout and fitness progress unavailable rather than inventing values", () => {
  assert.deepEqual(
    summarizeMemberReport([], [], "UTC"),
    {
      workoutCount: 0,
      workoutDays: 0,
      workoutMinutes: 0,
      workoutMetrics: {
        completedSets: 0,
        totalSets: 0,
        completionPercentage: null,
        weightedVolume: null,
        weightedSets: 0,
      },
      firstWeight: null,
      latestWeight: null,
      weightChange: null,
    },
  );
});

test("scopes every report data query to the authenticated member ID", () => {
  const range = parseMemberReportRange(
    new URLSearchParams({
      from: "2024-05-01",
      to: "2024-05-07",
      timezone: "UTC",
    }),
  );
  const filters = buildMemberReportWhere("authenticated-member", range);

  for (const filter of Object.values(filters)) {
    assert.equal(filter.userId, "authenticated-member");
  }
  assert.equal("userId" in filters.workouts, true);
});

test("summarizes only completed workouts and recorded weight change", () => {
  const summary = summarizeMemberReport(
    [
      {
        startedAt: new Date("2024-05-01T09:00:00.000Z"),
        status: "COMPLETED",
        durationSeconds: 1800,
        workoutSessionExercises: [
          {
            workoutSets: [
              { completed: true, weight: 40, reps: 8 },
              { completed: false, weight: 50, reps: 6 },
            ],
          },
        ],
      },
      {
        startedAt: new Date("2024-05-02T09:00:00.000Z"),
        status: "IN_PROGRESS",
        durationSeconds: 900,
        workoutSessionExercises: [],
      },
    ],
    [
      { weight: 80, recordedAt: new Date("2024-05-01T00:00:00.000Z") },
      { weight: 79, recordedAt: new Date("2024-05-07T00:00:00.000Z") },
    ],
    "UTC",
  );

  assert.equal(summary.workoutCount, 1);
  assert.equal(summary.workoutDays, 1);
  assert.equal(summary.workoutMinutes, 30);
  assert.equal(summary.workoutMetrics.weightedVolume, 320);
  assert.equal(summary.firstWeight, 80);
  assert.equal(summary.latestWeight, 79);
  assert.equal(summary.weightChange, -1);
});
