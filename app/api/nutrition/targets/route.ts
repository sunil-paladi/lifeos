import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// GET NUTRITION TARGETS
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

  const target = await prisma.nutritionTarget.findFirst({
    where: {
      userId: session.user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return NextResponse.json({
    target: target ?? null,
  });
}

// ========================================
// PATCH NUTRITION TARGETS
// ========================================

export async function PATCH(request: Request) {
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

  const calories = Number(body.calories);
  const protein = Number(body.protein);
  const carbs = Number(body.carbs);
  const fat = Number(body.fat);

  if (
    !Number.isFinite(calories) ||
    !Number.isFinite(protein) ||
    !Number.isFinite(carbs) ||
    !Number.isFinite(fat)
  ) {
    return NextResponse.json(
      { error: "Nutrition targets must be valid numbers" },
      { status: 400 }
    );
  }

  if (
    calories <= 0 ||
    protein <= 0 ||
    carbs <= 0 ||
    fat <= 0
  ) {
    return NextResponse.json(
      {
        error:
          "Nutrition targets must be greater than 0",
      },
      { status: 400 }
    );
  }

  const userId = session.user.id;

  const existingTarget =
    await prisma.nutritionTarget.findFirst({
      where: {
        userId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

  const target = existingTarget
    ? await prisma.nutritionTarget.update({
        where: {
          id: existingTarget.id,
        },
        data: {
          calories: Math.round(calories),
          protein,
          carbs,
          fat,
        },
      })
    : await prisma.nutritionTarget.create({
        data: {
          userId,
          calories: Math.round(calories),
          protein,
          carbs,
          fat,
        },
      });

  return NextResponse.json({
    success: true,
    target,
  });
}
