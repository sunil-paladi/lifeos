import { exercises } from "@/app/data/exercises";
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  STRENGTH_EQUIPMENT,
  WORKOUT_LOCATIONS,
  WORKOUT_SPLITS,
  WORKOUT_DAYS,
} from "./ai-workout-types";
import type {
  GeneratedWorkout,
  GeneratedWorkoutDay,
  GeneratedWorkoutExercise,
  WorkoutDayName,
  WorkoutLocation,
  WorkoutPreferences,
  WorkoutSplit,
} from "./ai-workout-types";

export {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  STRENGTH_EQUIPMENT,
  WORKOUT_LOCATIONS,
  WORKOUT_SPLITS,
  WORKOUT_DAYS,
} from "./ai-workout-types";
export type {
  GeneratedWorkout,
  GeneratedWorkoutDay,
  GeneratedWorkoutExercise,
  WorkoutDayName,
  WorkoutLocation,
  WorkoutPreferences,
  WorkoutSplit,
} from "./ai-workout-types";

export const GROQ_BASE_URL = "https://api.groq.com/openai/v1";
export const GROQ_DEFAULT_MODEL = "openai/gpt-oss-20b";

const SAFE_GROQ_ERROR_IDENTIFIERS = new Set([
  "authentication_error",
  "context_length_exceeded",
  "insufficient_quota",
  "invalid_api_key",
  "invalid_request_error",
  "model_not_found",
  "permission_denied",
  "rate_limit_exceeded",
  "server_error",
  "service_unavailable",
  "timeout",
  "unsupported_value",
]);

type SafeGroqErrorReason =
  | "unsupported_response_format"
  | "unsupported_parameter"
  | "model_unavailable"
  | "context_limit"
  | "invalid_request";

export function getGroqProviderErrorDetails(error: unknown) {
  if (typeof error !== "object" || error === null) {
    return {};
  }

  const getRecord = (value: unknown): Record<string, unknown> | undefined =>
    typeof value === "object" && value !== null
      ? value as Record<string, unknown>
      : undefined;
  const providerError = error as {
    status?: unknown;
    code?: unknown;
    type?: unknown;
    message?: unknown;
    error?: unknown;
  };
  const nestedError = getRecord(providerError.error);
  const safeIdentifier = (value: unknown) =>
    typeof value === "string" &&
    SAFE_GROQ_ERROR_IDENTIFIERS.has(value)
      ? value
      : undefined;
  const message = [
    providerError.message,
    nestedError?.message,
  ].filter((value): value is string => typeof value === "string").join(" ").toLowerCase();
  let reason: SafeGroqErrorReason | undefined;
  if (
    /response[_ ]format|json[_ ]object|structured output|json mode/.test(message) &&
    /unsupported|not supported|invalid|must/.test(message)
  ) {
    reason = "unsupported_response_format";
  } else if (
    /temperature|max_tokens|max_completion_tokens|reasoning_effort/.test(message) &&
    /unsupported|not supported|invalid/.test(message)
  ) {
    reason = "unsupported_parameter";
  } else if (/model.{0,30}(not found|unavailable|unsupported)/.test(message)) {
    reason = "model_unavailable";
  } else if (/context length|context window|max(imum)? token/.test(message)) {
    reason = "context_limit";
  } else if (
    providerError.type === "invalid_request_error" ||
    nestedError?.type === "invalid_request_error"
  ) {
    reason = "invalid_request";
  }
  const status =
    typeof providerError.status === "number" &&
    Number.isInteger(providerError.status) &&
    providerError.status >= 100 &&
    providerError.status <= 599
      ? providerError.status
      : undefined;
  const code = safeIdentifier(providerError.code) ??
    safeIdentifier(nestedError?.code);
  const type =
    safeIdentifier(providerError.type) ??
    safeIdentifier(nestedError?.type);

  return {
    ...(status === undefined ? {} : { status }),
    ...(code === undefined ? {} : { code }),
    ...(type === undefined ? {} : { type }),
    ...(reason === undefined ? {} : { reason }),
  };
}

