import assert from "node:assert/strict";
import test from "node:test";
import { exercises as exerciseCatalog } from "@/app/data/exercises";
import {
  AiWorkoutConfigurationError,
  AiWorkoutInvalidJsonError,
  AiWorkoutProviderError,
  AiWorkoutValidationError,
  generateValidatedWorkout,
  getGroqConfiguration,
  getGroqProviderErrorDetails,
  GROQ_DEFAULT_MODEL,
  buildWorkoutPrompt,
  getEligibleExercises,
  parseBoundedJsonObject,
  persistGeneratedWorkout,
  requireAuthorizedTrainingPlan,
  validateGeneratedWorkout,
  validateWorkoutPreferences,
} from "./ai-workout";
import {
  isCurrentProgramLoad,
  mapTrainingPlanStructureToWeeks,
  verifySavedWorkoutStructure,
} from "./program-workout-structure";
import { DEFAULT_WORKOUT_TRAINING_DAYS } from "./ai-workout-types";
import type {
  AiWorkoutTransaction,
  GeneratedWorkout,
  WorkoutPreferences,
} from "./ai-workout";

const preferences: WorkoutPreferences = {
  fitnessGoal: "Muscle gain",
  experienceLevel: "Beginner",
  workoutLocation: "Gym",
  availableEquipment: ["Dumbbells", "Bodyweight"],
  trainingDays: ["Monday", "Thursday"],
  limitations: "None",
};

test("requires a Groq API key and applies the documented model default", () => {
  assert.equal(GROQ_DEFAULT_MODEL, "openai/gpt-oss-20b");
  assert.throws(
    () => getGroqConfiguration(undefined, undefined),
    (error: unknown) =>
      error instanceof AiWorkoutConfigurationError &&
      error.message === "GROQ_API_KEY is required to generate workouts",
  );
  assert.throws(
    () => getGroqConfiguration("  ", undefined),
    AiWorkoutConfigurationError,
  );
  assert.deepEqual(getGroqConfiguration(" groq-secret ", undefined), {
    apiKey: "groq-secret",
    model: GROQ_DEFAULT_MODEL,
  });
  assert.deepEqual(getGroqConfiguration("groq-secret", " custom-model "), {
    apiKey: "groq-secret",
    model: "custom-model",
  });
});

test("extracts only safe Groq provider error diagnostics", () => {
  const details = getGroqProviderErrorDetails({
    status: 401,
    code: "invalid_api_key",
    type: "authentication_error",
    message: "sensitive provider response",
    headers: { authorization: "Bearer secret" },
    request: { body: "sensitive workout preferences" },
  });
  assert.deepEqual(details, {
    status: 401,
    code: "invalid_api_key",
    type: "authentication_error",
  });

  assert.deepEqual(
    getGroqProviderErrorDetails({
      status: 5000,
      code: "token value",
      error: { code: "model_not_found", type: "invalid_request_error" },
    }),
    {
      code: "model_not_found",
      type: "invalid_request_error",
      reason: "invalid_request",
    },
  );
  assert.deepEqual(
    getGroqProviderErrorDetails({
      status: 400,
      error: {
        type: "invalid_request_error",
        message: "temperature is not supported with this model",
      },
      message: "Sensitive request details are omitted",
    }),
    {
      status: 400,
      type: "invalid_request_error",
      reason: "unsupported_parameter",
    },
  );
  assert.deepEqual(
    getGroqProviderErrorDetails({
      status: 400,
      error: {
        type: "invalid_request_error",
        message: "response_format json_object is not supported",
      },
    }),
    {
      status: 400,
      type: "invalid_request_error",
      reason: "unsupported_response_format",
    },
  );
  assert.deepEqual(
    getGroqProviderErrorDetails({ code: "gsk_secret_api_key_value" }),
    {},
  );
  assert.deepEqual(getGroqProviderErrorDetails(new Error("provider failure")), {});
});

function validWorkout(): GeneratedWorkout {
  return workoutForMuscleGroups({
    Monday: ["Chest"],
    Thursday: ["Back"],
  });
}

function workoutForMuscleGroups(
  groupsByDay: Record<string, readonly string[]>,
): GeneratedWorkout {
  const usedByGroup = new Map<string, number>();
  return {
    days: Object.entries(groupsByDay).map(([day, groups]) => ({
      day: day as GeneratedWorkout["days"][number]["day"],
      exercises: groups.flatMap((group) => {
        const groupExercises = exerciseCatalog[group];
        assert.ok(groupExercises, `unknown test group ${group}`);
        const offset = usedByGroup.get(group) ?? 0;
        usedByGroup.set(group, offset + 2);
        return groupExercises.slice(offset, offset + 2).map(({ id }, index) => ({
          exerciseId: id,
          sets: 3,
          reps: 8,
          restSeconds: 90,
          exerciseOrder:
            groups.slice(0, groups.indexOf(group)).length * 2 + index + 1,
        }));
      }),
    })),
  };
}

