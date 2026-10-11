import assert from "node:assert/strict";
import test from "node:test";
import {
  averageRecorded,
  calculateHabitAdherence,
  calculateNutritionAdherence,
  calculateWorkoutMetrics,
  compareMetricPeriods,
} from "./metrics";

test("keeps missing averages distinct from recorded zero", () => {
  assert.equal(averageRecorded([null, null]), null);
  assert.equal(averageRecorded([null, 0]), 0);
  assert.equal(averageRecorded([0, 50]), 25);
});

test("habit adherence is unavailable without a recorded schedule", () => {
  assert.equal(calculateHabitAdherence(0, 0).percentage, null);
  assert.equal(calculateHabitAdherence(0, 3, false).percentage, null);
  assert.equal(calculateHabitAdherence(0, 3).percentage, 0);
  assert.equal(calculateHabitAdherence(2, 4).percentage, 50);
});

test("workout completion is missing without sets and zero when sets are uncompleted", () => {
  assert.equal(calculateWorkoutMetrics([]).completionPercentage, null);
  assert.equal(
    calculateWorkoutMetrics([{ completed: false }]).completionPercentage,
    0,
  );

  assert.deepEqual(
    calculateWorkoutMetrics([
      { completed: true, weight: "10", reps: "5" },
      { completed: false, weight: "20", reps: "5" },
    ]),
    {
      completedSets: 1,
      totalSets: 2,
      completionPercentage: 50,
      weightedVolume: 50,
      weightedSets: 1,
    },
  );
  assert.equal(
    calculateWorkoutMetrics([{ completed: true }]).weightedVolume,
    null,
  );
});

test("nutrition distinguishes unrecorded intake from a tracked zero intake", () => {
  const targets = { calories: 100, protein: 100, carbs: 100, fat: 100 };

  assert.equal(calculateNutritionAdherence([], targets, false), null);
  assert.deepEqual(calculateNutritionAdherence([], targets, true), {
    intake: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    percentages: { calories: 0, protein: 0, carbs: 0, fat: 0 },
    averagePercentage: 0,
  });
  assert.equal(calculateNutritionAdherence([], null, true), null);
  assert.equal(
    calculateNutritionAdherence([], { ...targets, calories: 0 }, true),
    null,
  );
});

test("compares equal-period metric values and suppresses undefined percentages", () => {
  assert.deepEqual(compareMetricPeriods(15, 10), {
    current: 15,
    previous: 10,
    absoluteChange: 5,
    percentageChange: 50,
  });
  assert.equal(compareMetricPeriods(5, 0).percentageChange, null);
  assert.equal(compareMetricPeriods(5, null).absoluteChange, null);
});