export class AiWorkoutConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiWorkoutConfigurationError";
  }
}

export function getGroqConfiguration(apiKey: string | undefined, model: string | undefined) {
  const configuredApiKey = apiKey?.trim();
  if (!configuredApiKey) {
    throw new AiWorkoutConfigurationError(
      "GROQ_API_KEY is required to generate workouts",
    );
  }

  return {
    apiKey: configuredApiKey,
    model: model?.trim() || GROQ_DEFAULT_MODEL,
  };
}

export class AiWorkoutValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiWorkoutValidationError";
  }
}

export class AiWorkoutInvalidJsonError extends AiWorkoutValidationError {
  constructor() {
    super("AI response was not valid JSON");
    this.name = "AiWorkoutInvalidJsonError";
  }
}

export interface AiWorkoutProviderDiagnostics {
  status?: number;
  code?: string;
  type?: string;
  reason?: SafeGroqErrorReason;
}

export class AiWorkoutProviderError extends Error {
  readonly diagnostics: AiWorkoutProviderDiagnostics;

  constructor(diagnostics: AiWorkoutProviderDiagnostics) {
    super("AI workout provider request failed");
    this.name = "AiWorkoutProviderError";
    this.diagnostics = diagnostics;
  }
}

export function validateWorkoutPreferences(
  input: unknown,
): WorkoutPreferences {
  if (!isRecord(input)) {
    throw new AiWorkoutValidationError("Preferences must be an object");
  }

  const {
    fitnessGoal,
    experienceLevel,
    workoutLocation,
    workoutSplit,
    availableEquipment,
    trainingDays,
    limitations,
  } = input;
  if (!FITNESS_GOALS.includes(fitnessGoal as WorkoutPreferences["fitnessGoal"])) {
    throw new AiWorkoutValidationError("Choose a supported fitness goal");
  }
  if (!EXPERIENCE_LEVELS.includes(experienceLevel as WorkoutPreferences["experienceLevel"])) {
    throw new AiWorkoutValidationError("Choose a supported experience level");
  }
  if (
    workoutLocation !== undefined &&
    (typeof workoutLocation !== "string" ||
      !WORKOUT_LOCATIONS.includes(workoutLocation as WorkoutLocation))
  ) {
    throw new AiWorkoutValidationError("Choose Gym, Home, or Both for workout location");
  }
  if (
    workoutSplit !== undefined &&
    (typeof workoutSplit !== "string" ||
      !WORKOUT_SPLITS.includes(workoutSplit as WorkoutSplit))
  ) {
    throw new AiWorkoutValidationError("Choose a supported workout split");
  }
  if (availableEquipment !== undefined && (
    !Array.isArray(availableEquipment) ||
    availableEquipment.length < 1 ||
    availableEquipment.length > 10 ||
    availableEquipment.some(
      (item) =>
        typeof item !== "string" ||
        !STRENGTH_EQUIPMENT.includes(item),
    ) ||
    new Set(availableEquipment).size !== availableEquipment.length
  )) {
    throw new AiWorkoutValidationError("Select 1 to 10 valid equipment options");
  }
  if (workoutLocation === undefined && availableEquipment === undefined) {
    throw new AiWorkoutValidationError("Choose a workout location");
  }
  if (
    !Array.isArray(trainingDays) ||
    trainingDays.length < 1 ||
    trainingDays.length > 6 ||
    trainingDays.some(
      (day) =>
        typeof day !== "string" ||
        !WORKOUT_DAYS.includes(day as WorkoutDayName),
    ) ||
    new Set(trainingDays).size !== trainingDays.length
  ) {
    throw new AiWorkoutValidationError("Select 1 to 6 distinct training days");
  }
  if (
    typeof limitations !== "string" ||
    limitations.length > 500 ||
    limitations.trim().length === 0
  ) {
    throw new AiWorkoutValidationError(
      "Limitations must be provided and no longer than 500 characters",
    );
  }

  const hasWorkoutLocation = Object.prototype.hasOwnProperty.call(input, "workoutLocation");
  const hasWorkoutSplit = Object.prototype.hasOwnProperty.call(input, "workoutSplit");
  const hasAvailableEquipment = Object.prototype.hasOwnProperty.call(input, "availableEquipment");

  return {
    fitnessGoal: fitnessGoal as WorkoutPreferences["fitnessGoal"],
    experienceLevel: experienceLevel as WorkoutPreferences["experienceLevel"],
    ...(hasWorkoutLocation
      ? { workoutLocation: workoutLocation as WorkoutLocation | undefined }
      : {}),
    ...(hasWorkoutSplit
      ? { workoutSplit: workoutSplit as WorkoutSplit | undefined }
      : {}),
    ...(hasAvailableEquipment
      ? {
          availableEquipment:
            availableEquipment === undefined ? undefined : [...availableEquipment] as string[],
        }
      : {}),
    trainingDays: [...trainingDays] as WorkoutDayName[],
    limitations: limitations.trim(),
  };
}

