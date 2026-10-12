import assert from "node:assert/strict";
import test from "node:test";
import { createCalendarDateRange } from "./date-range";
import {
  buildOwnerReportWhere,
  summarizeOwnerGymReport,
  type OwnerReportMembership,
} from "./owner-report";

const range = createCalendarDateRange(
  "2024-05-01",
  "2024-05-07",
  "America/Los_Angeles",
);

test("filters all owner report queries by authorized gyms and selected range", () => {
  const filters = buildOwnerReportWhere(["owned-gym-1", "owned-gym-2"], range);

  for (const filter of Object.values(filters)) {
    assert.deepEqual(filter.gymId, { in: ["owned-gym-1", "owned-gym-2"] });
  }
  assert.deepEqual(filters.membershipPayments.paidAt, {
    gte: range.startAt,
    lt: range.endExclusiveAt,
  });
  assert.deepEqual(filters.attendance.checkedInAt, {
    gte: range.startAt,
    lt: range.endExclusiveAt,
  });
  assert.deepEqual(filters.attendance.memberMembership.is, {
    gymId: { in: ["owned-gym-1", "owned-gym-2"] },
    role: "MEMBER",
  });
  assert.deepEqual(filters.membershipPayments.memberMembership.is.role, "MEMBER");
  assert.deepEqual(filters.statusChanges.membership.is.role, "MEMBER");
  assert.deepEqual(filters.membershipsJoinedInRange.joinedAt, {
    gte: range.startAt,
    lt: range.endExclusiveAt,
  });
  assert.deepEqual(filters.statusChanges.changedAt, {
    gte: range.startAt,
    lt: range.endExclusiveAt,
  });
  assert.deepEqual(
    buildOwnerReportWhere([], range).memberships.gymId,
    { in: [] },
  );
});

test("reports empty persisted results without inventing payments, attendance, or retention", () => {
  assert.deepEqual(
    summarizeOwnerGymReport("owned-gym", range, [], [], [], []),
    {
      memberships: {
        currentTotal: 0,
        currentActive: 0,
        currentNonActive: 0,
        joinedInRange: 0,
        statusChangesInRange: 0,
      },
      membershipPayments: { paidCount: 0, totalsByCurrency: [] },
      attendance: { checkIns: 0, uniqueMembers: 0 },
      retention: {
        activeAtStart: 0,
        activeAtEnd: 0,
        retainedMembers: 0,
        rate: null,
      },
    },
  );
});

test("isolates every owner report metric to the authorized gym being summarized", () => {
  const memberships: OwnerReportMembership[] = [
    {
      id: "member-owned",
      gymId: "owned-gym",
      status: "ACTIVE",
      joinedAt: new Date("2024-04-01T00:00:00.000Z"),
      statusHistory: [
        { status: "ACTIVE", changedAt: new Date("2024-04-01T00:00:00.000Z") },
      ],
    },
    {
      id: "member-other",
      gymId: "other-gym",
      status: "ACTIVE",
      joinedAt: new Date("2024-04-01T00:00:00.000Z"),
      statusHistory: [
        { status: "ACTIVE", changedAt: new Date("2024-04-01T00:00:00.000Z") },
      ],
    },
  ];
  const report = summarizeOwnerGymReport(
    "owned-gym",
    range,
    memberships,
    [
      { gymId: "owned-gym", amount: "125.50", currency: "USD" },
      { gymId: "other-gym", amount: "999.99", currency: "USD" },
    ],
    [
      { gymId: "owned-gym", memberMembershipId: "member-owned" },
      { gymId: "other-gym", memberMembershipId: "member-other" },
    ],
    [
      {
        gymId: "owned-gym",
        status: "ACTIVE",
        changedAt: new Date("2024-05-02T12:00:00.000Z"),
      },
      {
        gymId: "other-gym",
        status: "INACTIVE",
        changedAt: new Date("2024-05-02T12:00:00.000Z"),
      },
    ],
  );

  assert.equal(report.memberships.currentTotal, 1);
  assert.equal(report.memberships.currentActive, 1);
  assert.equal(report.membershipPayments.paidCount, 1);
  assert.deepEqual(report.membershipPayments.totalsByCurrency, [
    { currency: "USD", amount: 125.5 },
  ]);
  assert.deepEqual(report.attendance, { checkIns: 1, uniqueMembers: 1 });
  assert.equal(report.retention.retainedMembers, 1);
});

test("calculates period retention from membership status history", () => {
  const memberships: OwnerReportMembership[] = [
    {
      id: "retained",
      gymId: "owned-gym",
      status: "ACTIVE",
      joinedAt: new Date("2024-04-01T00:00:00.000Z"),
      statusHistory: [
        { status: "ACTIVE", changedAt: new Date("2024-04-01T00:00:00.000Z") },
      ],
    },
    {
      id: "left",
      gymId: "owned-gym",
      status: "INACTIVE",
      joinedAt: new Date("2024-04-02T00:00:00.000Z"),
      statusHistory: [
        { status: "ACTIVE", changedAt: new Date("2024-04-02T00:00:00.000Z") },
        { status: "INACTIVE", changedAt: new Date("2024-05-04T00:00:00.000Z") },
      ],
    },
    {
      id: "joined-during-range",
      gymId: "owned-gym",
      status: "ACTIVE",
      joinedAt: new Date("2024-05-03T00:00:00.000Z"),
      statusHistory: [
        { status: "ACTIVE", changedAt: new Date("2024-05-03T00:00:00.000Z") },
      ],
    },
  ];

  const report = summarizeOwnerGymReport("owned-gym", range, memberships, [], [], []);
  assert.equal(report.memberships.joinedInRange, 1);
  assert.equal(report.retention.activeAtStart, 2);
  assert.equal(report.retention.activeAtEnd, 2);
  assert.equal(report.retention.retainedMembers, 1);
  assert.equal(report.retention.rate, 50);
});

test("leaves retention unavailable when prior membership status is not recorded", () => {
  const report = summarizeOwnerGymReport(
    "owned-gym",
    range,
    [
      {
        id: "member-without-history",
        gymId: "owned-gym",
        status: "ACTIVE",
        joinedAt: new Date("2024-04-01T00:00:00.000Z"),
        statusHistory: [],
      },
    ],
    [],
    [],
    [],
  );

  assert.equal(report.retention.activeAtStart, 0);
  assert.equal(report.retention.rate, null);
});
