import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
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

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Request body must be valid JSON" },
      { status: 400 }
    );
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json(
      { error: "Request body must be a JSON object" },
      { status: 400 }
    );
  }

  const { name, description, frequency, target, unit } = body as Record<
    string,
    unknown
  >;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json(
      { error: "Name must be a non-empty string" },
      { status: 400 }
    );
  }

  if (typeof frequency !== "string" || !frequency.trim()) {
    return NextResponse.json(
      { error: "Frequency must be a non-empty string" },
      { status: 400 }
    );
  }

  if (
    target !== undefined &&
    (typeof target !== "number" || !Number.isInteger(target))
  ) {
    return NextResponse.json(
      { error: "Target must be an integer" },
      { status: 400 }
    );
  }

  const targetValue: number | undefined =
    typeof target === "number" ? target : undefined;

  if (description !== undefined && typeof description !== "string") {
    return NextResponse.json(
      { error: "Description must be a string" },
      { status: 400 }
    );
  }

  if (unit !== undefined && typeof unit !== "string") {
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
