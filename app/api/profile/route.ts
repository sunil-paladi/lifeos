import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonObject } from "@/app/lib/input-validation";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const FITNESS_GOALS = ["LOSE_WEIGHT", "BUILD_MUSCLE", "MAINTAIN_WEIGHT", "IMPROVE_FITNESS"] as const;
const ACTIVITY_LEVELS = ["SEDENTARY", "LIGHT", "MODERATE", "VERY_ACTIVE"] as const;
const TRAINING_EXPERIENCES = ["BEGINNER", "INTERMEDIATE", "ADVANCED"] as const;

function isOneOf<T extends readonly string[]>(value: unknown, options: T): value is T[number] {
  return typeof value === "string" && options.some((option) => option === value);
}

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

  const body = await parseJsonObject(request);
  if (!body) {
    return NextResponse.json({ error: "Request body must be a valid JSON object" }, { status: 400 });
  }

  if (Object.hasOwn(body, "role")) {
    return NextResponse.json(
      { error: "Account role cannot be changed through profile updates" },
      { status: 403 }
    );
  }

  const data: {
    name?: string;
    phoneNumber?: string | null;
    age?: number | null;
    height?: number | null;
    weight?: number | null;
    fitnessGoal?: typeof FITNESS_GOALS[number] | null;
    activityLevel?: typeof ACTIVITY_LEVELS[number] | null;
    trainingExperience?: typeof TRAINING_EXPERIENCES[number] | null;
    targetWeight?: number | null;
    preferredTrainingDays?: number | null;
  } = {};

  if (body.name !== undefined) {
    if (typeof body.name !== "string" || !body.name.trim() || body.name.trim().length > 100) {
      return NextResponse.json({ error: "name must contain 1 to 100 characters" }, { status: 400 });
    }
    data.name = body.name.trim();
  }
  if (body.phoneNumber !== undefined) {
    if (body.phoneNumber !== null && (
      typeof body.phoneNumber !== "string" ||
      (body.phoneNumber.trim() !== "" && !/^\+?[0-9 ()-]{7,20}$/.test(body.phoneNumber.trim()))
    )) {
      return NextResponse.json({ error: "phoneNumber must be a valid phone number or null" }, { status: 400 });
    }
    data.phoneNumber = typeof body.phoneNumber === "string" ? body.phoneNumber.trim() || null : null;
  }
  if (body.age !== undefined) {
    if (body.age !== null && (typeof body.age !== "number" || !Number.isInteger(body.age) || body.age < 13 || body.age > 120)) {
      return NextResponse.json({ error: "age must be an integer from 13 to 120 or null" }, { status: 400 });
    }
    data.age = body.age === null ? null : body.age;
  }
  for (const field of ["height", "weight", "targetWeight"] as const) {
    const value = body[field];
    if (value !== undefined) {
      if (value !== null && (typeof value !== "number" || !Number.isFinite(value) ||
          (field === "height" ? value < 30 || value > 300 : value <= 0 || value > 1000))) {
        return NextResponse.json({ error: `${field} is outside the supported range` }, { status: 400 });
      }
      data[field] = typeof value === "number" ? value : null;
    }
  }
  if (body.preferredTrainingDays !== undefined) {
    if (body.preferredTrainingDays !== null &&
        (typeof body.preferredTrainingDays !== "number" || !Number.isInteger(body.preferredTrainingDays) || body.preferredTrainingDays < 1 || body.preferredTrainingDays > 7)) {
      return NextResponse.json({ error: "preferredTrainingDays must be an integer from 1 to 7 or null" }, { status: 400 });
    }
    data.preferredTrainingDays = body.preferredTrainingDays === null ? null : body.preferredTrainingDays;
  }
  if (body.fitnessGoal !== undefined) {
    if (body.fitnessGoal !== null && !isOneOf(body.fitnessGoal, FITNESS_GOALS)) {
      return NextResponse.json({ error: "fitnessGoal is not valid" }, { status: 400 });
    }
    data.fitnessGoal = body.fitnessGoal === null ? null : body.fitnessGoal;
  }
  if (body.activityLevel !== undefined) {
    if (body.activityLevel !== null && !isOneOf(body.activityLevel, ACTIVITY_LEVELS)) {
      return NextResponse.json({ error: "activityLevel is not valid" }, { status: 400 });
    }
    data.activityLevel = body.activityLevel === null ? null : body.activityLevel;
  }
  if (body.trainingExperience !== undefined) {
    if (body.trainingExperience !== null && !isOneOf(body.trainingExperience, TRAINING_EXPERIENCES)) {
      return NextResponse.json({ error: "trainingExperience is not valid" }, { status: 400 });
    }
    data.trainingExperience = body.trainingExperience === null ? null : body.trainingExperience;
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "At least one profile field is required" }, { status: 400 });
  }

  const user = await prisma.user.update({
    where: {
      id: session.user.id,
    },
    data,
  });

  return NextResponse.json({
    success: true,
    user,
  });
}