export function sanitizeAiWorkoutValidationReason(reason: string): string {
  return reason
    .replace(/exercise ID:\s*\d+/gi, "exercise ID: [redacted]")
    .replace(/duplicate exercise ID:\s*\d+/gi, "duplicate exercise ID: [redacted]")
    .replace(/unknown or unavailable exercise ID:\s*\d+/gi, "unknown or unavailable exercise ID: [redacted]")
    .replace(/AI response contains an invalid exercise ID/gi, "AI response contains an invalid exercise ID");
}

function getCatalogMuscleGroup(exerciseId: number): string | undefined {
  return Object.entries(exercises).find(([, catalog]) =>
    catalog.some((exercise) => exercise.id === exerciseId),
  )?.[0];
}

const COMBINED_MUSCLE_GROUPS = [
  ["Back", "Biceps"],
  ["Chest", "Triceps"],
  ["Legs", "Abs"],
  ["Chest", "Back"],
  ["Shoulders", "Triceps"],
  ["Shoulders", "Biceps"],
];

const UPPER_MUSCLE_GROUPS = new Set([
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
]);

function validateWorkoutSplit(
  days: readonly GeneratedWorkoutDay[],
  preferences: WorkoutPreferences,
) {
  const split = preferences.workoutSplit ?? "Let AI decide";
  const groupsByDay = new Map(
    days.map(({ day, exercises: dayExercises }) => [
      day,
      new Set(dayExercises.map(({ exerciseId }) => getCatalogMuscleGroup(exerciseId))),
    ]),
  );

  const orderedDays = [...preferences.trainingDays].sort(
    (left, right) => WORKOUT_DAYS.indexOf(left) - WORKOUT_DAYS.indexOf(right),
  );
  const isExplicitFullBody = split === "Full body";
  const isAiChosenFullBody =
    split === "Let AI decide" &&
    [...groupsByDay.values()].every((groups) =>
      ["Chest", "Back", "Legs"].every((group) => groups.has(group)),
    );
  if (!isExplicitFullBody && !isAiChosenFullBody) {
    for (let index = 1; index < orderedDays.length; index += 1) {
      const previousGroups = groupsByDay.get(orderedDays[index - 1]);
      const currentGroups = groupsByDay.get(orderedDays[index]);
      if (
        previousGroups &&
        currentGroups &&
        [...previousGroups].some((group) => currentGroups.has(group))
      ) {
        throw new AiWorkoutValidationError(
          "Consecutive selected training days must not repeat a primary muscle group",
        );
      }
    }
  }

  if (split === "Let AI decide") {
    return;
  }

  if (split === "Single muscle group per day") {
    if ([...groupsByDay.values()].some((groups) => groups.size !== 1 || groups.has(undefined))) {
      throw new AiWorkoutValidationError(
        "Each selected day must use one primary muscle group",
      );
    }
    return;
  }

  if (split === "Combined muscle groups") {
    if ([...groupsByDay.values()].some((groups) =>
      groups.has(undefined) ||
      !COMBINED_MUSCLE_GROUPS.some((combination) =>
        groups.size === combination.length &&
        combination.every((group) => groups.has(group)),
      ),
    )) {
      throw new AiWorkoutValidationError(
        "Each selected day must use a sensible combined muscle-group pairing",
      );
    }
    return;
  }

  if (split === "Full body") {
    const majorMuscleGroups = ["Chest", "Back", "Legs"];
    if ([...groupsByDay.values()].some((groups) =>
      majorMuscleGroups.some((group) => !groups.has(group)),
    )) {
      throw new AiWorkoutValidationError(
        "Each full-body session must include chest, back, and legs",
      );
    }
    return;
  }

  if (split === "Upper / Lower") {
    for (const [index, day] of orderedDays.entries()) {
      const groups = groupsByDay.get(day);
      const isUpperDay = index % 2 === 0;
      if (
        !groups ||
        groups.has(undefined) ||
        (isUpperDay
          ? ![...groups].some((group) => group !== undefined && UPPER_MUSCLE_GROUPS.has(group)) ||
            groups.has("Legs")
          : !groups.has("Legs") ||
            [...groups].some((group) => group !== undefined && UPPER_MUSCLE_GROUPS.has(group)))
      ) {
        throw new AiWorkoutValidationError(
          "Upper / Lower sessions must alternate between upper-body and lower-body days",
        );
      }
    }
  }
}

