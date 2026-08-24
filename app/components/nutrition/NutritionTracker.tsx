"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Meal = {
  id: number;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

type MealForm = {
  name: string;
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

type NutritionDay = {
  date: string;
  meals: Meal[];
};

const EMPTY_FORM: MealForm = {
  name: "",
  calories: "",
  protein: "",
  carbs: "",
  fat: "",
};

const INITIAL_MEALS: Meal[] = [
  {
    id: 1,
    name: "Breakfast",
    calories: 500,
    protein: 25,
    carbs: 60,
    fat: 15,
  },
  {
    id: 2,
    name: "Lunch",
    calories: 700,
    protein: 45,
    carbs: 70,
    fat: 18,
  },
  {
    id: 3,
    name: "Snacks",
    calories: 600,
    protein: 40,
    carbs: 40,
    fat: 12,
  },
];

type NutritionTargets = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};

const DEFAULT_TARGETS: NutritionTargets = {
  calories: 2300,
  protein: 150,
  carbs: 250,
  fat: 70,
};

const STORAGE_KEY = "lifeos-todays-meals";
const NUTRITION_HISTORY_KEY = "lifeos-nutrition-history";
const NUTRITION_TARGETS_KEY = "lifeos-nutrition-targets";

export default function NutritionTracker() {
  // Start with the same data on server and browser to avoid a hydration mismatch.
  const [meals, setMeals] = useState<Meal[]>(INITIAL_MEALS);
  const [mealsLoaded, setMealsLoaded] = useState(false);
  const [nutritionHistory, setNutritionHistory] =
    useState<NutritionDay[]>([]);
  const [nutritionHistoryLoaded, setNutritionHistoryLoaded] =
    useState(false);
  const [nutritionTracked, setNutritionTracked] =
    useState(false);

  const [targets, setTargets] =
    useState<NutritionTargets>(DEFAULT_TARGETS);

  const [targetsLoaded, setTargetsLoaded] =
    useState(false);

  const [showGoals, setShowGoals] =
    useState(false);

  const [goalsForm, setGoalsForm] =
    useState<NutritionTargets>(DEFAULT_TARGETS);

  const [goalsError, setGoalsError] =
    useState("");

  // Load saved meals only after the component has mounted in the browser.
  useEffect(() => {
    try {
      const savedMeals = localStorage.getItem(STORAGE_KEY);

      if (savedMeals) {
        const parsedMeals = JSON.parse(savedMeals);

        if (Array.isArray(parsedMeals)) {
          setMeals(parsedMeals);
          setNutritionTracked(true);
        }
      }

      const savedTargets = localStorage.getItem(
        NUTRITION_TARGETS_KEY
      );

      if (savedTargets) {
        const parsedTargets =
          JSON.parse(savedTargets);

        if (
          parsedTargets &&
          typeof parsedTargets === "object"
        ) {
          const loadedTargets: NutritionTargets = {
            calories: Number(parsedTargets.calories),
            protein: Number(parsedTargets.protein),
            carbs: Number(parsedTargets.carbs),
            fat: Number(parsedTargets.fat),
          };

          if (
            Object.values(loadedTargets).every(
              (value) =>
                Number.isFinite(value) &&
                value > 0
            )
          ) {
            setTargets(loadedTargets);
            setGoalsForm(loadedTargets);
          }
        }
      }

      const savedHistory = localStorage.getItem(
        NUTRITION_HISTORY_KEY
      );

      if (savedHistory) {
        const parsedHistory = JSON.parse(savedHistory);

        if (Array.isArray(parsedHistory)) {
          setNutritionHistory(parsedHistory);
        }
      }
    } catch (error) {
      console.error("Failed to load meals:", error);
    } finally {
      setMealsLoaded(true);
      setNutritionHistoryLoaded(true);
      setTargetsLoaded(true);
    }
  }, []);

  // Save changes only after the initial localStorage load is complete.
  useEffect(() => {
    if (!mealsLoaded) {
      return;
    }

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(meals)
      );
    } catch (error) {
      console.error("Failed to save meals:", error);
    }
  }, [meals, mealsLoaded]);

  /* =========================================================
     SAVE TODAY'S NUTRITION TO ANALYTICS HISTORY
  ========================================================= */

  function saveNutritionHistoryForToday(
    updatedMeals: Meal[]
  ) {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    setNutritionTracked(true);

    setNutritionHistory((previousHistory) => {
      const existingDay = previousHistory.find(
        (item) => item.date === today
      );

      const updatedDay: NutritionDay = {
        date: today,
        meals: updatedMeals,
      };

      const updatedHistory = existingDay
        ? previousHistory.map((item) =>
            item.date === today
              ? updatedDay
              : item
          )
        : [...previousHistory, updatedDay];

      try {
        localStorage.setItem(
          NUTRITION_HISTORY_KEY,
          JSON.stringify(updatedHistory)
        );
      } catch (error) {
        console.error(
          "Failed to save nutrition history:",
          error
        );
      }

      return updatedHistory;
    });
  }

  useEffect(() => {
    if (
      !mealsLoaded ||
      !nutritionHistoryLoaded ||
      !nutritionTracked
    ) {
      return;
    }

    const today = new Date()
      .toISOString()
      .split("T")[0];

    const hasToday = nutritionHistory.some(
      (item) => item.date === today
    );

    if (!hasToday) {
      const todayEntry: NutritionDay = {
        date: today,
        meals,
      };

      const updatedHistory = [
        ...nutritionHistory,
        todayEntry,
      ];

      setNutritionHistory(updatedHistory);

      try {
        localStorage.setItem(
          NUTRITION_HISTORY_KEY,
          JSON.stringify(updatedHistory)
        );
      } catch (error) {
        console.error(
          "Failed to initialize nutrition history:",
          error
        );
      }
    }
  }, [
    mealsLoaded,
    nutritionHistoryLoaded,
    nutritionTracked,
    nutritionHistory,
    meals,
  ]);

  /* =========================================================
     MEAL MODAL
  ========================================================= */

  const [showMealModal, setShowMealModal] =
    useState(false);

  const [editingMealId, setEditingMealId] =
    useState<number | null>(null);

  const [mealForm, setMealForm] =
    useState<MealForm>(EMPTY_FORM);

  const [error, setError] = useState("");

  /* =========================================================
     ADD MEAL MODE
  ========================================================= */

  const [addMealMode, setAddMealMode] = useState<
    "choice" | "manual" | "photo"
  >("choice");

  /* =========================================================
     PHOTO ANALYSIS
  ========================================================= */

  const [foodPhoto, setFoodPhoto] =
    useState<string | null>(null);

  const [foodWeight, setFoodWeight] =
    useState("");

  const [photoError, setPhotoError] =
    useState("");

  const [isAnalyzing, setIsAnalyzing] =
    useState(false);

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  /* =========================================================
     CALCULATE TOTAL NUTRITION
  ========================================================= */

  const nutrition = useMemo(() => {
    return meals.reduce(
      (total, meal) => ({
        calories:
          total.calories + meal.calories,

        protein:
          total.protein + meal.protein,

        carbs:
          total.carbs + meal.carbs,

        fat:
          total.fat + meal.fat,
      }),
      {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
      }
    );
  }, [meals]);

  /* =========================================================
     HELPERS
  ========================================================= */

  function getPercentage(
    current: number,
    target: number
  ) {
    if (target <= 0) return 0;

    return Math.min(
      Math.round((current / target) * 100),
      100
    );
  }

  function getRemaining(
    current: number,
    target: number
  ) {
    return Math.max(
      target - current,
      0
    );
  }

  /* =========================================================
     OPEN ADD MEAL
  ========================================================= */

  function openAddMeal() {
    setEditingMealId(null);
    setMealForm(EMPTY_FORM);
    setError("");

    setFoodPhoto(null);
    setFoodWeight("");
    setPhotoError("");
    setIsAnalyzing(false);

    setAddMealMode("choice");
    setShowMealModal(true);
  }

  /* =========================================================
     OPEN EDIT MEAL
  ========================================================= */

  function openEditMeal(meal: Meal) {
    setEditingMealId(meal.id);

    setMealForm({
      name: meal.name,
      calories: String(meal.calories),
      protein: String(meal.protein),
      carbs: String(meal.carbs),
      fat: String(meal.fat),
    });

    setError("");

    setFoodPhoto(null);
    setFoodWeight("");
    setPhotoError("");

    setAddMealMode("manual");
    setShowMealModal(true);
  }

  /* =========================================================
     CLOSE MODAL
  ========================================================= */

  function closeMealModal() {
    setShowMealModal(false);

    setEditingMealId(null);

    setMealForm(EMPTY_FORM);

    setError("");

    setFoodPhoto(null);

    setFoodWeight("");

    setPhotoError("");

    setIsAnalyzing(false);

    setAddMealMode("choice");
  }

  /* =========================================================
     UPDATE MANUAL FORM
  ========================================================= */

  function updateForm(
    field: keyof MealForm,
    value: string
  ) {
    setMealForm((prev) => ({
      ...prev,
      [field]: value,
    }));

    setError("");
  }

  /* =========================================================
     SAVE / UPDATE MANUAL MEAL
  ========================================================= */

  function handleSaveMeal() {
    const name =
      mealForm.name.trim();

    if (!name) {
      setError(
        "Please enter a meal name."
      );

      return;
    }

    const calories =
      Number(mealForm.calories);

    const protein =
      Number(mealForm.protein);

    const carbs =
      Number(mealForm.carbs);

    const fat =
      Number(mealForm.fat);

    if (
      !Number.isFinite(calories) ||
      !Number.isFinite(protein) ||
      !Number.isFinite(carbs) ||
      !Number.isFinite(fat)
    ) {
      setError(
        "Please enter valid nutrition values."
      );

      return;
    }

    if (
      calories < 0 ||
      protein < 0 ||
      carbs < 0 ||
      fat < 0
    ) {
      setError(
        "Nutrition values cannot be negative."
      );

      return;
    }

    const mealData = {
      name,
      calories,
      protein,
      carbs,
      fat,
    };

    /* EDIT */

    if (editingMealId !== null) {
      const updatedMeals = meals.map((meal) =>
        meal.id === editingMealId
          ? {
              ...meal,
              ...mealData,
            }
          : meal
      );

      setMeals(updatedMeals);
      saveNutritionHistoryForToday(
        updatedMeals
      );
    }

    /* ADD */

    else {
      const newMeal: Meal = {
        id: Date.now(),
        ...mealData,
      };

      const updatedMeals = [
        ...meals,
        newMeal,
      ];

      setMeals(updatedMeals);
      saveNutritionHistoryForToday(
        updatedMeals
      );
    }

    closeMealModal();
  }

  /* =========================================================
     DELETE MEAL
  ========================================================= */

  function deleteMeal(id: number) {
    const meal =
      meals.find(
        (item) => item.id === id
      );

    if (!meal) return;

    const confirmed =
      window.confirm(
        `Delete "${meal.name}" from today's meals?`
      );

    if (!confirmed) return;

    const updatedMeals = meals.filter(
      (meal) => meal.id !== id
    );

    setMeals(updatedMeals);
    saveNutritionHistoryForToday(
      updatedMeals
    );
  }

  /* =========================================================
     PHOTO SELECTED
  ========================================================= */

  function handlePhotoChange(
    event: React.ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) return;

    setPhotoError("");

    if (!file.type.startsWith("image/")) {
      setPhotoError(
        "Please select an image file."
      );

      return;
    }

    const maxSize =
      10 * 1024 * 1024;

    if (file.size > maxSize) {
      setPhotoError(
        "Image must be smaller than 10 MB."
      );

      return;
    }

    const imageUrl =
      URL.createObjectURL(file);

    setFoodPhoto(imageUrl);
  }

  /* =========================================================
     REMOVE PHOTO
  ========================================================= */

  function removePhoto() {
    setFoodPhoto(null);

    setFoodWeight("");

    setPhotoError("");

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  /* =========================================================
     ANALYZE FOOD
     
     IMPORTANT:
     This is only the UI step.
     AI/API connection will be added later.
  ========================================================= */

  function handleAnalyzeFood() {
    setPhotoError("");

    if (!foodPhoto) {
      setPhotoError(
        "Please upload a food photo first."
      );

      return;
    }

    const weight =
      Number(foodWeight);

    if (
      !foodWeight ||
      !Number.isFinite(weight) ||
      weight <= 0
    ) {
      setPhotoError(
        "Please enter the food weight in grams."
      );

      return;
    }

    setIsAnalyzing(true);

    /*
      AI FOOD ANALYSIS WILL BE CONNECTED HERE.

      For now we only show the loading state
      so that the complete photo workflow can
      be tested safely before connecting the API.
    */

    setTimeout(() => {
      setIsAnalyzing(false);

      setPhotoError(
        "Food analysis is not connected yet. We will connect the AI analysis in the next step."
      );
    }, 800);
  }

  /* =========================================================
     NUTRITION GOALS
  ========================================================= */

  function openNutritionGoals() {
    setGoalsForm(targets);
    setGoalsError("");
    setShowGoals(true);
  }

  function closeNutritionGoals() {
    setShowGoals(false);
    setGoalsError("");
  }

  function updateGoal(
    field: keyof NutritionTargets,
    value: string
  ) {
    setGoalsForm((previous) => ({
      ...previous,
      [field]: Number(value),
    }));

    setGoalsError("");
  }

  function saveNutritionGoals() {
    const values = [
      goalsForm.calories,
      goalsForm.protein,
      goalsForm.carbs,
      goalsForm.fat,
    ];

    if (
      values.some(
        (value) =>
          !Number.isFinite(value) ||
          value <= 0
      )
    ) {
      setGoalsError(
        "Please enter a value greater than 0 for every goal."
      );
      return;
    }

    const updatedTargets: NutritionTargets = {
      calories: Math.round(goalsForm.calories),
      protein: Number(goalsForm.protein.toFixed(1)),
      carbs: Number(goalsForm.carbs.toFixed(1)),
      fat: Number(goalsForm.fat.toFixed(1)),
    };

    setTargets(updatedTargets);

    try {
      localStorage.setItem(
        NUTRITION_TARGETS_KEY,
        JSON.stringify(updatedTargets)
      );
    } catch (error) {
      console.error(
        "Failed to save nutrition goals:",
        error
      );
    }

    closeNutritionGoals();
  }

  /* =========================================================
     PROGRESS
  ========================================================= */

  if (!targetsLoaded) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-sm text-slate-500">
          Loading your nutrition goals...
        </p>
      </div>
    );
  }

  const caloriesPercentage =
    getPercentage(
      nutrition.calories,
      targets.calories
    );

  const proteinPercentage =
    getPercentage(
      nutrition.protein,
      targets.protein
    );

  const carbsPercentage =
    getPercentage(
      nutrition.carbs,
      targets.carbs
    );

  const fatPercentage =
    getPercentage(
      nutrition.fat,
      targets.fat
    );

  const averageMacroPercentage =
    Math.round(
      (
        proteinPercentage +
        carbsPercentage +
        fatPercentage
      ) / 3
    );

  /* =========================================================
     MACRO PROGRESS
  ========================================================= */

  function MacroProgress({
    label,
    current,
    target,
    unit,
    icon,
  }: {
    label: string;
    current: number;
    target: number;
    unit: string;
    icon: string;
  }) {
    const percentage =
      getPercentage(
        current,
        target
      );

    const remaining =
      getRemaining(
        current,
        target
      );

    return (
      <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5">

        <div className="flex items-center justify-between gap-3">

          <div className="flex min-w-0 items-center gap-2">

            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
              {icon}
            </span>

            <span className="truncate text-sm font-semibold text-slate-700">
              {label}
            </span>

          </div>

          <span className="shrink-0 text-xs font-semibold text-slate-700">
            {current} / {target} {unit}
          </span>

        </div>

        <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-slate-200">

          <div
            className="h-full rounded-full bg-green-600 transition-all duration-500"
            style={{
              width: `${percentage}%`,
            }}
          />

        </div>

        <div className="mt-2 flex items-center justify-between text-[11px]">

          <span className="font-medium text-slate-500">
            {percentage}% of goal
          </span>

          {remaining > 0 ? (
            <span className="text-slate-400">
              {remaining} {unit} remaining
            </span>
          ) : (
            <span className="font-semibold text-green-600">
              Goal reached
            </span>
          )}

        </div>

      </div>
    );
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <>
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow duration-200 hover:shadow-md sm:p-6">

        {/* HEADER */}

        <div className="flex items-start justify-between gap-4">

          <div className="flex min-w-0 items-start gap-3">

            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-orange-50 text-xl">
              🍽️
            </div>

            <div className="min-w-0">

              <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
                Today's Nutrition
              </h2>

              <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
                Track your daily calories and macros
              </p>

            </div>

          </div>

          <div className="flex shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={openNutritionGoals}
              className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 sm:px-4 sm:text-sm"
            >
              🎯 Goals
            </button>

            <button
              type="button"
              onClick={openAddMeal}
              className="rounded-lg bg-green-600 px-3 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-green-700 hover:shadow-md sm:px-4 sm:text-sm"
            >
              + Add Meal
            </button>
          </div>

        </div>

        {/* CALORIES */}

        <div className="mt-5 rounded-xl border border-orange-100 bg-orange-50/60 p-4">

          <div className="flex items-end justify-between gap-4">

            <div>

              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                Daily Calories
              </p>

              <div className="mt-1 flex items-baseline gap-1.5">

                <span className="text-2xl font-bold text-slate-900">
                  {nutrition.calories}
                </span>

                <span className="text-sm font-medium text-slate-500">
                  / {targets.calories} kcal
                </span>

              </div>

            </div>

            <div className="text-right">

              <p className="text-xl font-bold text-green-600">
                {caloriesPercentage}%
              </p>

              <p className="text-[11px] text-slate-500">
                daily goal
              </p>

            </div>

          </div>

          <div className="mt-3 h-2.5 w-full overflow-hidden rounded-full bg-white">

            <div
              className="h-full rounded-full bg-green-600 transition-all duration-500"
              style={{
                width: `${caloriesPercentage}%`,
              }}
            />

          </div>

          <div className="mt-2 flex justify-between text-[11px]">

            <span className="font-medium text-slate-500">
              {nutrition.calories} kcal consumed
            </span>

            <span className="text-slate-400">
              {getRemaining(
                nutrition.calories,
                targets.calories
              )}{" "}
              kcal remaining
            </span>

          </div>

        </div>

        {/* MACROS */}

        <div className="mt-5 flex items-center justify-between">

          <div>

            <h3 className="text-sm font-semibold text-slate-900">
              Macronutrients
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              Your daily protein, carbs and fat
            </p>

          </div>

          <span className="rounded-full bg-green-50 px-2.5 py-1 text-[11px] font-semibold text-green-700">
            {averageMacroPercentage}% average
          </span>

        </div>

        <div className="mt-3 space-y-2.5">

          <MacroProgress
            label="Protein"
            current={nutrition.protein}
            target={targets.protein}
            unit="g"
            icon="💪"
          />

          <MacroProgress
            label="Carbohydrates"
            current={nutrition.carbs}
            target={targets.carbs}
            unit="g"
            icon="🌾"
          />

          <MacroProgress
            label="Fat"
            current={nutrition.fat}
            target={targets.fat}
            unit="g"
            icon="🥑"
          />

        </div>

        {/* TODAY'S MEALS */}

        <div className="mt-5 border-t border-slate-100 pt-5">

          <div className="flex items-center justify-between">

            <div>

              <h3 className="text-sm font-semibold text-slate-900">
                Today's Meals
              </h3>

              <p className="mt-0.5 text-xs text-slate-500">
                {meals.length} meal
                {meals.length !== 1
                  ? "s"
                  : ""}{" "}
                logged
              </p>

            </div>

          </div>

          {meals.length === 0 ? (

            <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">

              <div className="text-2xl">
                🍽️
              </div>

              <p className="mt-2 text-sm font-semibold text-slate-700">
                No meals added yet
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Click &quot;+ Add Meal&quot; to record your first meal.
              </p>

            </div>

          ) : (

            <div className="mt-3 space-y-2">

              {meals.map((meal) => (

                <div
                  key={meal.id}
                  className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
                >

                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                    🍴
                  </div>

                  <div className="min-w-0 flex-1">

                    <p className="truncate text-sm font-semibold text-slate-700">
                      {meal.name}
                    </p>

                    <p className="mt-0.5 text-[11px] text-slate-400">
                      {meal.calories} kcal · P{" "}
                      {meal.protein}g · C{" "}
                      {meal.carbs}g · F{" "}
                      {meal.fat}g
                    </p>

                  </div>

                  {/* EDIT */}

                  <button
                    type="button"
                    onClick={() =>
                      openEditMeal(meal)
                    }
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs font-medium text-slate-500 transition hover:bg-blue-50 hover:text-blue-600"
                    title="Edit meal"
                  >
                    ✏️
                  </button>

                  {/* DELETE */}

                  <button
                    type="button"
                    onClick={() =>
                      deleteMeal(meal.id)
                    }
                    className="shrink-0 rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                    title="Delete meal"
                  >
                    🗑️
                  </button>

                </div>

              ))}

            </div>

          )}

        </div>

        {/* FOOTER */}

        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">

          <span className="text-xs text-slate-400">
            Keep your nutrition balanced throughout the day.
          </span>

          <span className="text-xs font-semibold text-slate-500">
            {getRemaining(
              nutrition.calories,
              targets.calories
            )}{" "}
            kcal left
          </span>

        </div>

      </div>

      {/* =====================================================
          NUTRITION GOALS MODAL
      ===================================================== */}

      {showGoals && (
        <div
          className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target === event.currentTarget
            ) {
              closeNutritionGoals();
            }
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  🎯 Daily Nutrition Goals
                </h3>

                <p className="mt-1 text-xs leading-relaxed text-slate-500">
                  Enter the daily targets given by your trainer or nutrition plan.
                </p>
              </div>

              <button
                type="button"
                onClick={closeNutritionGoals}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="mt-5 space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-600">
                  Calories (kcal)
                </label>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={goalsForm.calories}
                  onChange={(e) =>
                    updateGoal(
                      "calories",
                      e.target.value
                    )
                  }
                  className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Protein (g)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={goalsForm.protein}
                    onChange={(e) =>
                      updateGoal(
                        "protein",
                        e.target.value
                      )
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Carbs (g)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={goalsForm.carbs}
                    onChange={(e) =>
                      updateGoal(
                        "carbs",
                        e.target.value
                      )
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-600">
                    Fat (g)
                  </label>
                  <input
                    type="number"
                    min="0.1"
                    step="0.1"
                    value={goalsForm.fat}
                    onChange={(e) =>
                      updateGoal(
                        "fat",
                        e.target.value
                      )
                    }
                    className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                  />
                </div>
              </div>

              {goalsError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                  {goalsError}
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={closeNutritionGoals}
                className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={saveNutritionGoals}
                className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
              >
                Save Goals
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =====================================================
          ADD / EDIT MEAL MODAL
      ===================================================== */}

      {showMealModal && (

        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeMealModal();
            }
          }}
        >

          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-6">

            {/* CHOICE SCREEN */}

            {addMealMode === "choice" && (

              <>

                <div className="flex items-start justify-between">

                  <div>

                    <h3 className="text-lg font-bold text-slate-900">
                      Add Meal
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Choose how you want to add your food.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={closeMealModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    ✕
                  </button>

                </div>

                <div className="mt-6 space-y-3">

                  {/* PHOTO OPTION */}

                  <button
                    type="button"
                    onClick={() =>
                      setAddMealMode("photo")
                    }
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-green-300 hover:bg-green-50"
                  >

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl group-hover:bg-green-100">
                      📸
                    </div>

                    <div className="flex-1">

                      <p className="text-sm font-bold text-slate-800">
                        Analyze Food
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Upload a food photo and enter its weight.
                      </p>

                    </div>

                    <span className="text-slate-400">
                      →
                    </span>

                  </button>

                  {/* MANUAL OPTION */}

                  <button
                    type="button"
                    onClick={() =>
                      setAddMealMode("manual")
                    }
                    className="group flex w-full items-center gap-4 rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50"
                  >

                    <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl group-hover:bg-blue-100">
                      ✍️
                    </div>

                    <div className="flex-1">

                      <p className="text-sm font-bold text-slate-800">
                        Enter Manually
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Enter calories and macros yourself.
                      </p>

                    </div>

                    <span className="text-slate-400">
                      →
                    </span>

                  </button>

                </div>

              </>

            )}

            {/* =================================================
                MANUAL FORM
            ================================================= */}

            {addMealMode === "manual" && (

              <>

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <h3 className="text-lg font-bold text-slate-900">
                      {editingMealId !== null
                        ? "Edit Meal"
                        : "Enter Meal"}
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Enter the nutrition values for this meal.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={closeMealModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    ✕
                  </button>

                </div>

                <div className="mt-5 space-y-4">

                  {/* MEAL NAME */}

                  <div>

                    <label className="text-xs font-semibold text-slate-600">
                      Meal Name
                    </label>

                    <input
                      type="text"
                      value={mealForm.name}
                      onChange={(e) =>
                        updateForm(
                          "name",
                          e.target.value
                        )
                      }
                      placeholder="e.g. Breakfast"
                      autoFocus
                      className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />

                  </div>

                  {/* NUTRITION */}

                  <div className="grid grid-cols-2 gap-3">

                    <div>

                      <label className="text-xs font-semibold text-slate-600">
                        Calories
                      </label>

                      <input
                        type="number"
                        min="0"
                        value={mealForm.calories}
                        onChange={(e) =>
                          updateForm(
                            "calories",
                            e.target.value
                          )
                        }
                        placeholder="500"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      />

                    </div>

                    <div>

                      <label className="text-xs font-semibold text-slate-600">
                        Protein (g)
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={mealForm.protein}
                        onChange={(e) =>
                          updateForm(
                            "protein",
                            e.target.value
                          )
                        }
                        placeholder="25"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      />

                    </div>

                    <div>

                      <label className="text-xs font-semibold text-slate-600">
                        Carbs (g)
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={mealForm.carbs}
                        onChange={(e) =>
                          updateForm(
                            "carbs",
                            e.target.value
                          )
                        }
                        placeholder="60"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      />

                    </div>

                    <div>

                      <label className="text-xs font-semibold text-slate-600">
                        Fat (g)
                      </label>

                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={mealForm.fat}
                        onChange={(e) =>
                          updateForm(
                            "fat",
                            e.target.value
                          )
                        }
                        placeholder="15"
                        className="mt-1.5 w-full rounded-lg border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                      />

                    </div>

                  </div>

                  {error && (

                    <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2.5 text-xs font-medium text-red-600">
                      {error}
                    </div>

                  )}

                </div>

                <div className="mt-6 flex gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      editingMealId !== null
                        ? closeMealModal()
                        : setAddMealMode(
                            "choice"
                          )
                    }
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveMeal}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700"
                  >
                    {editingMealId !== null
                      ? "Update Meal"
                      : "Save Meal"}
                  </button>

                </div>

              </>

            )}

            {/* =================================================
                PHOTO ANALYSIS UI
            ================================================= */}

            {addMealMode === "photo" && (

              <>

                <div className="flex items-start justify-between gap-4">

                  <div>

                    <h3 className="text-lg font-bold text-slate-900">
                      📸 Analyze Food
                    </h3>

                    <p className="mt-1 text-xs text-slate-500">
                      Upload a food photo and enter its weight.
                    </p>

                  </div>

                  <button
                    type="button"
                    onClick={closeMealModal}
                    className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                  >
                    ✕
                  </button>

                </div>

                {/* PHOTO UPLOAD */}

                <div className="mt-5">

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={
                      handlePhotoChange
                    }
                    className="hidden"
                  />

                  {!foodPhoto ? (

                    <button
                      type="button"
                      onClick={() =>
                        fileInputRef.current?.click()
                      }
                      className="flex w-full flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center transition hover:border-green-400 hover:bg-green-50"
                    >

                      <div className="text-4xl">
                        📷
                      </div>

                      <p className="mt-3 text-sm font-bold text-slate-700">
                        Upload Food Photo
                      </p>

                      <p className="mt-1 text-xs text-slate-500">
                        Click to choose a photo or take a picture
                      </p>

                    </button>

                  ) : (

                    <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-50">

                      <img
                        src={foodPhoto}
                        alt="Selected food"
                        className="h-52 w-full object-cover"
                      />

                      <div className="absolute right-2 top-2 flex gap-2">

                        <button
                          type="button"
                          onClick={() =>
                            fileInputRef.current?.click()
                          }
                          className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-slate-700 shadow"
                        >
                          Change
                        </button>

                        <button
                          type="button"
                          onClick={removePhoto}
                          className="rounded-lg bg-white/95 px-3 py-1.5 text-xs font-semibold text-red-600 shadow"
                        >
                          Remove
                        </button>

                      </div>

                    </div>

                  )}

                </div>

                {/* WEIGHT */}

                <div className="mt-5">

                  <label className="text-xs font-semibold text-slate-600">
                    Food Weight
                  </label>

                  <div className="mt-1.5 flex items-center">

                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={foodWeight}
                      onChange={(e) => {
                        setFoodWeight(
                          e.target.value
                        );
                        setPhotoError("");
                      }}
                      placeholder="250"
                      className="w-full rounded-l-lg border border-r-0 border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                    />

                    <span className="rounded-r-lg border border-slate-300 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-500">
                      grams
                    </span>

                  </div>

                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Enter the approximate weight of the food shown in the photo.
                  </p>

                </div>

                {/* ERROR */}

                {photoError && (

                  <div className="mt-4 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2.5 text-xs font-medium text-orange-700">
                    {photoError}
                  </div>

                )}

                {/* BUTTONS */}

                <div className="mt-6 flex gap-3">

                  <button
                    type="button"
                    onClick={() =>
                      setAddMealMode(
                        "choice"
                      )
                    }
                    disabled={isAnalyzing}
                    className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                  >
                    Back
                  </button>

                  <button
                    type="button"
                    onClick={
                      handleAnalyzeFood
                    }
                    disabled={isAnalyzing}
                    className="flex-1 rounded-lg bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {isAnalyzing
                      ? "Analyzing..."
                      : "Analyze Food"}
                  </button>

                </div>

                <p className="mt-4 text-center text-[10px] leading-relaxed text-slate-400">
                  Food analysis will provide estimated nutrition values.
                  You will be able to review them before adding the meal.
                </p>

              </>

            )}

          </div>

        </div>

      )}

    </>
  );
}