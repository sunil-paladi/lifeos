import { Exercise } from "../types/exercise";
type Props = {
  exercise: Exercise;
};

export default function ExerciseDetails({ exercise }: Props) {
  return (
    <div className="mt-6 rounded-xl border bg-white p-5 shadow">

      <h2 className="text-2xl font-bold">
        {exercise.name}
      </h2>

      <div className="mt-4 space-y-2">

        <p><strong>🎯 Primary Muscle:</strong> {exercise.primaryMuscle}</p>

        <p>
          <strong>💪 Secondary Muscles:</strong>{" "}
          {exercise.secondaryMuscles.join(", ")}
        </p>

        <p><strong>🏋️ Equipment:</strong> {exercise.equipment}</p>

        <p><strong>⭐ Difficulty:</strong> {exercise.difficulty}</p>

        <p><strong>Sets:</strong> {exercise.sets}</p>

        <p><strong>Reps:</strong> {exercise.reps}</p>

      </div>

      <h3 className="mt-5 text-lg font-semibold">
        Instructions
      </h3>

      <ol className="mt-2 list-decimal pl-5">
        {exercise.instructions.map((step, index) => (
          <li key={index}>{step}</li>
        ))}
      </ol>

    </div>
  );
}