export function validateGeneratedWorkout(
  input: unknown,
  preferences: WorkoutPreferences,
): GeneratedWorkout {
  if (!isRecord(input) || !hasExactKeys(input, ["days"]) || !Array.isArray(input.days)) {
    throw new AiWorkoutValidationError("AI response must contain a days array");
  }

  if (input.days.length !== preferences.trainingDays.length) {
    throw new AiWorkoutValidationError("AI response must include every selected day exactly once");
  }

  const eligibleExercises = getEligibleExercisesForPreferences(preferences);
  const eligibleIds = new Set(eligibleExercises.map((exercise) => exercise.id));
  const seenDays = new Set<string>();
  const seenExerciseIds = new Set<number>();
  let totalWeeklySets = 0;

  const days = input.days.map((rawDay): GeneratedWorkoutDay => {
    if (!isRecord(rawDay) || !hasExactKeys(rawDay, ["day", "exercises"])) {
      throw new AiWorkoutValidationError("Each generated day has an invalid shape");
    }

    if (
      typeof rawDay.day !== "string" ||
      !preferences.trainingDays.includes(rawDay.day as WorkoutDayName) ||
      seenDays.has(rawDay.day)
    ) {
      throw new AiWorkoutValidationError("AI response contains an unselected or duplicate day");
    }
    seenDays.add(rawDay.day);

    if (
      !Array.isArray(rawDay.exercises) ||
      rawDay.exercises.length < 2 ||
      rawDay.exercises.length > 8
    ) {
      throw new AiWorkoutValidationError("Each training day must contain 2 to 8 exercises");
    }

    let dailySets = 0;
    const dayExercises = rawDay.exercises.map(
      (rawExercise, index): GeneratedWorkoutExercise => {
        if (
          !isRecord(rawExercise) ||
          !hasExactKeys(rawExercise, [
            "exerciseId",
            "sets",
            "reps",
            "restSeconds",
            "exerciseOrder",
          ])
        ) {
          throw new AiWorkoutValidationError("Generated exercise has an invalid shape");
        }

        const { exerciseId, sets, reps, restSeconds, exerciseOrder } = rawExercise;
        if (
          typeof exerciseId !== "number" ||
          !Number.isInteger(exerciseId)
        ) {
          throw new AiWorkoutValidationError("AI response contains an invalid exercise ID");
        }
        if (!eligibleIds.has(exerciseId)) {
          throw new AiWorkoutValidationError(
            `AI response contains an unknown or unavailable exercise ID: ${exerciseId}`,
          );
        }
        if (seenExerciseIds.has(exerciseId)) {
          throw new AiWorkoutValidationError(
            `AI response contains a duplicate exercise ID: ${exerciseId}`,
          );
        }
        if (
          !isIntegerInRange(sets, 1, 6) ||
          !isIntegerInRange(reps, 1, 30) ||
          !isIntegerInRange(restSeconds, 0, 600) ||
          exerciseOrder !== index + 1
        ) {
          throw new AiWorkoutValidationError("Generated exercise settings are out of range");
        }

        seenExerciseIds.add(exerciseId);
        dailySets += sets;
        totalWeeklySets += sets;
        return { exerciseId, sets, reps, restSeconds, exerciseOrder };
      },
    );

    if (dailySets > 30) {
      throw new AiWorkoutValidationError("Generated daily volume exceeds 30 working sets");
    }
    return { day: rawDay.day as WorkoutDayName, exercises: dayExercises };
  });

  if (
    seenDays.size !== preferences.trainingDays.length ||
    totalWeeklySets > 120
  ) {
    throw new AiWorkoutValidationError("Generated weekly volume or training days are invalid");
  }

  validateWorkoutSplit(days, preferences);

  return { days };
}

