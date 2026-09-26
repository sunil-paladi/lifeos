import { prisma } from "@/lib/prisma";

export type AttendanceRole = "OWNER" | "TRAINER" | "MEMBER";

export async function getAttendanceMembershipOptions(
  userId: string,
  role: AttendanceRole,
) {
  const memberships = await prisma.gymMembership.findMany({
    where: { userId, role, status: "ACTIVE" },
    orderBy: { joinedAt: "desc" },
    select: {
      id: true,
      gymId: true,
      gym: { select: { name: true } },
    },
  });

  return memberships.map((membership) => ({
    membershipId: membership.id,
    gymId: membership.gymId,
    gymName: membership.gym.name,
  }));
}

export async function getActiveAttendanceMembership(
  userId: string,
  gymId: string,
) {
  return prisma.gymMembership.findFirst({
    where: {
      userId,
      gymId,
      status: "ACTIVE",
      role: { in: ["OWNER", "TRAINER", "MEMBER"] },
    },
    select: {
      id: true,
      gymId: true,
      role: true,
    },
  });
}

export function parseAttendanceDate(value: string | null, endOfDay = false) {
  if (value === null) return { date: null, invalid: false };

  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(value);
  const isoDateTime = /^\d{4}-\d{2}-\d{2}T/.test(value);
  if (!dateOnly && !isoDateTime) return { date: null, invalid: true };

  const [year, month, day] = value.slice(0, 10).split("-").map(Number);
  const calendarDate = new Date(0);
  calendarDate.setUTCHours(0, 0, 0, 0);
  calendarDate.setUTCFullYear(year, month - 1, day);
  if (
    calendarDate.getUTCFullYear() !== year ||
    calendarDate.getUTCMonth() !== month - 1 ||
    calendarDate.getUTCDate() !== day
  ) {
    return { date: null, invalid: true };
  }

  const date = new Date(
    dateOnly && endOfDay ? `${value}T23:59:59.999Z` : value,
  );

  return Number.isNaN(date.getTime())
    ? { date: null, invalid: true }
    : { date, invalid: false };
}

export const attendanceRecordSelect = {
  id: true,
  gymId: true,
  memberMembershipId: true,
  checkedInAt: true,
  checkedOutAt: true,
  createdAt: true,
  updatedAt: true,
  memberMembership: {
    select: {
      role: true,
      user: {
        select: {
          id: true,
          name: true,
        },
      },
    },
  },
} as const;