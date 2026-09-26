import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
};

const DEFAULT_SETTINGS = {
  country: "IN",
  timezone: "Asia/Kolkata",
  currency: "INR",
  language: "en",
  dateFormat: "DD/MM/YYYY",
  timeFormat: "12h",
  weightUnit: "kg",
  distanceUnit: "km",
} as const;

const COUNTRY_OPTIONS = ["IN", "US", "GB", "CA", "AU", "DE", "FR", "AE", "SG", "NZ"] as const;
const CURRENCY_OPTIONS = ["INR", "USD", "EUR", "GBP", "AED", "SGD", "AUD"] as const;
const LANGUAGE_OPTIONS = ["en", "hi", "fr", "de", "es", "ar"] as const;
const DATE_FORMAT_OPTIONS = ["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"] as const;
const TIME_FORMAT_OPTIONS = ["12h", "24h"] as const;
const WEIGHT_UNIT_OPTIONS = ["kg", "lb"] as const;
const DISTANCE_UNIT_OPTIONS = ["km", "mi"] as const;
const TIMEZONE_OPTIONS = [
  "UTC",
  "Asia/Kolkata",
  "America/New_York",
  "Europe/London",
  "Europe/Paris",
  "Asia/Dubai",
  "Asia/Singapore",
  "Australia/Sydney",
] as const;

function isValidValue<T extends readonly string[]>(value: unknown, options: T) {
  return typeof value === "string" && options.includes(value as T[number]);
}

export async function GET(_request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId } = await context.params;

  const membership = await prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId: user.id,
      status: "ACTIVE",
    },
    select: {
      id: true,
      role: true,
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "You are not a member of this gym" }, { status: 403 });
  }

  const gym = await prisma.gym.findUnique({
    where: { id: gymId },
    select: {
      id: true,
      name: true,
      settings: true,
    },
  });

  if (!gym) {
    return NextResponse.json({ error: "Gym not found" }, { status: 404 });
  }

  const settings = gym.settings ?? { ...DEFAULT_SETTINGS };

  return NextResponse.json({
    gymId: gym.id,
    gymName: gym.name,
    country: settings.country,
    timezone: settings.timezone,
    currency: settings.currency,
    language: settings.language,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    weightUnit: settings.weightUnit,
    distanceUnit: settings.distanceUnit,
  });
}

export async function PATCH(request: Request, context: RouteContext) {
  const { user, response } = await getAuthenticatedUser();
  if (!user) return response;

  const { gymId } = await context.params;

  const ownerMembership = await prisma.gymMembership.findFirst({
    where: {
      gymId,
      userId: user.id,
      role: "OWNER",
      status: "ACTIVE",
    },
    select: { id: true },
  });

  if (!ownerMembership) {
    return NextResponse.json({ error: "Only an active owner may modify gym settings" }, { status: 403 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return NextResponse.json({ error: "Request body must be an object" }, { status: 400 });
  }

  const payload = body as Record<string, unknown>;

  const gymNameValue = payload.gymName;
  const gymName = typeof gymNameValue === "string" ? gymNameValue.trim() : undefined;

  if (gymNameValue !== undefined && (typeof gymNameValue !== "string" || gymName === "")) {
    return NextResponse.json({ error: "Gym name must be a non-empty string" }, { status: 400 });
  }

  const validationErrors: Record<string, string> = {};
  const normalizedValues = {
    country: payload.country,
    timezone: payload.timezone,
    currency: payload.currency,
    language: payload.language,
    dateFormat: payload.dateFormat,
    timeFormat: payload.timeFormat,
    weightUnit: payload.weightUnit,
    distanceUnit: payload.distanceUnit,
  } as const;

  if (payload.country !== undefined && !isValidValue(payload.country, COUNTRY_OPTIONS)) {
    validationErrors.country = "Invalid country value";
  }
  if (payload.timezone !== undefined && !isValidValue(payload.timezone, TIMEZONE_OPTIONS)) {
    validationErrors.timezone = "Invalid timezone value";
  }
  if (payload.currency !== undefined && !isValidValue(payload.currency, CURRENCY_OPTIONS)) {
    validationErrors.currency = "Invalid currency value";
  }
  if (payload.language !== undefined && !isValidValue(payload.language, LANGUAGE_OPTIONS)) {
    validationErrors.language = "Invalid language value";
  }
  if (payload.dateFormat !== undefined && !isValidValue(payload.dateFormat, DATE_FORMAT_OPTIONS)) {
    validationErrors.dateFormat = "Invalid date format value";
  }
  if (payload.timeFormat !== undefined && !isValidValue(payload.timeFormat, TIME_FORMAT_OPTIONS)) {
    validationErrors.timeFormat = "Invalid time format value";
  }
  if (payload.weightUnit !== undefined && !isValidValue(payload.weightUnit, WEIGHT_UNIT_OPTIONS)) {
    validationErrors.weightUnit = "Invalid weight unit value";
  }
  if (payload.distanceUnit !== undefined && !isValidValue(payload.distanceUnit, DISTANCE_UNIT_OPTIONS)) {
    validationErrors.distanceUnit = "Invalid distance unit value";
  }

  if (Object.keys(validationErrors).length > 0) {
    return NextResponse.json({ error: "Validation failed", details: validationErrors }, { status: 400 });
  }

  const settingsPayload = {
    country: typeof payload.country === "string" ? payload.country : DEFAULT_SETTINGS.country,
    timezone: typeof payload.timezone === "string" ? payload.timezone : DEFAULT_SETTINGS.timezone,
    currency: typeof payload.currency === "string" ? payload.currency : DEFAULT_SETTINGS.currency,
    language: typeof payload.language === "string" ? payload.language : DEFAULT_SETTINGS.language,
    dateFormat: typeof payload.dateFormat === "string" ? payload.dateFormat : DEFAULT_SETTINGS.dateFormat,
    timeFormat: typeof payload.timeFormat === "string" ? payload.timeFormat : DEFAULT_SETTINGS.timeFormat,
    weightUnit: typeof payload.weightUnit === "string" ? payload.weightUnit : DEFAULT_SETTINGS.weightUnit,
    distanceUnit: typeof payload.distanceUnit === "string" ? payload.distanceUnit : DEFAULT_SETTINGS.distanceUnit,
  };

  const result = await prisma.$transaction(async (tx) => {
    if (gymName !== undefined) {
      await tx.gym.update({
        where: { id: gymId },
        data: { name: gymName },
      });
    }

    const settings = await tx.gymSettings.upsert({
      where: { gymId },
      update: settingsPayload,
      create: {
        gymId,
        ...settingsPayload,
      },
    });

    const gym = await tx.gym.findUnique({
      where: { id: gymId },
      select: { name: true },
    });

    return { settings, gymName: gym?.name ?? gymName ?? "" };
  });

  return NextResponse.json({
    message: "Gym settings updated successfully",
    gymName: result.gymName,
    settings: result.settings,
  });
}
