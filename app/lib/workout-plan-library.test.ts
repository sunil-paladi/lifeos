import assert from "node:assert/strict";
import test from "node:test";
import { exercises as catalog } from "@/app/data/exercises";
import {
  filterWorkoutPlans,
  getWorkoutPlanById,
  getWorkoutPlanLibrary,
} from "./workout-plan-library";
import {
  EXPERIENCE_LEVELS,
  FITNESS_GOALS,
  WORKOUT_LOCATIONS,
} from "./ai-workout-types";
import { persistGeneratedWorkout } from "./ai-workout";
import type { AiWorkoutTransaction } from "./ai-workout";

test("provides approved seed plans using only valid, saveable catalog exercises", () => {
  const plans = getWorkoutPlanLibrary();

  assert.deepEqual(
    plans.map(({ id }) => id),
    [
      "beginner-full-body",
      "upper-lower",
      "push-pull-legs",
      "combined-muscle-groups",
      "home-bodyweight",
      "upper-lower-five-day",
      "push-pull-legs-five-day",
      "push-pull-legs-six-day",
      "body-part-split-five-day",
      "body-part-split-six-day",
      "home-dumbbell-bodyweight-five-day",
    ],
  );

  const catalogIds = new Set(Object.values(catalog).flat().map(({ id }) => id));
  for (const plan of plans) {
    assert.equal(plan.days.length, plan.workout.days.length);
    assert.ok(plan.days.every(({ exercises }) =>
      exercises.length >= 2 && exercises.length <= 8,
    ));
    for (const day of plan.days) {
      assert.deepEqual(
        day.exercises.map(({ exerciseOrder }) => exerciseOrder),
        day.exercises.map((_, index) => index + 1),
      );
      assert.ok(day.exercises.every(({ exerciseId, name, sets, reps, restSeconds }) =>
        catalogIds.has(exerciseId) && name.length > 0 &&
        sets >= 1 && sets <= 6 && reps >= 1 && reps <= 30 &&
        restSeconds >= 0 && restSeconds <= 600,
      ));
    }
  }
});

test("provides filter metadata that matches each plan's actual schedule", () => {
  const plans = getWorkoutPlanLibrary();
  for (const plan of plans) {
    assert.ok(FITNESS_GOALS.includes(plan.goal));
    assert.ok(plan.experienceLevels.length > 0);
    assert.ok(plan.experienceLevels.every((level) => EXPERIENCE_LEVELS.includes(level)));
    assert.ok(WORKOUT_LOCATIONS.includes(plan.location));
    assert.equal(plan.daysPerWeek, plan.days.length);
    assert.equal(plan.daysPerWeek, plan.workout.days.length);
  }

  assert.deepEqual(
    plans.filter(({ daysPerWeek }) => daysPerWeek === 5).map(({ id }) => id),
    [
      "upper-lower-five-day",
      "push-pull-legs-five-day",
      "body-part-split-five-day",
      "home-dumbbell-bodyweight-five-day",
    ],
  );
  assert.deepEqual(
    plans.filter(({ daysPerWeek }) => daysPerWeek === 6).map(({ id }) => id),
    ["push-pull-legs-six-day", "body-part-split-six-day"],
  );
});

test("filters plans by goal, experience, location, and actual days per week", () => {
  const plans = getWorkoutPlanLibrary();

  assert.deepEqual(
    filterWorkoutPlans(plans, { goal: "General fitness" }).map(({ id }) => id),
    ["beginner-full-body", "home-bodyweight", "home-dumbbell-bodyweight-five-day"],
  );
  assert.deepEqual(
    filterWorkoutPlans(plans, { experienceLevel: "Advanced" }).map(({ id }) => id),
    ["push-pull-legs-six-day", "body-part-split-six-day"],
  );
  assert.deepEqual(
    filterWorkoutPlans(plans, { location: "Home" }).map(({ id }) => id),
    ["home-bodyweight", "home-dumbbell-bodyweight-five-day"],
  );
  assert.deepEqual(
    filterWorkoutPlans(plans, { daysPerWeek: 6 }).map(({ id }) => id),
    ["push-pull-legs-six-day", "body-part-split-six-day"],
  );
  assert.deepEqual(
    filterWorkoutPlans(plans, {
      goal: "Muscle gain",
      experienceLevel: "Intermediate",
      location: "Gym",
      daysPerWeek: 5,
    }).map(({ id }) => id),
    ["upper-lower-five-day", "push-pull-legs-five-day", "body-part-split-five-day"],
  );
});