export function getEligibleExercises(equipment: readonly string[]) {
  const available = new Set(equipment);
  return Object.values(exercises)
    .flat()
    .filter(
      (exercise) =>
        exercise.type !== "cardio" && available.has(exercise.equipment),
    )
    .map((exercise) => ({
      id: exercise.id,
      name: exercise.name,
      primaryMuscle: exercise.primaryMuscle,
      secondaryMuscles: exercise.secondaryMuscles,
      equipment: exercise.equipment,
      difficulty: exercise.difficulty,
    }));
}

function getEligibleExercisesForPreferences(preferences: WorkoutPreferences) {
  if (preferences.workoutLocation === "Home") {
    return getEligibleExercises(["Bodyweight"]);
  }
  if (preferences.workoutLocation === "Gym" || preferences.workoutLocation === "Both") {
    return getEligibleExercises(STRENGTH_EQUIPMENT);
  }
  return getEligibleExercises(preferences.availableEquipment ?? []);
}

export function buildWorkoutPrompt(
  preferences: WorkoutPreferences,
  catalog: ReturnType<typeof getEligibleExercises>,
) {
  const locationGuidance =
    preferences.workoutLocation === "Home"
      ? "For Home workouts, use bodyweight exercises only because no additional equipment availability has been confirmed."
      : preferences.workoutLocation === "Gym"
        ? "For Gym workouts, choose suitable exercises from the supplied catalog; do not ask the user to select individual machines."
        : preferences.workoutLocation === "Both"
          ? "For Both, create an appropriate mix of bodyweight and catalog equipment exercises."
          : "Use only the equipment specified in the legacy preferences.";
  const splitGuidance =
    preferences.workoutSplit === "Single muscle group per day"
      ? "Workout split: Single muscle group per day. Use exercises from exactly one catalog muscle-group bucket for each selected training day."
      : preferences.workoutSplit === "Combined muscle groups"
        ? "Workout split: Combined muscle groups. Give each selected training day one sensible pairing only, such as Chest + Triceps or Back + Biceps. Use no unrelated third group."
        : preferences.workoutSplit === "Full body"
          ? "Workout split: Full body. Every selected session must include exercises for Chest, Back, and Legs; include other major groups when practical."
          : preferences.workoutSplit === "Upper / Lower"
            ? "Workout split: Upper / Lower. Sort selected weekdays in calendar order and alternate Upper, Lower, Upper, Lower. Upper sessions use upper-body groups only; Lower sessions include Legs and no upper-body groups. Abs may be included on either."
            : "Workout split: Let AI decide. Choose a sensible split for the number of training days and the user's experience level.";
  return [
    "Create a safe, practical strength-only weekly workout template.",
    "Return only JSON with a top-level days array. Each day must have a day string and an exercises array. Each exercise must have a numeric exerciseId, sets, reps, restSeconds, and exerciseOrder.",
    "Include exactly the selected training days, 2-8 distinct catalog exercises per day, and sequential exerciseOrder starting at 1.",
    `The only valid exerciseId values are: ${catalog.map(({ id }) => id).join(", ")}. Copy an ID exactly from this list for every exercise; never invent an ID or exercise.`,
    "Use only supplied catalog exercises and equipment. Do not invent exercises.",
    locationGuidance,
    splitGuidance,
    "Plan the selected training days together. Unless using Full body, avoid repeating a primary muscle group on consecutive selected training days when suitable alternatives exist.",
    "Keep sets 1-6, reps 1-30, restSeconds 0-600; keep each day at 30 sets or fewer and the week at 120 sets or fewer.",
    "Respect limitations conservatively. Do not diagnose or prescribe rehabilitation. If limitations make safe programming unclear, return {\"days\":[]}.",
    `Preferences: ${JSON.stringify(preferences)}`,
    `Strength exercise catalog: ${JSON.stringify(catalog)}`,
  ].join("\n");
}

