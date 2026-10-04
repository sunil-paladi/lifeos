import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  try {
    const habits = await prisma.habit.findMany({
      where: {
        userId: user!.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({
      success: true,
      habits,
    });
  } catch {
    return NextResponse.json(
      { error: "Failed to load habits" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { user, response } = await getAuthenticatedUser();

  if (response) {
    return response;
  }

  const body = await parseJsonObject(request);
  if (!body) {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const { name, description, frequency, target, unit } = body;

  if (typeof name !== "string" || !name.trim() || name.trim().length > 100) {
    return NextResponse.json(
      { error: "Name must contain 1 to 100 characters" },
      { status: 400 }
    );
  }

  if (typeof frequency !== "string" || !frequency.trim() || frequency.trim().length > 50) {
    return NextResponse.json(
      { error: "Frequency must be a non-empty string" },
      { status: 400 }
    );
  }

  if (
    target !== undefined &&
    (typeof target !== "number" || !Number.isInteger(target) || target < 1 || target > 100000)
  ) {
    return NextResponse.json(
      { error: "Target must be an integer" },
      { status: 400 }
    );
  }

  const targetValue: number | undefined =
    typeof target === "number" ? target : undefined;

  if (description !== undefined && (typeof description !== "string" || description.length > 1000)) {
    return NextResponse.json(
      { error: "Description must be a string" },
      { status: 400 }
    );
  }

  if (unit !== undefined && (typeof unit !== "string" || unit.length > 40)) {
    return NextResponse.json(
      { error: "Unit must be a string" },
      { status: 400 }
    );
  }

  try {
    const habit = await prisma.habit.create({
      data: {
        userId: user!.id,
        name,
        description,
        frequency,
        target: targetValue,
        unit,
      },
    });

    return NextResponse.json(
      {
        success: true,
        habit,
      },
      { status: 201 }
    );
  } catch {
    return NextResponse.json(
      { error: "Failed to create habit" },
      { status: 500 }
    );
  }
}