test("home bodyweight plan is restricted to bodyweight catalog entries", () => {
  const plan = getWorkoutPlanById("home-bodyweight");
  assert.ok(plan);

  const catalogById = new Map(Object.values(catalog).flat().map((exercise) => [
    exercise.id,
    exercise,
  ]));
  assert.ok(plan.workout.days.flatMap(({ exercises }) => exercises).every(({ exerciseId }) =>
    catalogById.get(exerciseId)?.equipment === "Bodyweight",
  ));
});

test("five-day home plan uses only cataloged home-friendly equipment", () => {
  const plan = getWorkoutPlanById("home-dumbbell-bodyweight-five-day");
  assert.ok(plan);

  const catalogById = new Map(Object.values(catalog).flat().map((exercise) => [
    exercise.id,
    exercise,
  ]));
  const homeEquipment = new Set(["Bodyweight", "Dumbbell", "Dumbbells"]);
  assert.ok(plan.workout.days.flatMap(({ exercises }) => exercises).every(({ exerciseId }) =>
    homeEquipment.has(catalogById.get(exerciseId)?.equipment ?? ""),
  ));
});

test("five- and six-day additions use distinct exercises and balanced split days", () => {
  const plans = getWorkoutPlanLibrary().filter(({ daysPerWeek }) =>
    daysPerWeek === 5 || daysPerWeek === 6,
  );
  const catalogById = new Map(Object.values(catalog).flat().map((exercise) => [
    exercise.id,
    exercise,
  ]));

  for (const plan of plans) {
    const ids = plan.workout.days.flatMap(({ exercises }) =>
      exercises.map(({ exerciseId }) => exerciseId),
    );
    assert.equal(new Set(ids).size, ids.length, `${plan.id} should not repeat exercises`);
  }

  const pushPullLegs = getWorkoutPlanById("push-pull-legs-six-day");
  assert.ok(pushPullLegs);
  const majorGroupsByDay = pushPullLegs.days.map(({ exercises }) => {
    const groups = new Set(exercises.map(({ exerciseId }) =>
      catalogById.get(exerciseId)?.bodyPart,
    ));
    return ["Chest", "Back", "Legs"].filter((group) => groups.has(group));
  });
  assert.deepEqual(majorGroupsByDay, [
    ["Chest"],
    ["Back"],
    ["Legs"],
    ["Chest"],
    ["Back"],
    ["Legs"],
  ]);
});

test("unknown workout plan ids are not selectable", () => {
  assert.equal(getWorkoutPlanById("unapproved-plan"), undefined);
});

test("applying a library plan replaces only its scheduled weekdays", async () => {
  const plan = getWorkoutPlanById("push-pull-legs-six-day");
  assert.ok(plan);

  let deletedDayIds: string[] = [];
  let createdRows: { workoutDayId: string; exerciseId: string }[] = [];
  const tx: AiWorkoutTransaction = {
    exercise: {
      findMany: async ({ where }) => where.id.in.map((id) => ({ id })),
    },
    programWeek: {
      findMany: async () => [{
        weekNumber: 1,
        workoutDays: [
          { id: "monday", name: "Monday" },
          { id: "tuesday", name: "Tuesday" },
          { id: "wednesday", name: "Wednesday" },
          { id: "thursday", name: "Thursday" },
          { id: "friday", name: "Friday" },
          { id: "saturday", name: "Saturday" },
          { id: "sunday", name: "Sunday" },
        ],
      }],
    },
    programExercise: {
      deleteMany: async ({ where }) => {
        deletedDayIds = where.workoutDayId.in;
      },
      createMany: async ({ data }) => {
        createdRows = data.map(({ workoutDayId, exerciseId }) => ({
          workoutDayId,
          exerciseId,
        }));
      },
    },
  };

  const result = await persistGeneratedWorkout(tx, "plan-1", 1, plan.workout);
  assert.deepEqual(result.savedDays, ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"]);
  assert.deepEqual(deletedDayIds, ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday"]);
  assert.equal(
    createdRows.length,
    plan.workout.days.reduce((count, day) => count + day.exercises.length, 0),
  );
  assert.ok(createdRows.every(({ workoutDayId }) => deletedDayIds.includes(workoutDayId)));
  assert.ok(!["sunday"].some((dayId) =>
    deletedDayIds.includes(dayId),
  ));
});
