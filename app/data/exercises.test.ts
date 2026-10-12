import assert from "node:assert/strict";
import test from "node:test";
import { exercises } from "./exercises";
import { validateExerciseDatabase } from "./validateExercises";

const allExercises = Object.values(exercises).flat();

test("exercise catalog has valid fields and unique IDs and names", () => {
  const result = validateExerciseDatabase();

  assert.equal(result.valid, true, result.errors.join("\n"));
  assert.ok(allExercises.length >= 30);
});

test("Lat Pulldown is a selectable back strength exercise with usable instructions", () => {
  const latPulldown = allExercises.find(
    (exercise) => exercise.name === "Lat Pulldown",
  );

  assert.ok(latPulldown);
  assert.equal(latPulldown.id, 101);
  assert.equal(latPulldown.bodyPart, "Back");
  assert.equal(latPulldown.primaryMuscle, "Lats");
  assert.equal(latPulldown.equipment, "Cable Machine");
  assert.notEqual(latPulldown.type, "cardio");
  assert.ok((latPulldown.sets ?? 0) > 0);
  assert.ok((latPulldown.reps ?? 0) > 0);
  assert.ok(latPulldown.instructions.length > 0);
  assert.ok(latPulldown.image.startsWith("/"));
});

test("exercise image and stable numeric IDs remain available for workout history", () => {
  const latPulldown = exercises.Back.find(
    (exercise) => exercise.id === 101,
  );

  assert.ok(latPulldown);
  assert.equal(latPulldown.name, "Lat Pulldown");
});
