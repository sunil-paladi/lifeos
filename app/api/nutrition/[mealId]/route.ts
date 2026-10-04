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
// PATCH — UPDATE MEAL
// ========================================

export async function PATCH(
  request: Request,
  context: {
    params: Promise<{ mealId: string }>;
  }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { mealId } = await context.params;

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

  // Find the meal and make sure it belongs
  // to the currently logged-in user.
  const meal = await prisma.nutritionMeal.findFirst({
    where: {
      id: mealId,
      nutritionDay: {
        userId: session.user.id,
      },
    },
  });

  if (!meal) {
    return NextResponse.json(
      { error: "Meal not found" },
      { status: 404 }
    );
  }

  const updatedMeal = await prisma.nutritionMeal.update({
    where: {
      id: mealId,
    },
    data: {
      name,
      calories,
      protein,
      carbs,
      fat,
    },
  });

  return NextResponse.json({
    success: true,
    meal: updatedMeal,
  });
}


// ========================================
// DELETE — DELETE MEAL
// ========================================

export async function DELETE(
  request: Request,
  context: {
    params: Promise<{ mealId: string }>;
  }
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  const { mealId } = await context.params;

  // Make sure this meal belongs to the
  // currently logged-in user.
  const meal = await prisma.nutritionMeal.findFirst({
    where: {
      id: mealId,
      nutritionDay: {
        userId: session.user.id,
      },
    },
  });

  if (!meal) {
    return NextResponse.json(
      { error: "Meal not found" },
      { status: 404 }
    );
  }

  await prisma.nutritionMeal.delete({
    where: {
      id: mealId,
    },
  });

  return NextResponse.json({
    success: true,
    message: "Meal deleted successfully",
  });
}
