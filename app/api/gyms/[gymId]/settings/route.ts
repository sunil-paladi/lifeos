import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/app/lib/authorization";
import {
  getCountryDefaults,
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
import { prisma } from "@/lib/prisma";

type RouteContext = {
  params: Promise<{ gymId: string }>;
};

const REGIONAL_KEYS = [
  "country",
  "timezone",
  "currency",
  "locale",
  "dateFormat",
  "timeFormat",
  "weightUnit",
  "heightUnit",
  "distanceUnit",
] as const;

type RegionalKey = (typeof REGIONAL_KEYS)[number];
type RegionalValues = Partial<Record<RegionalKey, string>>;

function isOneOf<T extends readonly string[]>(
  value: unknown,
  options: T,
): value is T[number] {
  return typeof value === "string" && (options as readonly string[]).includes(value);
}

/** Normalizes legacy "mi" to the canonical "miles" vocabulary. */
function normalizeDistanceUnit(value: unknown): string | null {
  if (value === "mi" || value === "miles") return "miles";
  return isOneOf(value, USER_DISTANCE_UNITS) ? value : null;
}

/**
 * Validates and normalizes only the regional fields present in the payload.
 * Fields absent from the payload are never touched by the caller.
 */
function normalizeRegionalValues(payload: Record<string, unknown>): {
  values: RegionalValues;
  errors: Record<string, string>;
} {
  const values: RegionalValues = {};
  const errors: Record<string, string> = {};

  if (payload.country !== undefined) {
    const code =
      typeof payload.country === "string" ? payload.country.trim().toUpperCase() : "";
    if (!isSupportedCountry(code)) {
      errors.country = "Invalid country value (ISO alpha-2 expected)";
    } else {
      values.country = code;
    }
  }

  if (payload.timezone !== undefined) {
    const timezone = normalizeUserTimezone(payload.timezone);
    if (!timezone) {
      errors.timezone = "Invalid timezone value";
    } else {
      values.timezone = timezone;
    }
  }

  if (payload.currency !== undefined) {
    const code =
      typeof payload.currency === "string" ? payload.currency.trim().toUpperCase() : "";
    if (!isSupportedCurrency(code)) {
      errors.currency = "Invalid currency value";
    } else {
      values.currency = code;
    }
  }

  // "locale" is canonical; "language" is accepted as a deprecated alias so
  // older clients keep working during the vocabulary unification.
  if (payload.locale !== undefined || payload.language !== undefined) {
    const locale = normalizeUserLocale(payload.locale ?? payload.language);
    if (!locale) {
      errors.locale = "Invalid locale value (BCP 47 language tag expected)";
    } else {
      values.locale = locale;
    }
  }

  if (payload.dateFormat !== undefined) {
    if (!isOneOf(payload.dateFormat, USER_DATE_FORMATS)) {
      errors.dateFormat = "Invalid date format value";
    } else {
      values.dateFormat = payload.dateFormat;
    }
  }

  if (payload.timeFormat !== undefined) {
    if (!isOneOf(payload.timeFormat, USER_TIME_FORMATS)) {
      errors.timeFormat = "Invalid time format value";
    } else {
      values.timeFormat = payload.timeFormat;
    }
  }

  if (payload.weightUnit !== undefined) {
    if (!isOneOf(payload.weightUnit, USER_WEIGHT_UNITS)) {
      errors.weightUnit = "Invalid weight unit value";
    } else {
      values.weightUnit = payload.weightUnit;
    }
  }

  if (payload.heightUnit !== undefined) {
    if (!isOneOf(payload.heightUnit, USER_HEIGHT_UNITS)) {
      errors.heightUnit = "Invalid height unit value";
    } else {
      values.heightUnit = payload.heightUnit;
    }
  }

  if (payload.distanceUnit !== undefined) {
    const unit = normalizeDistanceUnit(payload.distanceUnit);
    if (!unit) {
      errors.distanceUnit = "Invalid distance unit value (km or miles)";
    } else {
      values.distanceUnit = unit;
    }
  }

  return { values, errors };
}

function toSettingsResponse(settings: {
  country: string;
  timezone: string;
  currency: string;
  locale: string;
  dateFormat: string;
  timeFormat: string;
  weightUnit: string;
  heightUnit: string;
  distanceUnit: string;
}) {
  return {
    country: settings.country,
    timezone: settings.timezone,
    currency: settings.currency,
    locale: settings.locale,
    dateFormat: settings.dateFormat,
    timeFormat: settings.timeFormat,
    weightUnit: settings.weightUnit,
    heightUnit: settings.heightUnit,
    distanceUnit:
      settings.distanceUnit === "mi" ? "miles" : settings.distanceUnit,
  };
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

  // Recommended country defaults are only a fallback for gyms that never
  // saved a settings row; owner-saved values always take precedence.
  const settings = gym.settings ?? getCountryDefaults("IN");

  return NextResponse.json({
    gymId: gym.id,
    gymName: gym.name,
    ...toSettingsResponse(settings),
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

  const gymName = typeof payload.gymName === "string" ? payload.gymName.trim() : undefined;
  if (payload.gymName !== undefined && !gymName) {
    return NextResponse.json({ error: "Gym name must be a non-empty string" }, { status: 400 });
  }

  const { values, errors: validationErrors } = normalizeRegionalValues(payload);

  if (Object.keys(validationErrors).length > 0) {
    return NextResponse.json({ error: "Validation failed", details: validationErrors }, { status: 400 });
  }

  const existing = await prisma.gymSettings.findUnique({
    where: { gymId },
  });

  // Country change = owner picked a new country: repopulate the *unspecified*
  // display fields with that country's recommended defaults. Values provided
  // in this payload always win over the recommendations, and if country is
  // not part of the payload, no other field is touched (partial PATCH never
  // resets owner config).
  const countryChanged =
    values.country !== undefined && values.country !== (existing?.country ?? null);
  const recommended = getCountryDefaults(values.country ?? existing?.country ?? "IN");

  const updateData: RegionalValues = {};
  if (countryChanged) {
    for (const key of REGIONAL_KEYS) {
      if (values[key] !== undefined) {
        updateData[key] = values[key];
      } else if (key !== "country") {
        updateData[key] = recommended[key];
      }
    }
  } else {
    Object.assign(updateData, values);
  }

  // Creating a settings row for the first time: full row from the current
  // country's recommended defaults, overridden by whatever the owner sent.
  const createData = {
    gymId,
    ...recommended,
    ...(values.country !== undefined ? { country: values.country } : {}),
    ...values,
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
      update: updateData,
      create: createData,
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
    settings: toSettingsResponse(result.settings),
  });
}