export async function generateValidatedWorkout(
  preferences: WorkoutPreferences,
  provider: (prompt: string) => Promise<string>,
): Promise<GeneratedWorkout> {
  const eligibleExercises = getEligibleExercisesForPreferences(preferences);
  if (eligibleExercises.length < 2) {
    throw new AiWorkoutValidationError("The selected location has too few catalog exercises");
  }

  const rawResponse = await provider(buildWorkoutPrompt(preferences, eligibleExercises));
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawResponse);
  } catch {
    throw new AiWorkoutInvalidJsonError();
  }
  return validateGeneratedWorkout(parsed, preferences);
}

export async function requireAuthorizedTrainingPlan<T, R>(
  planId: string,
  userId: string,
  getOwnedPlan: (
    planId: string,
    userId: string,
  ) => Promise<{ ok: true; plan: T } | { ok: false; response: R }>,
): Promise<{ ok: true; plan: T } | { ok: false; response: R }> {
  return getOwnedPlan(planId, userId);
}

export interface AiWorkoutTransaction {
  exercise: {
    findMany(args: {
      where: { id: { in: string[] }; visibility: "GLOBAL" };
      select: { id: true };
    }): Promise<{ id: string }[]>;
  };
  programWeek: {
    findMany(args: {
      where: { phase: { trainingPlanId: string; phaseOrder: number } };
      orderBy: { weekNumber: "asc" };
      select: {
        weekNumber: true;
        workoutDays: { select: { id: true; name: true } };
      };
    }): Promise<
      {
        weekNumber: number;
        workoutDays: { id: string; name: string }[];
      }[]
    >;
  };
  programExercise: {
    deleteMany(args: { where: { workoutDayId: { in: string[] } } }): Promise<unknown>;
    createMany(args: {
      data: {
        workoutDayId: string;
        exerciseId: string;
        exerciseOrder: number;
        sets: number;
        minReps: number;
        maxReps: number;
        restSeconds: number;
      }[];
    }): Promise<unknown>;
  };
}

