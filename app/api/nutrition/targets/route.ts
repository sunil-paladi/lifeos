import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonObject } from "@/app/lib/input-validation";
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

  const body = await parseJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  const { calories, protein, carbs, fat } = body;

  if (
    typeof calories !== "number" || !Number.isFinite(calories) || calories <= 0 || calories > 20000 ||
    typeof protein !== "number" || !Number.isFinite(protein) || protein <= 0 || protein > 2000 ||
    typeof carbs !== "number" || !Number.isFinite(carbs) || carbs <= 0 || carbs > 2000 ||
    typeof fat !== "number" || !Number.isFinite(fat) || fat <= 0 || fat > 2000
  ) {
    return NextResponse.json(
      { error: "Nutrition targets must be positive numbers within supported ranges" },
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
