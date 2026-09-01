import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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

  const body = await request.json();

  const name = String(body.name ?? "").trim();
  const calories = Number(body.calories);
  const protein = Number(body.protein);
  const carbs = Number(body.carbs);
  const fat = Number(body.fat);

  if (!name) {
    return NextResponse.json(
      { error: "Meal name is required" },
      { status: 400 }
    );
  }

  if (
    !Number.isFinite(calories) ||
    !Number.isFinite(protein) ||
    !Number.isFinite(carbs) ||
    !Number.isFinite(fat)
  ) {
    return NextResponse.json(
      { error: "Nutrition values must be valid numbers" },
      { status: 400 }
    );
  }

  if (
    calories < 0 ||
    protein < 0 ||
    carbs < 0 ||
    fat < 0
  ) {
    return NextResponse.json(
      { error: "Nutrition values cannot be negative" },
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
