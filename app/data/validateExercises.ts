import { exercises } from "./exercises";

const requiredFields = [
  "id",
  "bodyPart",
  "name",
  "image",
  "primaryMuscle",
  "secondaryMuscles",
  "equipment",
  "difficulty",
  "sets",
  "reps",
  "completed",
  "instructions",
];

export function validateExerciseDatabase() {
  const errors: string[] = [];
  const ids = new Set<number>();

  Object.entries(exercises).forEach(([category, exerciseList]) => {
    if (exerciseList.length === 0) {
      errors.push(`${category}: No exercises found`);
    }

    exerciseList.forEach((exercise) => {
      // Check duplicate ID
      if (ids.has(exercise.id)) {
        errors.push(
          `Duplicate exercise ID: ${exercise.id}`
        );
      }

      ids.add(exercise.id);

      // Check required fields
      requiredFields.forEach((field) => {
        const value =
          exercise[field as keyof typeof exercise];

        if (
          value === undefined ||
          value === null ||
          value === ""
        ) {
          errors.push(
            `${exercise.name}: Missing ${field}`
          );
        }
      });

      // Check sets
      if (
        exercise.sets !== undefined &&
        exercise.sets <= 0
      ) {
        errors.push(
          `${exercise.name}: Invalid sets`
        );
      }

      // Check reps
      if (
        exercise.reps !== undefined &&
        exercise.reps <= 0
      ) {
        errors.push(
          `${exercise.name}: Invalid reps`
        );
      }

      // Check instructions
      if (
        !Array.isArray(exercise.instructions) ||
        exercise.instructions.length === 0
      ) {
        errors.push(
          `${exercise.name}: Missing instructions`
        );
      }

      // Check secondary muscles
      if (!Array.isArray(exercise.secondaryMuscles)) {
        errors.push(
          `${exercise.name}: Invalid secondaryMuscles`
        );
      }
    });
  });

  return {
    valid: errors.length === 0,
    errors,
  };
}
