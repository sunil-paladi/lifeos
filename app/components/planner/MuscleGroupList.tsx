"use client";

interface Props {
  selected: string;
  onSelect: (value: string) => void;
}

const muscles = [
  "Chest",
  "Back",
  "Legs",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Abs",
  "Cardio",
];

export default function MuscleGroupList({
  selected,
  onSelect,
}: Props) {
  return (
    <div className="flex flex-wrap gap-3">
      {muscles.map((muscle) => (
        <button
          key={muscle}
          onClick={() => onSelect(muscle)}
          className={`rounded-full px-4 py-2 transition ${
            selected === muscle
              ? "bg-green-600 text-white"
              : "bg-slate-100 hover:bg-slate-200"
          }`}
        >
          {muscle}
        </button>
      ))}
    </div>
  );
}