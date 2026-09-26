import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string | null) {
  if (!value) return null;

  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return null;
  }

  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function endOfDay(date: Date) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    23,
    59,
    59,
    999
  ));
}

function startOfDay(date: Date) {
  return new Date(Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    0,
    0,
    0,
    0
  ));
}

function resolveDateRange(searchParams: URLSearchParams) {
  const range = searchParams.get("range") ?? "30d";
  const paramFrom = parseDateOnly(searchParams.get("from"));
  const paramTo = parseDateOnly(searchParams.get("to"));

  const today = new Date();
  const todayStart = startOfDay(today);
  const todayEnd = endOfDay(today);

  if (paramFrom && paramTo) {
    return {
      from: startOfDay(paramFrom),
      to: endOfDay(paramTo),
      range,
      todayStart,
      todayEnd,
    };
  }

  let days = 30;

  if (range === "today") {
    days = 0;
  } else if (range === "7d") {
    days = 6;
  } else if (range === "30d") {
    days = 29;
  }

  const from = days === 0 ? todayStart : new Date(todayStart.getTime() - (days * DAY_MS));

  return {
    from,
    to: todayEnd,
    range,
    todayStart,
    todayEnd,
  };
}

function buildDailyTrend<T extends { date: Date; count: number }>(items: T[], start: Date, end: Date) {
  const bucketMap = new Map<string, number>();

  for (const item of items) {
    const key = new Date(item.date).toISOString().slice(0, 10);
    bucketMap.set(key, (bucketMap.get(key) ?? 0) + item.count);
  }

  const output: Array<{ date: string; count: number }> = [];
  const cursor = new Date(start);

  while (cursor <= end) {
    const key = cursor.toISOString().slice(0, 10);
    output.push({
      date: key,
      count: bucketMap.get(key) ?? 0,
    });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return output;
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
  const range = resolveDateRange(url.searchParams);

  if (range.from > range.to) {
    return NextResponse.json({ error: "Invalid date range" }, { status: 400 });
  }

  const [memberSummaryRaw, attendanceRecords, ptSessions, growthRecords] = await Promise.all([
    prisma.gymMembership.groupBy({
      by: ["role", "status"],
      where: { gymId },
      _count: { _all: true },
    }),
    prisma.gymAttendance.findMany({
      where: {
        gymId,
        checkedInAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        checkedInAt: true,
        checkedOutAt: true,
      },
      orderBy: { checkedInAt: "asc" },
    }),
    prisma.pTSession.groupBy({
      by: ["status"],
      where: {
        gymId,
        scheduledAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      _count: { _all: true },
    }),
    prisma.gymMembership.findMany({
      where: {
        gymId,
        role: "MEMBER",
        joinedAt: {
          gte: range.from,
          lte: range.to,
        },
      },
      select: {
        joinedAt: true,
      },
      orderBy: { joinedAt: "asc" },
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
    range.from,
    range.to
  ).map((entry) => ({
    date: entry.date,
    count: entry.count,
  }));

  const todayCheckIns = attendanceRecords.filter((record) => {
    if (!record.checkedInAt) return false;
    const day = startOfDay(record.checkedInAt);
    return day.getTime() === range.todayStart.getTime();
  }).length;

  const currentlyCheckedIn = await prisma.gymAttendance.count({
    where: {
      gymId,
      checkedOutAt: null,
    },
  });

  const completedVisits = attendanceRecords.filter((record) => record.checkedOutAt !== null && record.checkedOutAt >= range.todayStart && record.checkedOutAt <= range.todayEnd).length;

  const ptSessionSummary = {
    scheduled: ptSessions.find((session) => session.status === "SCHEDULED")?._count._all ?? 0,
    completed: ptSessions.find((session) => session.status === "COMPLETED")?._count._all ?? 0,
    cancelled: ptSessions.find((session) => session.status === "CANCELLED")?._count._all ?? 0,
    noShow: ptSessions.find((session) => session.status === "NO_SHOW")?._count._all ?? 0,
  };

  const memberGrowthTrend = buildDailyTrend(
    growthRecords.map((record) => ({ date: record.joinedAt, count: 1 })),
    range.from,
    range.to
  );

  return NextResponse.json({
    memberSummary,
    attendance: {
      todayCheckIns,
      currentlyCheckedIn,
      completedVisits,
      trend: attendanceTrend,
    },
    ptSessions: ptSessionSummary,
    memberGrowth: {
      newMembers: growthRecords.length,
      trend: memberGrowthTrend,
    },
    range: {
      from: range.from.toISOString(),
      to: range.to.toISOString(),
    },
  });
}
