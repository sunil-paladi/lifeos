import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function isInRange(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

// ========================================
// GET TODAY'S NUTRITION
// ========================================

export async function GET() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const userId = session.user.id;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const day = await prisma.nutritionDay.findFirst({
    where: {
      userId,
      date: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
    include: {
      meals: {
        orderBy: {
          createdAt: "asc",
        },
      },
    },
  });

  return NextResponse.json({
    day: day ?? null,
    meals: day?.meals ?? [],
  });
}

// ========================================
// ADD MEAL TO TODAY
// ========================================

export async function POST(request: Request) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const body = await parseJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  const { calories, protein, carbs, fat } = body;

  if (!name || name.length > 120) {
    return NextResponse.json(
      { error: "Meal name is required" },
      { status: 400 }
    );
  }

  if (
    !isInRange(calories, 0, 20000) ||
    !isInRange(protein, 0, 2000) ||
    !isInRange(carbs, 0, 2000) ||
    !isInRange(fat, 0, 2000)
  ) {
    return NextResponse.json(
      { error: "Nutrition values must be valid numbers" },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const day = await prisma.nutritionDay.upsert({
    where: {
      userId_date: {
        userId,
        date: startOfDay,
      },
    },
    update: {},
    create: {
      userId,
      date: startOfDay,
    },
  });

  const meal = await prisma.nutritionMeal.create({
    data: {
      nutritionDayId: day.id,
      name,
      calories,
      protein,
      carbs,
      fat,
    },
  });

  return NextResponse.json(
    {
      success: true,
      meal,
    },
    { status: 201 }
  );
}
