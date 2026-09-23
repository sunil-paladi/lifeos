import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

function startOfDay(date: Date) {
  const result = new Date(date);
  result.setHours(0, 0, 0, 0);
  return result;
}

function formatDate(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function roundPercentage(value: number) {
  return Math.round(value * 100) / 100;
}

function getMonday(date: Date) {
  const monday = startOfDay(date);
  const dayOfWeek = monday.getDay();
  const daysFromMonday = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  monday.setDate(monday.getDate() - daysFromMonday);

  return monday;
}

export async function GET(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const { habitId } = await context.params;

  try {
    const habit = await prisma.habit.findFirst({
      where: {
        id: habitId,
        userId: user!.id,
      },
      select: {
        id: true,
        name: true,
        frequency: true,
        target: true,
        createdAt: true,
      },
    });

    if (!habit) {
      return NextResponse.json(
        { error: "Habit not found" },
        { status: 404 }
      );
    }

    const completions = await prisma.habitCompletion.findMany({
      where: {
        habitId: habit.id,
      },
      select: {
        date: true,
        completed: true,
      },
    });

    const startDate = startOfDay(habit.createdAt);
    const endDate = startOfDay(new Date());
    const completedDateKeys = new Set(
      completions
        .filter((completion) => completion.completed)
        .map((completion) => formatDate(startOfDay(completion.date)))
    );
    const daily: { date: string; completed: boolean }[] = [];

    // Build the evaluated period one local calendar day at a time.
    for (
      const date = new Date(startDate);
      date <= endDate;
      date.setDate(date.getDate() + 1)
    ) {
      const dateKey = formatDate(date);
      daily.push({
        date: dateKey,
        completed: completedDateKeys.has(dateKey),
      });
    }

    let currentStreak = 0;
    for (let index = daily.length - 1; index >= 0; index -= 1) {
      if (!daily[index].completed) {
        break;
      }
      currentStreak += 1;
    }

    let longestStreak = 0;
    let streak = 0;
    for (const day of daily) {
      streak = day.completed ? streak + 1 : 0;
      longestStreak = Math.max(longestStreak, streak);
    }

    const expectedDays = daily.length;
    const completedDays = daily.filter((day) => day.completed).length;
    const missedDays = expectedDays - completedDays;
    const completionPercentage = expectedDays === 0
      ? 0
      : roundPercentage((completedDays / expectedDays) * 100);

    const weeklyMap = new Map<
      string,
      { completedDays: number; missedDays: number }
    >();
    const monthlyMap = new Map<
      string,
      { completedDays: number; missedDays: number }
    >();

    for (const day of daily) {
      const date = new Date(`${day.date}T00:00:00`);
      const weekKey = formatDate(getMonday(date));
      const monthKey = day.date.slice(0, 7);
      const week = weeklyMap.get(weekKey) ?? { completedDays: 0, missedDays: 0 };
      const month = monthlyMap.get(monthKey) ?? { completedDays: 0, missedDays: 0 };

      if (day.completed) {
        week.completedDays += 1;
        month.completedDays += 1;
      } else {
        week.missedDays += 1;
        month.missedDays += 1;
      }

      weeklyMap.set(weekKey, week);
      monthlyMap.set(monthKey, month);
    }

    const weekly = Array.from(weeklyMap, ([week, stats]) => ({
      week,
      ...stats,
      completionPercentage: roundPercentage(
        (stats.completedDays / (stats.completedDays + stats.missedDays)) * 100
      ),
    }));
    const monthly = Array.from(monthlyMap, ([month, stats]) => ({
      month,
      ...stats,
      completionPercentage: roundPercentage(
        (stats.completedDays / (stats.completedDays + stats.missedDays)) * 100
      ),
    }));

    return NextResponse.json({
      success: true,
      habit: {
        id: habit.id,
        name: habit.name,
        frequency: habit.frequency,
        target: habit.target,
      },
      summary: {
        currentStreak,
        longestStreak,
        completedDays,
        missedDays,
        completionPercentage,
      },
      daily,
      weekly,
      monthly,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load habit statistics" },
      { status: 500 }
    );
  }
}
