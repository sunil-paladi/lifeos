import assert from "node:assert/strict";
import test from "node:test";
import {
  buildMemberReportWhere,
  buildTrainerReportWhere,
  getTrainerAssignedClients,
  parseMemberReportRange,
  selectTrainerReportClient,
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

test("passes custom member date ranges through every persisted report filter", () => {
  const range = parseMemberReportRange(
    new URLSearchParams({
      from: "2024-04-03",
      to: "2024-04-17",
      timezone: "America/Los_Angeles",
    }),
  );
  const filters = buildMemberReportWhere("authenticated-member", range);

  assert.equal(range.from, "2024-04-03");
  assert.equal(range.to, "2024-04-17");
  for (const filter of Object.values(filters)) {
    assert.equal(filter.userId, "authenticated-member");
  }
  for (const dateFilter of [
    filters.workouts.startedAt,
    filters.nutritionDays.date,
    filters.weightEntries.recordedAt,
    filters.bodyMeasurements.recordedAt,
  ]) {
    assert.deepEqual(dateFilter, {
      gte: range.startAt,
      lt: range.endExclusiveAt,
    });
  }
});

test("filters trainer report data to the authenticated trainer's assigned client IDs", () => {
  const range = parseMemberReportRange(new URLSearchParams({
    from: "2024-05-01",
    to: "2024-05-07",
    timezone: "UTC",
  }));
  const clientUserIds = ["client-1", "client-2"];
  const filters = buildTrainerReportWhere(clientUserIds, range);

  for (const filter of Object.values(filters)) {
    assert.deepEqual(filter.userId, { in: clientUserIds });
  }
  for (const dateFilter of [
    filters.workouts.startedAt,
    filters.nutritionDays.date,
    filters.weightEntries.recordedAt,
    filters.bodyMeasurements.recordedAt,
  ]) {
    assert.deepEqual(dateFilter, {
      gte: range.startAt,
      lt: range.endExclusiveAt,
    });
  }
});

test("selects one assigned client's complete report without mixing other clients", () => {
  const clients = [
    {
      id: "client-1",
      workouts: [{ id: "workout-1" }],
      nutritionDays: [{ date: "2024-05-01" }],
      nutritionTarget: { calories: 1800 },
      weightEntries: [{ id: "weight-1" }],
      bodyMeasurements: [{ id: "measurement-1" }],
    },
    {
      id: "client-2",
      workouts: [{ id: "workout-2" }],
      nutritionDays: [{ date: "2024-05-02" }],
      nutritionTarget: { calories: 2200 },
      weightEntries: [{ id: "weight-2" }],
      bodyMeasurements: [{ id: "measurement-2" }],
    },
  ];

  assert.deepEqual(selectTrainerReportClient(clients, "client-2"), clients[1]);
  assert.equal(selectTrainerReportClient(clients, "unassigned-client"), null);
});

test("includes only active member assignments belonging to authenticated trainer memberships", () => {
  const assignments = [
    {
      trainerMembershipId: "trainer-membership-1",
      clientMembership: {
        userId: "assigned-client",
        role: "MEMBER",
        status: "ACTIVE",
        user: { name: "Assigned", username: "assigned" },
      },
    },
    {
      trainerMembershipId: "another-trainer",
      clientMembership: {
        userId: "other-client",
        role: "MEMBER",
        status: "ACTIVE",
        user: { name: "Other", username: "other" },
      },
    },
    {
      trainerMembershipId: "trainer-membership-1",
      clientMembership: {
        userId: "inactive-client",
        role: "MEMBER",
        status: "INACTIVE",
        user: { name: "Inactive", username: "inactive" },
      },
    },
  ];

  assert.deepEqual(
    getTrainerAssignedClients(["trainer-membership-1"], assignments),
    [{ id: "assigned-client", name: "Assigned", username: "assigned" }],
  );
  assert.deepEqual(getTrainerAssignedClients([], assignments), []);
});

test("returns empty assigned-client results without leaking data to unassigned trainers", () => {
  const range = parseMemberReportRange(new URLSearchParams({
    from: "2024-05-01",
    to: "2024-05-07",
    timezone: "UTC",
  }));
  const filters = buildTrainerReportWhere([], range);

  assert.deepEqual(getTrainerAssignedClients(["trainer-membership-1"], []), []);
  assert.deepEqual(filters.workouts.userId, { in: [] });
  assert.deepEqual(filters.nutritionTargets.userId, { in: [] });
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
