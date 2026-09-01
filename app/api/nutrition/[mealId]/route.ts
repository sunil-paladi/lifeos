import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

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
