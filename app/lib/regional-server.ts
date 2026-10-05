import {
  type RegionalPreferenceKey,
  type RegionalPreferenceLayer,
  type RegionalPreferences,
  type RegionalProvenance,
  resolveRegionalPreferences,
} from "@/app/lib/regional-preferences";
import { prisma } from "@/lib/prisma";

// Server-side resolution of a user's regional preferences.
//
// Gym context rules (explicitly NOT an "earliest membership wins" rule):
//  1. If a gymId is supplied by the caller, it is authorized (ACTIVE
//     membership for this user, or the user owns the gym) and used as the
//     gym layer. Unauthorized ids throw GymContextError("GYM_ACCESS_DENIED")
//     instead of silently falling back to another gym.
//  2. If no gymId is supplied and the user has exactly one ACTIVE gym
//     membership, that gym is used.
//  3. If no gymId is supplied and the user has MULTIPLE ACTIVE gym
//     memberships, we do NOT guess: gymSelection is "context-required" and
//     the gym layer is omitted until the caller/UI provides gym context.
//  4. No ACTIVE memberships -> gymSelection "none", gym layer omitted.
//
// This keeps the architecture ready for a future "current gym" session
// context, which can simply be passed in as gymId (rule 1).

export type GymSelection =
  | "explicit"
  | "single-active"
  | "context-required"
  | "none";

export type UserRegionalRow = {
  timezone: string | null;
  country: string | null;
  locale: string | null;
  currency: string | null;
  weightUnit: string | null;
  heightUnit: string | null;
  distanceUnit: string | null;
  dateFormat: string | null;
  timeFormat: string | null;
};

export type GymRegionalRow = {
  timezone: string;
  country: string;
  locale: string;
  currency: string;
  weightUnit: string;
  heightUnit: string;
  distanceUnit: string;
  dateFormat: string;
  timeFormat: string;
};

export type ResolvedRegionalPreferences = {
  preferences: RegionalPreferences;
  provenance: RegionalProvenance;
  /** Raw layers used for resolution (user values may contain nulls). */
  layers: {
    user: RegionalPreferenceLayer;
    gym: GymRegionalRow | null;
  };
  /** The gym whose settings were used, if any. */
  gymId: string | null;
  gymName: string | null;
  gymSelection: GymSelection;
  /** Present when the user has multiple active gyms (gym context picker). */
  availableGyms?: { id: string; name: string }[];
};

const REGIONAL_KEYS = [
  "timezone",
  "country",
  "locale",
  "currency",
  "weightUnit",
  "heightUnit",
  "distanceUnit",
  "dateFormat",
  "timeFormat",
] as const satisfies readonly RegionalPreferenceKey[];

const REGIONAL_SELECT = Object.fromEntries(
  REGIONAL_KEYS.map((key) => [key, true]),
) as Record<RegionalPreferenceKey, true>;

function toLayer(row: UserRegionalRow | GymRegionalRow | null): RegionalPreferenceLayer {
  if (!row) return null;
  const layer: Partial<Record<RegionalPreferenceKey, string | null>> = {};
  for (const key of REGIONAL_KEYS) {
    layer[key] = row[key];
  }
  return layer;
}

export class GymContextError extends Error {
  readonly code: "GYM_CONTEXT_REQUIRED" | "GYM_ACCESS_DENIED";

  constructor(code: "GYM_CONTEXT_REQUIRED" | "GYM_ACCESS_DENIED", message: string) {
    super(message);
    this.name = "GymContextError";
    this.code = code;
  }
}

/**
 * Resolves a user's effective regional preferences with provenance.
 *
 * @param gymId Optional explicit gym context. When provided it is
 *   authorized against the user's memberships/ownership; unauthorized ids
 *   throw GymContextError instead of silently falling back.
 */
export async function resolveUserRegionalPreferences(
  userId: string,
  options?: { gymId?: string | null },
): Promise<ResolvedRegionalPreferences> {
  const requestedGymId = options?.gymId?.trim() || null;

  const [user, activeMemberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, ...REGIONAL_SELECT },
    }),
    prisma.gymMembership.findMany({
      where: { userId, status: "ACTIVE" },
      select: { gymId: true, gym: { select: { id: true, name: true } } },
      orderBy: { gymId: "asc" },
    }),
  ]);

  if (!user) {
    throw new Error("User not found while resolving regional preferences");
  }

  const availableGyms =
    activeMemberships.length > 1
      ? activeMemberships.map((membership) => membership.gym)
      : undefined;

  let gymId: string | null = null;
  let gymSelection: GymSelection = "none";

  if (requestedGymId) {
    const hasActiveMembership = activeMemberships.some(
      (membership) => membership.gymId === requestedGymId,
    );
    const ownsGym =
      hasActiveMembership ||
      (await prisma.gym.findUnique({
        where: { id: requestedGymId },
        select: { ownerId: true },
      }))?.ownerId === userId;

    if (!ownsGym) {
      throw new GymContextError(
        "GYM_ACCESS_DENIED",
        "The requested gym is not an active membership for this user and the user does not own it",
      );
    }
    gymId = requestedGymId;
    gymSelection = "explicit";
  } else if (activeMemberships.length === 1) {
    gymId = activeMemberships[0].gymId;
    gymSelection = "single-active";
  } else if (activeMemberships.length > 1) {
    // Multiple active gyms and no explicit context: do not guess.
    gymSelection = "context-required";
  }

  const gym = gymId
    ? await prisma.gym.findUnique({
        where: { id: gymId },
        select: { id: true, name: true, settings: { select: REGIONAL_SELECT } },
      })
    : null;

  const userLayer = toLayer(user);
  const gymLayer: GymRegionalRow | null = gym?.settings
    ? {
        timezone: gym.settings.timezone,
        country: gym.settings.country,
        locale: gym.settings.locale,
        currency: gym.settings.currency,
        weightUnit: gym.settings.weightUnit,
        heightUnit: gym.settings.heightUnit,
        distanceUnit: gym.settings.distanceUnit,
        dateFormat: gym.settings.dateFormat,
        timeFormat: gym.settings.timeFormat,
      }
    : null;

  // Browser/device layer is resolved client-side (it needs navigator);
  // server-side the chain is user -> gym -> built-in, which is the correct
  // baseline for API consumers.
  const { effective, provenance } = resolveRegionalPreferences({
    user: userLayer,
    gym: gymLayer,
  });

  return {
    preferences: effective,
    provenance,
    layers: { user: userLayer, gym: gymLayer },
    gymId: gymId ?? null,
    gymName: gym?.name ?? null,
    gymSelection,
    ...(availableGyms ? { availableGyms } : {}),
  };
}