test("accepts bounded preferences and validates a catalog-backed workout", () => {
  assert.deepEqual(validateWorkoutPreferences(preferences), preferences);
  assert.deepEqual(validateGeneratedWorkout(validWorkout(), preferences), validWorkout());
});

test("validates each explicit workout split and rejects mismatched sessions", () => {
  const cases = [
    {
      split: "Single muscle group per day",
      groups: { Monday: ["Chest"], Thursday: ["Back"] },
      invalidGroups: { Monday: ["Chest", "Triceps"], Thursday: ["Back"] },
    },
    {
      split: "Combined muscle groups",
      groups: { Monday: ["Chest", "Triceps"], Thursday: ["Back", "Biceps"] },
      invalidGroups: { Monday: ["Chest", "Legs"], Thursday: ["Back", "Biceps"] },
    },
    {
      split: "Full body",
      groups: {
        Monday: ["Chest", "Back", "Legs"],
        Thursday: ["Chest", "Back", "Legs"],
      },
      invalidGroups: {
        Monday: ["Chest", "Back", "Shoulders"],
        Thursday: ["Chest", "Back", "Legs"],
      },
    },
    {
      split: "Upper / Lower",
      groups: { Monday: ["Chest", "Back"], Thursday: ["Legs", "Abs"] },
      invalidGroups: { Monday: ["Legs"], Thursday: ["Chest", "Back"] },
    },
  ] as const;

  for (const { split, groups, invalidGroups } of cases) {
    const splitPreferences = { ...preferences, workoutSplit: split };
    assert.deepEqual(
      validateGeneratedWorkout(workoutForMuscleGroups(groups), splitPreferences),
      workoutForMuscleGroups(groups),
      `${split} accepts matching sessions`,
    );
    assert.throws(
      () => validateGeneratedWorkout(workoutForMuscleGroups(invalidGroups), splitPreferences),
      AiWorkoutValidationError,
      `${split} rejects mismatched sessions`,
    );
    assert.match(
      buildWorkoutPrompt(splitPreferences, getEligibleExercises(["Bodyweight"])),
      new RegExp(split.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")),
    );
  }
});

test("defaults legacy workout preferences to AI-selected split", () => {
  const parsed = validateWorkoutPreferences(preferences);
  assert.equal(parsed.workoutSplit, undefined);
  assert.match(
    buildWorkoutPrompt(parsed, getEligibleExercises(["Bodyweight"])),
    /Workout split: Let AI decide/,
  );
});

test("defaults generator training days to Monday only", () => {
  assert.deepEqual(DEFAULT_WORKOUT_TRAINING_DAYS, ["Monday"]);
  assert.deepEqual(
    validateWorkoutPreferences({
      ...preferences,
      trainingDays: [...DEFAULT_WORKOUT_TRAINING_DAYS],
    }).trainingDays,
    ["Monday"],
  );
});

test("validates weekly recovery across consecutive selected training days", () => {
  const consecutivePreferences: WorkoutPreferences = {
    ...preferences,
    trainingDays: ["Monday", "Tuesday"],
    workoutSplit: "Combined muscle groups",
  };
  const sensiblePairing = workoutForMuscleGroups({
    Monday: ["Chest", "Triceps"],
    Tuesday: ["Back", "Biceps"],
  });
  assert.deepEqual(
    validateGeneratedWorkout(sensiblePairing, consecutivePreferences),
    sensiblePairing,
  );

  const repeatedGroup = workoutForMuscleGroups({
    Monday: ["Chest", "Triceps"],
    Tuesday: ["Shoulders", "Triceps"],
  });
  assert.throws(
    () => validateGeneratedWorkout(repeatedGroup, consecutivePreferences),
    /Consecutive selected training days must not repeat a primary muscle group/,
  );

  const aiChosenFullBody: WorkoutPreferences = {
    ...consecutivePreferences,
    workoutSplit: "Let AI decide",
  };
  const fullBody = workoutForMuscleGroups({
    Monday: ["Chest", "Back", "Legs"],
    Tuesday: ["Chest", "Back", "Legs"],
  });
  assert.deepEqual(validateGeneratedWorkout(fullBody, aiChosenFullBody), fullBody);
});

test("validates workout location and retains legacy equipment requests", () => {
  const locationPreferences = { ...preferences, availableEquipment: undefined };
  assert.deepEqual(
    validateWorkoutPreferences(locationPreferences),
    locationPreferences,
  );
  assert.equal(
    validateWorkoutPreferences({
      ...preferences,
      workoutLocation: undefined,
    }).workoutLocation,
    undefined,
  );
  assert.throws(
    () => validateWorkoutPreferences({ ...locationPreferences, workoutLocation: "Studio" }),
    /Choose Gym, Home, or Both/,
  );
  assert.throws(
    () => validateWorkoutPreferences({ ...locationPreferences, workoutSplit: "Random" }),
    /Choose a supported workout split/,
  );
  assert.throws(
    () => validateWorkoutPreferences({
      fitnessGoal: preferences.fitnessGoal,
      experienceLevel: preferences.experienceLevel,
      trainingDays: preferences.trainingDays,
      limitations: preferences.limitations,
    }),
    /Choose a workout location/,
  );
});

test("limits Home workouts to bodyweight and clearly prompts with exact catalog IDs", () => {
  const homePreferences = { ...preferences, workoutLocation: "Home" as const };
  const homeCatalog = getEligibleExercises(["Bodyweight"]);
  const prompt = buildWorkoutPrompt(homePreferences, homeCatalog);

  assert.ok(homeCatalog.length >= 2);
  assert.ok(homeCatalog.every(({ equipment }) => equipment === "Bodyweight"));
  assert.match(prompt, /only valid exerciseId values are:/);
  assert.match(prompt, /use bodyweight exercises only because no additional equipment availability has been confirmed/);
  assert.ok(prompt.includes(homeCatalog.map(({ id }) => id).join(", ")));
  assert.ok(!homeCatalog.some(({ id }) => id === 1));
  assert.doesNotMatch(prompt, /"exerciseId"\s*:\s*1\b/);
});

test("rejects malformed AI output and malformed preferences", () => {
  assert.throws(
    () => validateGeneratedWorkout({ days: "Monday" }, preferences),
    AiWorkoutValidationError,
  );
  assert.throws(
    () => validateWorkoutPreferences({ ...preferences, limitations: "x".repeat(501) }),
    AiWorkoutValidationError,
  );
  assert.throws(
    () => validateWorkoutPreferences({ ...preferences, trainingDays: ["Monday", "Monday"] }),
    AiWorkoutValidationError,
  );
});

test("rejects an unknown exercise ID", () => {
  const unknown = validWorkout();
  unknown.days[0].exercises[0].exerciseId = 999_999;
  assert.throws(
    () => validateGeneratedWorkout(unknown, preferences),
    /unknown or unavailable exercise ID/,
  );
});

test("rejects duplicate exercises within or across selected days", () => {
  const withinDayDuplicate = validWorkout();
  withinDayDuplicate.days[0].exercises[1].exerciseId =
    withinDayDuplicate.days[0].exercises[0].exerciseId;
  const duplicate = validWorkout();
  duplicate.days[1].exercises[0].exerciseId = duplicate.days[0].exercises[0].exerciseId;
  assert.throws(
    () => validateGeneratedWorkout(withinDayDuplicate, preferences),
    /duplicate exercise/,
  );
  assert.throws(
    () => validateGeneratedWorkout(duplicate, preferences),
    /duplicate exercise/,
  );
});

test("rejects invalid settings, out-of-order items, and excessive volume", () => {
  const invalidSettings = validWorkout();
  invalidSettings.days[0].exercises[0].reps = 0;
  assert.throws(
    () => validateGeneratedWorkout(invalidSettings, preferences),
    /settings are out of range/,
  );

  const outOfOrder = validWorkout();
  outOfOrder.days[0].exercises[0].exerciseOrder = 2;
  assert.throws(
    () => validateGeneratedWorkout(outOfOrder, preferences),
    /settings are out of range/,
  );

  const oneDayPreferences: WorkoutPreferences = {
    ...preferences,
    trainingDays: ["Monday"],
  };
  const ids = getEligibleExercises(preferences.availableEquipment ?? [])
    .slice(0, 6)
    .map(({ id }) => id);
  const excessive = {
    days: [{
      day: "Monday",
      exercises: ids.map((exerciseId, index) => ({
        exerciseId,
        sets: 6,
        reps: 8,
        restSeconds: 90,
        exerciseOrder: index + 1,
      })),
    }],
  };
  assert.throws(
    () => validateGeneratedWorkout(excessive, oneDayPreferences),
    /daily volume/,
  );
});

test("generates only validated structured output and propagates provider failures", async () => {
  const expected = validWorkout();
  const result = await generateValidatedWorkout(preferences, async () =>
    JSON.stringify(expected),
  );
  assert.deepEqual(result, expected);

  await assert.rejects(
    generateValidatedWorkout(preferences, async () => "{not-json"),
    AiWorkoutInvalidJsonError,
  );
  await assert.rejects(
    generateValidatedWorkout(preferences, async () => {
      throw new Error("provider unavailable");
    }),
    /provider unavailable/,
  );
});

test("classifies provider failures with only safe diagnostics", () => {
  const error = new AiWorkoutProviderError({
    status: 429,
    code: "rate_limit_exceeded",
    type: "request_error",
  });
  assert.equal(error.name, "AiWorkoutProviderError");
  assert.deepEqual(error.diagnostics, {
    status: 429,
    code: "rate_limit_exceeded",
    type: "request_error",
  });
  assert.equal(error.message, "AI workout provider request failed");
});

test("parses bounded JSON request bodies and rejects oversized content", async () => {
  const valid = new Request("https://lifeos.test", {
    method: "POST",
    body: JSON.stringify({ ok: true }),
  });
  assert.deepEqual(await parseBoundedJsonObject(valid), { ok: true });

  const oversized = new Request("https://lifeos.test", {
    method: "POST",
    body: JSON.stringify({ value: "too long" }),
  });
  assert.equal(await parseBoundedJsonObject(oversized, 4), null);
});

test("requires the authenticated user to own an active-membership plan", async () => {
  let received: [string, string] | null = null;
  const plan = { id: "plan-1", ownerId: "user-1" };
  const access = await requireAuthorizedTrainingPlan("plan-1", "user-1", async (planId, userId) => {
      received = [planId, userId];
      return { ok: true as const, plan };
    });
  assert.deepEqual(access, { ok: true, plan });
  assert.deepEqual(received, ["plan-1", "user-1"]);

  const denied = await requireAuthorizedTrainingPlan(
    "other-plan",
    "user-1",
    async () => ({ ok: false as const, response: "forbidden" }),
  );
  assert.deepEqual(denied, { ok: false, response: "forbidden" });
});

test("a failed generated-plan transaction leaves existing records unchanged", async () => {
  const originalRows = [{ workoutDayId: "old-day", exerciseId: "old", exerciseOrder: 1 }];
  let committedRows = [...originalRows];

  const transaction = async <T>(
    operation: (tx: AiWorkoutTransaction) => Promise<T>,
  ) => {
    const stagedRows = [...committedRows];
    const tx: AiWorkoutTransaction = {
      exercise: {
        findMany: async ({ where }) => where.id.in.map((id) => ({ id })),
      },
      programWeek: {
        findMany: async () => [
          {
            weekNumber: 1,
            workoutDays: [
              { id: "w1-mon", name: "Monday" },
              { id: "w1-thu", name: "Thursday" },
            ],
          },
          {
            weekNumber: 2,
            workoutDays: [
              { id: "w2-mon", name: "Monday" },
              { id: "w2-thu", name: "Thursday" },
            ],
          },
        ],
      },
      programExercise: {
        deleteMany: async ({ where }) => {
          const ids = new Set(where.workoutDayId.in);
          for (let index = stagedRows.length - 1; index >= 0; index -= 1) {
            if (ids.has(stagedRows[index].workoutDayId)) {
              stagedRows.splice(index, 1);
            }
          }
        },
        createMany: async () => {
          throw new Error("simulated insert failure");
        },
      },
    };

    const result = await operation(tx);
    committedRows = stagedRows;
    return result;
  };

  await assert.rejects(
    transaction((tx) => persistGeneratedWorkout(tx, "plan-1", 2, validWorkout())),
    /simulated insert failure/,
  );
  assert.deepEqual(committedRows, originalRows);
});

test("persists generated days in planner structure and hydrates workout-card groups", async () => {
  const workout = validWorkout();
  let requestedPlanId = "";
  let createdRows: {
    workoutDayId: string;
    exerciseId: string;
    exerciseOrder: number;
    sets: number;
    minReps: number;
    maxReps: number;
    restSeconds: number;
  }[] = [];
  let deletedWorkoutDayIds: string[] = [];
  const tx: AiWorkoutTransaction = {
    exercise: {
      findMany: async ({ where }) => where.id.in.map((id) => ({ id })),
    },
    programWeek: {
      findMany: async ({ where }) => {
        requestedPlanId = where.phase.trainingPlanId;
        return [1, 2].map((weekNumber) => ({
          weekNumber,
          workoutDays: [
            { id: `w${weekNumber}-mon`, name: "Monday" },
            { id: `w${weekNumber}-thu`, name: "Thursday" },
            { id: `w${weekNumber}-sun`, name: "Sunday" },
          ],
        }));
      },
    },
    programExercise: {
      deleteMany: async ({ where }) => {
        deletedWorkoutDayIds = where.workoutDayId.in;
      },
      createMany: async ({ data }) => {
        createdRows = data;
      },
    },
  };

  const result = await persistGeneratedWorkout(tx, "target-plan", 2, workout);
  assert.equal(requestedPlanId, "target-plan");
  assert.deepEqual(result, {
    trainingPlanId: "target-plan",
    savedDays: ["Monday", "Thursday"],
    savedWeeks: 2,
    savedExercises: 8,
  });
  assert.equal(createdRows.length, 8);
  assert.deepEqual(deletedWorkoutDayIds, [
    "w1-mon",
    "w1-thu",
    "w2-mon",
    "w2-thu",
  ]);
  assert.ok(!deletedWorkoutDayIds.some((dayId) => dayId.endsWith("-sun")));
  assert.ok(createdRows.every(({ workoutDayId }) =>
    workoutDayId.endsWith("-mon") || workoutDayId.endsWith("-thu"),
  ));
  for (const day of workout.days) {
    const expectedRows = day.exercises;
    for (const week of [1, 2]) {
      const savedDayRows = createdRows.filter(
        (row) => row.workoutDayId === `w${week}-${day.day === "Monday" ? "mon" : "thu"}`,
      );
      assert.deepEqual(
        savedDayRows.map(({ exerciseId, sets, minReps, maxReps }) => ({
          exerciseId: Number(exerciseId),
          sets,
          minReps,
          maxReps,
        })),
        expectedRows.map(({ exerciseId, sets, reps }) => ({
          exerciseId,
          sets,
          minReps: reps,
          maxReps: reps,
        })),
      );

    }
  }

  const structure = {
    plan: { id: "target-plan", totalWeeks: 2 },
    phases: [{
      id: "phase-1",
      phaseOrder: 1,
      weeks: [1, 2].map((weekNumber) => ({
        id: `week-${weekNumber}`,
        phaseId: "phase-1",
        weekNumber,
        workoutDays: ["Monday", "Thursday"].map((dayName) => {
          const suffix = dayName === "Monday" ? "mon" : "thu";
          const dayId = `w${weekNumber}-${suffix}`;
          const dayRows = createdRows
            .filter((row) => row.workoutDayId === dayId)
            .map((row) => {
              const exercise = Object.values(exerciseCatalog)
                .flat()
                .find(({ id }) => id === Number(row.exerciseId));
              assert.ok(exercise);
              return {
                ...row,
                exercise: {
                  id: row.exerciseId,
                  primaryMuscle: exercise.primaryMuscle,
                },
              };
            });
          return {
            id: dayId,
            weekId: `week-${weekNumber}`,
            name: dayName,
            programExercises: dayRows,
          };
        }),
      })),
    }],
  };
  const verified = verifySavedWorkoutStructure(
    structure,
    "target-plan",
    workout,
    2,
  );
  const plannerState = mapTrainingPlanStructureToWeeks(
    verified.phases,
    verified.plan.totalWeeks,
  );
  assert.equal(plannerState.hasExercises, true);
  for (const day of workout.days) {
    const cardGroups = plannerState.weeks[0][day.day];
    assert.ok(cardGroups.length > 0, `${day.day} should render muscle groups`);
    assert.deepEqual(
      cardGroups.flatMap(({ exercises: groupedExercises }) =>
        groupedExercises.map(({ id, sets, reps }) => ({ id, sets, reps })),
      ),
      day.exercises.map(({ exerciseId, sets, reps }) => ({ id: exerciseId, sets, reps })),
    );
  }
});

test("does not allow a stale initial structure load to overwrite a newer refresh", () => {
  const initialLoadVersion = 1;
  const postSaveRefreshVersion = 2;

  assert.equal(
    isCurrentProgramLoad(initialLoadVersion, postSaveRefreshVersion),
    false,
  );
  assert.equal(
    isCurrentProgramLoad(postSaveRefreshVersion, postSaveRefreshVersion),
    true,
  );
});
