type StatCardProps = {
  title: string;
  value: number;
  unit: string;
  onIncrease: () => void;
  onDecrease: () => void;
};

export default function StatCard({
  title,
  value,
  unit,
  onIncrease,
  onDecrease,
}: StatCardProps) {
  return (
    <div className="mt-4">
      <h3 className="font-semibold">{title}</h3>

      <div className="mt-2 flex items-center gap-4">
        <button
          onClick={onDecrease}
          className="rounded bg-red-500 px-3 py-1 text-white"
        >
          -
        </button>

        <span className="text-xl font-bold">
          {value} {unit}
        </span>

        <button
          onClick={onIncrease}
          className="rounded bg-green-500 px-3 py-1 text-white"
        >
          +
        </button>
      </div>
    </div>
  );
}