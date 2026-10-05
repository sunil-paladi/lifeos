import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { auth } from "@/app/lib/auth";
import { parseJsonObject } from "@/app/lib/input-validation";
import {
  isSupportedCountry,
  isSupportedCurrency,
  normalizeUserLocale,
  normalizeUserTimezone,
  USER_DATE_FORMATS,
  USER_DISTANCE_UNITS,
  USER_HEIGHT_UNITS,
  USER_TIME_FORMATS,
  USER_WEIGHT_UNITS,
} from "@/app/lib/regional-preferences";
import {
  GymContextError,
  resolveUserRegionalPreferences,
} from "@/app/lib/regional-server";
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

export async function GET(request: Request) {
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

  // Raw stored values (null = inherit) plus the resolved preferences and
  // their provenance (user -> gym -> browser/device -> built-in).
  // Callers with multiple gym memberships may pass ?gymId= to select the
  // gym context; unauthorized ids are rejected, never silently swapped.
  const requestedGymId = new URL(request.url).searchParams.get("gymId");

  try {
    const resolved = await resolveUserRegionalPreferences(user.id, {
      gymId: requestedGymId,
    });

    return NextResponse.json({
      user,
      resolved,
    });
  } catch (error) {
    if (error instanceof GymContextError) {
      return NextResponse.json(
        { error: error.message, code: error.code },
        { status: 403 },
      );
    }
    throw error;
  }
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
    timezone?: string | null;
    country?: string | null;
    locale?: string | null;
    currency?: string | null;
    weightUnit?: typeof USER_WEIGHT_UNITS[number] | null;
    heightUnit?: typeof USER_HEIGHT_UNITS[number] | null;
    distanceUnit?: typeof USER_DISTANCE_UNITS[number] | null;
    dateFormat?: typeof USER_DATE_FORMATS[number] | null;
    timeFormat?: typeof USER_TIME_FORMATS[number] | null;
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
  // Regional preference fields: null means "clear my override and inherit"
  // (gym -> browser/device -> built-in). Strings are validated as before.
  if (body.timezone !== undefined) {
    if (body.timezone === null) {
      data.timezone = null;
    } else {
      const timezone = normalizeUserTimezone(body.timezone);
      if (!timezone) {
        return NextResponse.json({ error: "timezone must be a valid IANA timezone or null to inherit" }, { status: 400 });
      }
      data.timezone = timezone;
    }
  }
  if (body.country !== undefined) {
    if (body.country === null) {
      data.country = null;
    } else {
      const country =
        typeof body.country === "string" ? body.country.trim().toUpperCase() : "";
      if (!isSupportedCountry(country)) {
        return NextResponse.json({ error: "country must be a valid ISO 3166-1 alpha-2 code or null to inherit" }, { status: 400 });
      }
      data.country = country;
    }
  }
  if (body.locale !== undefined) {
    if (body.locale === null) {
      data.locale = null;
    } else {
      const locale = normalizeUserLocale(body.locale);
      if (!locale) {
        return NextResponse.json({ error: "locale must be a valid BCP 47 language tag or null to inherit" }, { status: 400 });
      }
      data.locale = locale;
    }
  }
  if (body.currency !== undefined) {
    if (body.currency === null) {
      data.currency = null;
    } else {
      const currency =
        typeof body.currency === "string" ? body.currency.trim().toUpperCase() : "";
      if (!isSupportedCurrency(currency)) {
        return NextResponse.json({ error: "currency must be a supported ISO 4217 currency code or null to inherit" }, { status: 400 });
      }
      data.currency = currency;
    }
  }
  if (body.weightUnit !== undefined) {
    if (body.weightUnit !== null && !isOneOf(body.weightUnit, USER_WEIGHT_UNITS)) {
      return NextResponse.json({ error: "weightUnit is not valid" }, { status: 400 });
    }
    data.weightUnit = body.weightUnit === null ? null : body.weightUnit;
  }
  if (body.heightUnit !== undefined) {
    if (body.heightUnit !== null && !isOneOf(body.heightUnit, USER_HEIGHT_UNITS)) {
      return NextResponse.json({ error: "heightUnit is not valid" }, { status: 400 });
    }
    data.heightUnit = body.heightUnit === null ? null : body.heightUnit;
  }
  if (body.distanceUnit !== undefined) {
    if (body.distanceUnit !== null && !isOneOf(body.distanceUnit, USER_DISTANCE_UNITS)) {
      return NextResponse.json({ error: "distanceUnit is not valid" }, { status: 400 });
    }
    data.distanceUnit = body.distanceUnit === null ? null : body.distanceUnit;
  }
  if (body.dateFormat !== undefined) {
    if (body.dateFormat !== null && !isOneOf(body.dateFormat, USER_DATE_FORMATS)) {
      return NextResponse.json({ error: "dateFormat is not valid" }, { status: 400 });
    }
    data.dateFormat = body.dateFormat === null ? null : body.dateFormat;
  }
  if (body.timeFormat !== undefined) {
    if (body.timeFormat !== null && !isOneOf(body.timeFormat, USER_TIME_FORMATS)) {
      return NextResponse.json({ error: "timeFormat is not valid" }, { status: 400 });
    }
    data.timeFormat = body.timeFormat === null ? null : body.timeFormat;
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

  const resolved = await resolveUserRegionalPreferences(user.id);

  return NextResponse.json({
    success: true,
    user,
    resolved,
  });
}