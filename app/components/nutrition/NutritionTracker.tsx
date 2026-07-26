"use client";

export default function NutritionTracker() {
  const nutrition = {
    calories: { current: 1800, target: 2300 },
    protein: { current: 110, target: 150 },
    carbs: { current: 170, target: 250 },
    fat: { current: 45, target: 70 },
  };

  const ProgressBar = ({
    current,
    target,
  }: {
    current: number;
    target: number;
  }) => {
    const percentage = Math.min((current / target) * 100, 100);

    return (
      <div className="w-full bg-gray-200 rounded-full h-3 mt-2">
        <div
          className="bg-green-500 h-3 rounded-full transition-all"
          style={{ width: `${percentage}%` }}
        />
      </div>
    );
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-8">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-2xl font-bold">🍽 Today's Nutrition</h2>
          <p className="text-gray-500">
            Track your daily calories and macros
          </p>
        </div>

        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          + Add Meal
        </button>
      </div>

      <div className="space-y-6">
        <div>
          <div className="flex justify-between">
            <span>Calories</span>
            <span>
              {nutrition.calories.current} / {nutrition.calories.target} kcal
            </span>
          </div>
          <ProgressBar
            current={nutrition.calories.current}
            target={nutrition.calories.target}
          />
        </div>

        <div>
          <div className="flex justify-between">
            <span>Protein</span>
            <span>
              {nutrition.protein.current} / {nutrition.protein.target} g
            </span>
          </div>
          <ProgressBar
            current={nutrition.protein.current}
            target={nutrition.protein.target}
          />
        </div>

        <div>
          <div className="flex justify-between">
            <span>Carbohydrates</span>
            <span>
              {nutrition.carbs.current} / {nutrition.carbs.target} g
            </span>
          </div>
          <ProgressBar
            current={nutrition.carbs.current}
            target={nutrition.carbs.target}
          />
        </div>

        <div>
          <div className="flex justify-between">
            <span>Fat</span>
            <span>
              {nutrition.fat.current} / {nutrition.fat.target} g
            </span>
          </div>
          <ProgressBar
            current={nutrition.fat.current}
            target={nutrition.fat.target}
          />
        </div>
      </div>
    </div>
  );
}