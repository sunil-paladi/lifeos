import assert from "node:assert/strict";
import test from "node:test";

import type { DayWorkout } from "@/app/context/ProgramContext";
import {
  copyWorkoutWeek,
  isWorkoutWeekEmpty,
  parseStoredProgram,
  serializeStoredProgram,
} from "@/app/lib/program-builder-state";

function emptyWeek(): DayWorkout {
  return {
    Monday: [],
    Tuesday: [],
    Wednesday: [],
    Thursday: [],
    Friday: [],
    Saturday: [],
    Sunday: [],
  };
}

test("persists and restores the selected program duration", () => {
  const weeks = Array.from({ length: 12 }, emptyWeek);
  const saved = serializeStoredProgram(weeks, 4);
  const restored = parseStoredProgram(saved, 12);

  assert.equal(restored?.durationWeeks, 4);
  assert.equal(restored?.weeks.length, 12);
});

test("supports older saved programs without an explicit duration", () => {
  const restored = parseStoredProgram(
    JSON.stringify({ weeks: Array.from({ length: 6 }, emptyWeek) }),
    12,
  );

  assert.equal(restored?.durationWeeks, 6);
});

test("returns null for malformed saved program JSON without throwing", () => {
  assert.doesNotThrow(() => {
    assert.equal(parseStoredProgram("{invalid json", 12), null);
  });
});

test("copies all workout settings into independent week data", () => {
  const source = emptyWeek();
  source.Monday.push({
    id: 1,
    name: "Chest",
    exercises: [
      { id: 101, type: "strength", sets: 4, reps: 8, rest: 90 },
      { id: 102, type: "cardio", duration: 20, rest: 0 },
    ],
  });
  source.Friday.push({
    id: 2,
    name: "Back",
    exercises: [{ id: 201, type: "strength", sets: 3, reps: 12, rest: 60 }],
  });

  const copied = copyWorkoutWeek(source);

  assert.deepEqual(copied, source);
  assert.notStrictEqual(copied, source);
  assert.notStrictEqual(copied.Monday, source.Monday);
  assert.notStrictEqual(copied.Monday[0], source.Monday[0]);
  assert.notStrictEqual(
    copied.Monday[0].exercises[0],
    source.Monday[0].exercises[0],
  );
  copied.Monday[0].exercises[0].sets = 5;
  copied.Monday[0].name = "Changed copy";
  assert.equal(source.Monday[0].exercises[0].sets, 4);
  assert.equal(source.Monday[0].name, "Chest");
  assert.equal(isWorkoutWeekEmpty(copied), false);
  assert.equal(isWorkoutWeekEmpty(emptyWeek()), true);
});

test("does not copy runtime completion flags with a week", () => {
  const source = emptyWeek();
  const muscle = {
    id: 1,
    name: "Chest",
    exercises: [{ id: 101, sets: 3, reps: 10, rest: 60 }],
    completed: true,
  };
  source.Monday.push(muscle);

  const copied = copyWorkoutWeek(source);

  assert.equal("completed" in copied.Monday[0], false);
  assert.equal(
    "completed" in copied.Monday[0].exercises[0],
    false,
  );
});
