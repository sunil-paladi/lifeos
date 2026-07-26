type StatCardProps = {
  title: string;
  value: string | number;
  unit?: string;
  icon: string;
};

export default function StatCard({
  title,
  value,
  unit,
  icon,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-2xl shadow-md hover:shadow-xl transition-all duration-300 p-6">

      <div className="flex items-center justify-between">

        <div>

          <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">
            {title}
          </p>

          <h2 className="text-4xl font-bold mt-3 text-gray-800">
            {value}

            {unit && (
              <span className="text-lg text-gray-500 ml-2">
                {unit}
              </span>
            )}

          </h2>

        </div>

        <div className="text-5xl">
          {icon}
        </div>

      </div>

    </div>
  );
}