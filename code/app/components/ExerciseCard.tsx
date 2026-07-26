type ExerciseCardProps = {
  exercise: {
    id: number;
    name: string;
    completed: boolean;
  };
  toggleExercise: (id: number) => void;
};

export default function ExerciseCard({
  exercise,
  toggleExercise,
}: ExerciseCardProps) {
  return (
    <li className="rounded-lg border p-3 shadow-sm">
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={exercise.completed}
          onChange={() => toggleExercise(exercise.id)}
        />

        <span
          className={
            exercise.completed
              ? "line-through text-gray-500"
              : "font-medium"
          }
        >
          {exercise.name}
        </span>
      </label>
    </li>
  );
}