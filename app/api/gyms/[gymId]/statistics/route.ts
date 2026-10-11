import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import {
  addCalendarDays,
  createCalendarDateRange,
  getCalendarDateInTimeZone,
  getCalendarDates,
  getCurrentCalendarDate,
} from "@/app/lib/reports";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
};

function resolveDateRange(searchParams: URLSearchParams, timezone: string) {
  const range = searchParams.get("range") ?? "30d";
  const paramFrom = searchParams.get("from");
  const paramTo = searchParams.get("to");
  const today = getCurrentCalendarDate(timezone);
  const todayRange = createCalendarDateRange(today, today, timezone);

  if (paramFrom !== null || paramTo !== null) {
    if (paramFrom === null || paramTo === null) {
      throw new RangeError("Both from and to are required for a custom date range");
    }

    return {
      ...createCalendarDateRange(paramFrom, paramTo, timezone),
      range: "custom",
      todayRange,
    };
  }

  const daysBackByRange: Record<string, number> = {
    today: 0,
    "7d": 6,
    "30d": 29,
  };
  const daysBack = daysBackByRange[range];
  if (daysBack === undefined) {
    throw new RangeError("range must be today, 7d, or 30d");
  }

  return {
    ...createCalendarDateRange(addCalendarDays(today, -daysBack), today, timezone),
    range,
    todayRange,
  };
}

function buildDailyTrend<T extends { date: Date; count: number }>(
  items: T[],
  range: ReturnType<typeof createCalendarDateRange>,
) {
  const bucketMap = new Map<string, number>();

  for (const item of items) {
    const key = getCalendarDateInTimeZone(item.date, range.timezone);
    bucketMap.set(key, (bucketMap.get(key) ?? 0) + item.count);
  }

  return getCalendarDates(range).map((date) => ({
    date,
    count: bucketMap.get(date) ?? 0,
  }));
}

