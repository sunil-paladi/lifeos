import { exercises } from "./exercises";
import { validateExerciseDatabase } from "./validateExercises";

const result = validateExerciseDatabase();

console.log("Exercise Database");
console.log("=================");

Object.entries(exercises).forEach(
  ([category, list]) => {
    console.log(
      `${category}: ${list.length} exercises`
    );
  }
);

console.log("=================");

if (result.valid) {
  console.log("✅ Exercise database is valid");
} else {
  console.error("❌ Database errors:");

  result.errors.forEach((error) => {
    console.error(error);
  });
}