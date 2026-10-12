import type { CalendarDateRange } from "./types";

export function buildOwnerReportWhere(
  authorizedGymIds: readonly string[],
  range: CalendarDateRange,
) {
  const gymId = { in: [...authorizedGymIds] };
  const date = {
    gte: range.startAt,
    lt: range.endExclusiveAt,
  };

  return {
    memberships: { gymId, role: "MEMBER" as const },
    membershipPayments: {
      gymId,
      paymentType: "MEMBERSHIP" as const,
      status: "PAID" as const,
      paidAt: date,
      memberMembership: {
        is: { gymId, role: "MEMBER" as const },
      },
    },
    attendance: {
      gymId,
      checkedInAt: date,
      memberMembership: {
        is: { gymId, role: "MEMBER" as const },
      },
    },
    statusChanges: {
      gymId,
      changedAt: date,
      membership: {
        is: { gymId, role: "MEMBER" as const },
      },
    },
  };
}

export interface OwnerReportMembership {
  id: string;
  gymId: string;
  status: string;
  joinedAt: Date;
  statusHistory: {
    status: string;
    changedAt: Date;
  }[];
}

export interface OwnerReportPayment {
  gymId: string;
  amount: number | string;
  currency: string;
}

export interface OwnerReportAttendance {
  gymId: string;
  memberMembershipId: string;
}

export interface OwnerReportStatusChange {
  gymId: string;
  status: string;
  changedAt: Date;
}

function membershipStatusAt(
  membership: OwnerReportMembership,
  instant: Date,
): string | null {
  if (membership.joinedAt >= instant) return null;

  const changes = [...membership.statusHistory].sort(
    (left, right) => left.changedAt.getTime() - right.changedAt.getTime(),
  );
  const applicableChange = changes.findLast(
    (change) => change.changedAt < instant,
  );
  return applicableChange?.status ?? null;
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function summarizeOwnerGymReport(
  gymId: string,
  range: CalendarDateRange,
  memberships: readonly OwnerReportMembership[],
  payments: readonly OwnerReportPayment[],
  attendance: readonly OwnerReportAttendance[],
  statusChanges: readonly OwnerReportStatusChange[],
) {
  const gymMemberships = memberships.filter(
    (membership) => membership.gymId === gymId,
  );
  const currentActiveMembers = gymMemberships.filter(
    (membership) => membership.status === "ACTIVE",
  ).length;
  const currentNonActiveMembers = gymMemberships.filter(
    (membership) => membership.status !== "ACTIVE",
  ).length;
  const joinedInRange = gymMemberships.filter(
    (membership) =>
      membership.joinedAt >= range.startAt &&
      membership.joinedAt < range.endExclusiveAt,
  ).length;
  const changesInRange = statusChanges.filter(
    (change) =>
      change.gymId === gymId &&
      change.changedAt >= range.startAt &&
      change.changedAt < range.endExclusiveAt,
  );

  const startMembershipStatuses = gymMemberships.map((membership) => ({
    membership,
    status: membershipStatusAt(membership, range.startAt),
  }));
  const endMembershipStatuses = gymMemberships.map((membership) => ({
    membership,
    status: membershipStatusAt(membership, range.endExclusiveAt),
  }));
  const activeAtStart = startMembershipStatuses
    .filter(({ status }) => status === "ACTIVE")
    .map(({ membership }) => membership);
  const activeAtEnd = endMembershipStatuses
    .filter(({ status }) => status === "ACTIVE")
    .map(({ membership }) => membership);
  const activeAtEndIds = new Set(activeAtEnd.map(({ id }) => id));
  const retainedMembers = activeAtStart.filter(({ id }) =>
    activeAtEndIds.has(id),
  ).length;
  const statusHistoryIsComplete =
    startMembershipStatuses
      .filter(({ membership }) => membership.joinedAt < range.startAt)
      .every(({ status }) => status !== null) &&
    activeAtStart.every(({ id }) =>
      endMembershipStatuses.some(
        ({ membership, status }) => membership.id === id && status !== null,
      ),
    );

  const totalsByCurrency = new Map<string, number>();
  const gymPayments = payments.filter(({ gymId: paymentGymId }) => paymentGymId === gymId);
  for (const payment of gymPayments) {
    const amount = Number(payment.amount);
    if (!Number.isFinite(amount)) {
      throw new RangeError("Membership payment amount must be finite");
    }
    totalsByCurrency.set(
      payment.currency,
      roundCurrency((totalsByCurrency.get(payment.currency) ?? 0) + amount),
    );
  }

  const gymAttendance = attendance.filter(
    ({ gymId: attendanceGymId }) => attendanceGymId === gymId,
  );

  return {
    memberships: {
      currentTotal: gymMemberships.length,
      currentActive: currentActiveMembers,
      currentNonActive: currentNonActiveMembers,
      joinedInRange,
      statusChangesInRange: changesInRange.length,
    },
    membershipPayments: {
      paidCount: gymPayments.length,
      totalsByCurrency: [...totalsByCurrency]
        .map(([currency, amount]) => ({ currency, amount }))
        .sort((left, right) => left.currency.localeCompare(right.currency)),
    },
    attendance: {
      checkIns: gymAttendance.length,
      uniqueMembers: new Set(
        gymAttendance.map(({ memberMembershipId }) => memberMembershipId),
      ).size,
    },
    retention: {
      activeAtStart: activeAtStart.length,
      activeAtEnd: activeAtEnd.length,
      retainedMembers,
      rate:
        activeAtStart.length === 0 || !statusHistoryIsComplete
          ? null
          : Math.round((retainedMembers / activeAtStart.length) * 100),
    },
  };
}