export async function GET(request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId } = await context.params;

  const ownerMembership = await prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (!ownerMembership) {
    return NextResponse.json(
      { error: "You are not an active owner of this gym" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  let timezone = "Asia/Kolkata";
  try {
    const settings = await prisma.gymSettings.findUnique({
      where: { gymId },
      select: { timezone: true },
    });
    timezone = settings?.timezone ?? timezone;
  } catch (error) {
    console.error("Failed to load gym timezone for statistics", error);
    return NextResponse.json({ error: "Unable to load gym reporting timezone" }, { status: 500 });
  }

  let range: ReturnType<typeof resolveDateRange>;
  try {
    range = resolveDateRange(url.searchParams, timezone);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Invalid date range" },
      { status: 400 },
    );
  }

  const [
    memberSummaryRaw,
    attendanceRecords,
    todayAttendanceRecords,
    ptSessions,
    growthRecords,
    trainers,
    members,
    trainerSessionGroups,
    checkedInRecords,
  ] = await Promise.all([
    prisma.gymMembership.groupBy({
      by: ["role", "status"],
      where: { gymId },
      _count: { _all: true },
    }),
    prisma.gymAttendance.findMany({
      where: {
        gymId,
        checkedInAt: {
          gte: range.startAt,
          lt: range.endExclusiveAt,
        },
      },
      select: {
        checkedInAt: true,
        checkedOutAt: true,
      },
      orderBy: { checkedInAt: "asc" },
    }),
    prisma.gymAttendance.findMany({
      where: {
        gymId,
        checkedInAt: {
          gte: range.todayRange.startAt,
          lt: range.todayRange.endExclusiveAt,
        },
        memberMembership: { gymId, role: "MEMBER" },
      },
      select: { checkedOutAt: true },
    }),
    prisma.pTSession.groupBy({
      by: ["status"],
      where: {
        gymId,
        scheduledAt: {
          gte: range.startAt,
          lt: range.endExclusiveAt,
        },
      },
      _count: { _all: true },
    }),
    prisma.gymMembership.findMany({
      where: {
        gymId,
        role: "MEMBER",
        joinedAt: {
          gte: range.startAt,
          lt: range.endExclusiveAt,
        },
      },
      select: {
        joinedAt: true,
      },
      orderBy: { joinedAt: "asc" },
    }),
    prisma.gymMembership.findMany({
      where: { gymId, role: "TRAINER" },
      select: {
        id: true,
        status: true,
        user: { select: { name: true } },
        trainerAssignments: {
          where: {
            gymId,
            clientMembership: { gymId, role: "MEMBER" },
          },
          select: {
            clientMembership: {
              select: {
                id: true,
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { assignedAt: "asc" },
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.gymMembership.findMany({
      where: { gymId, role: "MEMBER" },
      select: {
        id: true,
        status: true,
        user: { select: { name: true } },
        clientAssignments: {
          where: {
            gymId,
            trainerMembership: { gymId, role: "TRAINER" },
          },
          select: {
            trainerMembership: {
              select: {
                user: { select: { name: true } },
              },
            },
          },
          orderBy: { assignedAt: "desc" },
          take: 1,
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    prisma.pTSession.groupBy({
      by: ["trainerMembershipId", "clientMembershipId", "status"],
      where: {
        gymId,
        scheduledAt: { gte: range.startAt, lt: range.endExclusiveAt },
        trainerMembership: { gymId, role: "TRAINER" },
        clientMembership: { gymId, role: "MEMBER" },
      },
      _count: { _all: true },
      _sum: { durationMinutes: true },
    }),
    prisma.gymAttendance.findMany({
      where: {
        gymId,
        checkedOutAt: null,
        memberMembership: { gymId, role: "MEMBER" },
      },
      select: {
        checkedInAt: true,
        memberMembership: { select: { user: { select: { name: true } } } },
      },
      orderBy: { checkedInAt: "asc" },
    }),
  ]);

  const memberSummary = {
    total: memberSummaryRaw.filter((item) => item.role === "MEMBER").reduce((sum, item) => sum + item._count._all, 0),
    active: memberSummaryRaw.filter((item) => item.role === "MEMBER" && item.status === "ACTIVE").reduce((sum, item) => sum + item._count._all, 0),
    inactive: memberSummaryRaw.filter((item) => item.role === "MEMBER" && item.status !== "ACTIVE").reduce((sum, item) => sum + item._count._all, 0),
    trainers: memberSummaryRaw.filter((item) => item.role === "TRAINER").reduce((sum, item) => sum + item._count._all, 0),
    activeTrainers: memberSummaryRaw.filter((item) => item.role === "TRAINER" && item.status === "ACTIVE").reduce((sum, item) => sum + item._count._all, 0),
  };

  const attendanceTrend = buildDailyTrend(
    attendanceRecords
      .filter((record) => record.checkedInAt)
      .map((record) => ({ date: record.checkedInAt, count: 1 })),
    range
  ).map((entry) => ({
    date: entry.date,
    count: entry.count,
  }));

  const todayCheckIns = todayAttendanceRecords.length;

  const currentlyCheckedIn = checkedInRecords.length;

  const completedVisits = todayAttendanceRecords.filter(
    (record) => record.checkedOutAt !== null,
  ).length;

  const ptSessionSummary = {
    scheduled: ptSessions.find((session) => session.status === "SCHEDULED")?._count._all ?? 0,
    completed: ptSessions.find((session) => session.status === "COMPLETED")?._count._all ?? 0,
    cancelled: ptSessions.find((session) => session.status === "CANCELLED")?._count._all ?? 0,
    noShow: ptSessions.find((session) => session.status === "NO_SHOW")?._count._all ?? 0,
  };

  const memberGrowthTrend = buildDailyTrend(
    growthRecords.map((record) => ({ date: record.joinedAt, count: 1 })),
    range
  );

  const clientNames = new Map(members.map((member) => [member.id, member.user.name]));
  const trainerReports = new Map(trainers.map((trainer) => [trainer.id, {
    scheduled: 0,
    completed: 0,
    cancelled: 0,
    noShow: 0,
    completedMinutes: 0,
    completedClientIds: new Set<string>(),
    clients: new Map<string, number>(),
  }]));

  for (const sessionGroup of trainerSessionGroups) {
    const report = trainerReports.get(sessionGroup.trainerMembershipId);
    if (!report) continue;

    if (sessionGroup.status === "SCHEDULED") report.scheduled += sessionGroup._count._all;
    if (sessionGroup.status === "COMPLETED") {
      report.completed += sessionGroup._count._all;
      report.completedMinutes += sessionGroup._sum.durationMinutes ?? 0;
      report.completedClientIds.add(sessionGroup.clientMembershipId);
    }
    if (sessionGroup.status === "CANCELLED") report.cancelled += sessionGroup._count._all;
    if (sessionGroup.status === "NO_SHOW") report.noShow += sessionGroup._count._all;

    report.clients.set(
      sessionGroup.clientMembershipId,
      (report.clients.get(sessionGroup.clientMembershipId) ?? 0) + sessionGroup._count._all
    );
  }

  const trainerOverview = trainers.map((trainer) => {
    const report = trainerReports.get(trainer.id)!;
    return {
      id: trainer.id,
      name: trainer.user.name,
      status: trainer.status,
      clients: trainer.trainerAssignments.map((assignment) => ({
        id: assignment.clientMembership.id,
        name: assignment.clientMembership.user.name,
      })),
      report: {
        scheduled: report.scheduled,
        completed: report.completed,
        cancelled: report.cancelled,
        noShow: report.noShow,
        completedMinutes: report.completedMinutes,
        clientsTrained: report.completedClientIds.size,
        clients: [...report.clients.entries()]
          .map(([clientId, sessions]) => ({
            id: clientId,
            name: clientNames.get(clientId) ?? "Member",
            sessions,
          }))
          .sort((first, second) => first.name.localeCompare(second.name)),
      },
    };
  });

  const memberOverview = members.slice(0, 8).map((member) => ({
    id: member.id,
    name: member.user.name,
    status: member.status,
    trainerName: member.clientAssignments[0]?.trainerMembership.user.name ?? null,
  }));

  return NextResponse.json({
    memberSummary,
    attendance: {
      todayCheckIns,
      currentlyCheckedIn,
      checkedInMembers: checkedInRecords.map((record) => ({
        name: record.memberMembership.user.name,
        checkedInAt: record.checkedInAt.toISOString(),
      })),
      completedVisits,
      trend: attendanceTrend,
    },
    ptSessions: ptSessionSummary,
    trainers: trainerOverview,
    members: memberOverview,
    memberOverviewTotal: memberSummary.total,
    memberGrowth: {
      newMembers: growthRecords.length,
      trend: memberGrowthTrend,
    },
    range: {
      from: range.from,
      to: range.to,
      timezone,
    },
  });
}
