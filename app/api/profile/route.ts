import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// ========================================
// GET PROFILE
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

  const user = await prisma.user.findUnique({
    where: {
      id: session.user.id,
    },
  });

  if (!user) {
    return NextResponse.json(
      { error: "User not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    user,
  });
}

// ========================================
// UPDATE PROFILE
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

  const user = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data: {
      name: body.name,
      phoneNumber: body.phoneNumber,
      age: body.age,
      height: body.height,
      weight: body.weight,
      fitnessGoal: body.fitnessGoal,

      // Personal fitness information
      activityLevel: body.activityLevel,
      trainingExperience: body.trainingExperience,
      targetWeight: body.targetWeight,
      preferredTrainingDays: body.preferredTrainingDays,
    },
  });

  return NextResponse.json({
    success: true,
    user,
  });
}