export async function persistGeneratedWorkout(
  tx: AiWorkoutTransaction,
  planId: string,
  totalWeeks: number,
  workout: GeneratedWorkout,
  targetWeekNumber?: number,
) {
  if (
    targetWeekNumber !== undefined &&
    (!Number.isInteger(targetWeekNumber) ||
      targetWeekNumber < 1 ||
      targetWeekNumber > totalWeeks)
  ) {
    throw new Error("Target week must be an integer within the training plan");
  }

  const weeks = await tx.programWeek.findMany({
    where: { phase: { trainingPlanId: planId, phaseOrder: 1 } },
    orderBy: { weekNumber: "asc" },
    select: { weekNumber: true, workoutDays: { select: { id: true, name: true } } },
  });
  if (weeks.length !== totalWeeks) {
    throw new Error("Training plan structure is incomplete");
  }
  const weeksToSave = targetWeekNumber === undefined
    ? weeks
    : weeks.filter(({ weekNumber }) => weekNumber === targetWeekNumber);
  if (weeksToSave.length === 0) {
    throw new Error("Training plan is missing the selected week");
  }

  const dayNames = new Set(workout.days.map(({ day }) => day));
  const weekDayIds = weeksToSave.flatMap((week) =>
    week.workoutDays
      .filter((day) => dayNames.has(day.name as WorkoutDayName))
      .map((day) => day.id),
  );
  if (weekDayIds.length !== weeksToSave.length * dayNames.size) {
    throw new Error("Training plan is missing selected workout days");
  }

  const exerciseIds = [
    ...new Set(
      workout.days.flatMap((day) =>
        day.exercises.map(({ exerciseId }) => String(exerciseId)),
      ),
    ),
  ];
  const persistedExercises = await tx.exercise.findMany({
    where: { id: { in: exerciseIds }, visibility: "GLOBAL" },
    select: { id: true },
  });
  if (persistedExercises.length !== exerciseIds.length) {
    throw new Error("One or more catalog exercises are not seeded");
  }

  const exercisesByDay = new Map(
    workout.days.map(({ day, exercises: dayExercises }) => [day, dayExercises]),
  );
  const rows = weeksToSave.flatMap((week) =>
    week.workoutDays.flatMap((day) =>
      (exercisesByDay.get(day.name as WorkoutDayName) ?? []).map((exercise) => ({
        workoutDayId: day.id,
        exerciseId: String(exercise.exerciseId),
        exerciseOrder: exercise.exerciseOrder,
        sets: exercise.sets,
        minReps: exercise.reps,
        maxReps: exercise.reps,
        restSeconds: exercise.restSeconds,
      })),
    ),
  );

  await tx.programExercise.deleteMany({
    where: { workoutDayId: { in: weekDayIds } },
  });
  await tx.programExercise.createMany({ data: rows });
  return {
    trainingPlanId: planId,
    savedDays: [...dayNames],
    savedWeeks: weeksToSave.length,
    savedWeekNumbers: weeksToSave.map(({ weekNumber }) => weekNumber),
    savedExercises: rows.length,
  };
}

export async function parseBoundedJsonObject(
  request: Request,
  maxBytes = 12_000,
): Promise<Record<string, unknown> | null> {
  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > maxBytes) {
    return null;
  }
  try {
    if (!request.body) {
      return null;
    }
    const reader = request.body.getReader();
    const chunks: Uint8Array[] = [];
    let byteLength = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) {
        break;
      }
      byteLength += value.byteLength;
      if (byteLength > maxBytes) {
        await reader.cancel();
        return null;
      }
      chunks.push(value);
    }
    const bodyBytes = new Uint8Array(byteLength);
    let offset = 0;
    for (const chunk of chunks) {
      bodyBytes.set(chunk, offset);
      offset += chunk.byteLength;
    }
    const text = new TextDecoder().decode(bodyBytes);
    const body: unknown = JSON.parse(text);
    return isRecord(body) ? body : null;
  } catch {
    return null;
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: Record<string, unknown>,
  keys: readonly string[],
) {
  return Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key));
}

function isIntegerInRange(value: unknown, min: number, max: number): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= min && value <= max;
}
