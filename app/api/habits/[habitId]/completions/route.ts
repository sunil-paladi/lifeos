import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  context: { params: Promise<{ habitId: string }> }
) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const { habitId } = await context.params;

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const input = body as Record<string, unknown>;
  const normalizedDate = new Date();

  if (input.date !== undefined) {
    if (typeof input.date !== "string") {
      return NextResponse.json(
        { error: "Date must be a valid date string" },
        { status: 400 }
      );
    }

    const parsedDate = new Date(input.date);

    if (Number.isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Date must be a valid date string" },
        { status: 400 }
      );
    }

    normalizedDate.setTime(parsedDate.getTime());
  }

  normalizedDate.setHours(0, 0, 0, 0);

  if (input.completed !== undefined && typeof input.completed !== "boolean") {
    return NextResponse.json(
      { error: "Completed must be a boolean" },
      { status: 400 }
    );
  }

  const completed = input.completed ?? true;

  try {
    const habit = await prisma.habit.findFirst({
      where: {
        id: habitId,
        userId: user!.id,
      },
    });

    if (!habit) {
      return NextResponse.json(
        { error: "Habit not found" },
        { status: 404 }
      );
    }

    const completion = await prisma.habitCompletion.upsert({
      where: {
        habitId_date: {
          habitId: habit.id,
          date: normalizedDate,
        },
      },
      create: {
        habitId: habit.id,
        date: normalizedDate,
        completed,
      },
      update: {
        completed,
      },
    });

    return NextResponse.json({
      success: true,
      completion,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to save habit completion" },
      { status: 500 }
    );
  }
}
