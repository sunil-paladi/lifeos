"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { authClient } from "@/app/lib/auth-client";

type AccountRole = "User" | "Trainer" | "Owner";

type FitnessGoal =
  | "Lose Weight"
  | "Build Muscle"
  | "Maintain Weight"
  | "Improve Fitness";

type SettingsData = {
  name: string;
  age: string;
  height: string;
  weight: string;
  fitnessGoal: FitnessGoal;
  waterGoal: string;
  role: AccountRole;
  trainerName: string;
  trainerSpecialization: string;
  trainerEmail: string;
  profilePhoto: string;
};

type NutritionTargets = {
  calories: string;
  protein: string;
  carbs: string;
  fat: string;
};

const SETTINGS_STORAGE_KEY = "lifeos-settings";
const NUTRITION_TARGETS_KEY = "lifeos-nutrition-targets";
const WATER_TARGET_KEY = "lifeos-water-target";

const DEFAULT_SETTINGS: SettingsData = {
  name: "Sunil Kumar",
  age: "25",
  height: "175",
  weight: "73",
  fitnessGoal: "Build Muscle",
  waterGoal: "3000",
  role: "User",
  trainerName: "",
  trainerSpecialization: "",
  trainerEmail: "",
  profilePhoto: "",
};

const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  calories: "2300",
  protein: "150",
  carbs: "250",
  fat: "70",
};

export default function SettingsPage() {
  const [settings, setSettings] =
    useState<SettingsData>(DEFAULT_SETTINGS);

  const [nutritionTargets, setNutritionTargets] =
    useState<NutritionTargets>(
      DEFAULT_NUTRITION_TARGETS
    );

  const [saved, setSaved] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const session = await authClient.getSession();

        if (!session.data?.user) {
          window.location.href = "/login";
          return;
        }

        const response = await fetch("/api/profile");

        if (!response.ok) {
          setMessage("Unable to load profile");
          return;
        }

        const data = await response.json();
        const user = data.user;
        setSettings((previous) => ({
          ...previous,
          name: user.name ?? "",
          age: user.age?.toString() ?? "",
          height: user.height?.toString() ?? "",
          weight: user.weight?.toString() ?? "",
          fitnessGoal:
            user.fitnessGoal === "LOSE_WEIGHT"
              ? "Lose Weight"
              : user.fitnessGoal === "BUILD_MUSCLE"
                ? "Build Muscle"
                : user.fitnessGoal === "MAINTAIN_WEIGHT"
                  ? "Maintain Weight"
                  : user.fitnessGoal === "IMPROVE_FITNESS"
                    ? "Improve Fitness"
                    : "Build Muscle",
        }));

        // Keep device-specific settings for now.
        const savedTargets = localStorage.getItem(
          NUTRITION_TARGETS_KEY
        );

        if (savedTargets) {
          const parsed = JSON.parse(savedTargets);

          setNutritionTargets({
            calories: String(
              parsed.calories ??
                DEFAULT_NUTRITION_TARGETS.calories
            ),
            protein: String(
              parsed.protein ??
                DEFAULT_NUTRITION_TARGETS.protein
            ),
            carbs: String(
              parsed.carbs ??
                DEFAULT_NUTRITION_TARGETS.carbs
            ),
            fat: String(
              parsed.fat ??
                DEFAULT_NUTRITION_TARGETS.fat
            ),
          });
        }

        const savedWaterTarget = localStorage.getItem(
          WATER_TARGET_KEY
        );

        if (savedWaterTarget) {
          setSettings((previous) => ({
            ...previous,
            waterGoal: String(savedWaterTarget),
          }));
        }
      } catch (error) {
        console.error(
          "Failed to load LifeOS settings:",
          error
        );
        setMessage("Unable to load settings");
      }
    }

    loadSettings();
  }, []);

async function updateSetting(
  field: keyof SettingsData,
  value: string
) {
    const nextSettings = {
      ...settings,
      [field]: value,
    };

    setSettings(nextSettings);
    setSaved(false);
    setMessage("");

    // Persist the latest value immediately so refresh does not
    // bring back the default value.
   try {
  if (
    field === "name" ||
    field === "age" ||
    field === "height" ||
    field === "weight" ||
    field === "fitnessGoal"
  ) {
    const fitnessGoal =
      nextSettings.fitnessGoal === "Lose Weight"
        ? "LOSE_WEIGHT"
        : nextSettings.fitnessGoal === "Build Muscle"
          ? "BUILD_MUSCLE"
          : nextSettings.fitnessGoal === "Maintain Weight"
            ? "MAINTAIN_WEIGHT"
            : "IMPROVE_FITNESS";

    const response = await fetch("/api/profile", {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: nextSettings.name,
        age: nextSettings.age
          ? Number(nextSettings.age)
          : null,
        height: nextSettings.height
          ? Number(nextSettings.height)
          : null,
        weight: nextSettings.weight
          ? Number(nextSettings.weight)
          : null,
        fitnessGoal,
      }),
    });

    if (!response.ok) {
      throw new Error("Failed to update profile");
    }
  }

  if (field === "waterGoal") {
    localStorage.setItem(
      WATER_TARGET_KEY,
      value
    );
  }
} catch (error) {
  console.error(
    "Failed to persist setting:",
    error
  );
  setMessage("Failed to save setting");
}
}

  function updateNutritionTarget(
    field: keyof NutritionTargets,
    value: string
  ) {
    const nextTargets = {
      ...nutritionTargets,
      [field]: value,
    };

    setNutritionTargets(nextTargets);
    setSaved(false);
    setMessage("");

    // Persist the latest nutrition target immediately.
    try {
      localStorage.setItem(
        NUTRITION_TARGETS_KEY,
        JSON.stringify(nextTargets)
      );
    } catch (error) {
      console.error(
        "Failed to persist nutrition target:",
        error
      );
    }
  }

  function isPositiveNumber(value: string) {
    const number = Number(value);
    return (
      value.trim() !== "" &&
      Number.isFinite(number) &&
      number > 0
    );
  }

  function saveSettings() {
    if (!settings.name.trim()) {
      setMessage("Please enter your name.");
      setSaved(false);
      return;
    }

    if (!isPositiveNumber(settings.age)) {
      setMessage("Please enter a valid age greater than 0.");
      setSaved(false);
      return;
    }

    if (!isPositiveNumber(settings.height)) {
      setMessage(
        "Please enter a valid height greater than 0."
      );
      setSaved(false);
      return;
    }

    if (!isPositiveNumber(settings.weight)) {
      setMessage(
        "Please enter a valid weight greater than 0."
      );
      setSaved(false);
      return;
    }

    if (!isPositiveNumber(settings.waterGoal)) {
      setMessage(
        "Please enter a valid water goal greater than 0."
      );
      setSaved(false);
      return;
    }

    if (!isPositiveNumber(nutritionTargets.calories)) {
      setMessage("Please enter a valid calorie target.");
      setSaved(false);
      return;
    }

    if (!isPositiveNumber(nutritionTargets.protein)) {
      setMessage("Please enter a valid protein target.");
      setSaved(false);
      return;
    }

    if (!isPositiveNumber(nutritionTargets.carbs)) {
      setMessage("Please enter a valid carbs target.");
      setSaved(false);
      return;
    }

    if (!isPositiveNumber(nutritionTargets.fat)) {
      setMessage("Please enter a valid fat target.");
      setSaved(false);
      return;
    }

    const cleanedSettings: SettingsData = {
      ...settings,
      name: settings.name.trim(),
      age: String(Number(settings.age)),
      height: String(Number(settings.height)),
      weight: String(Number(settings.weight)),
      waterGoal: String(Number(settings.waterGoal)),
    };

    const cleanedTargets: NutritionTargets = {
      calories: String(
        Number(nutritionTargets.calories)
      ),
      protein: String(
        Number(nutritionTargets.protein)
      ),
      carbs: String(
        Number(nutritionTargets.carbs)
      ),
      fat: String(Number(nutritionTargets.fat)),
    };

    try {
      localStorage.setItem(
        SETTINGS_STORAGE_KEY,
        JSON.stringify(cleanedSettings)
      );

      localStorage.setItem(
        NUTRITION_TARGETS_KEY,
        JSON.stringify(cleanedTargets)
      );

      localStorage.setItem(
        WATER_TARGET_KEY,
        cleanedSettings.waterGoal
      );

      setSettings(cleanedSettings);
      setNutritionTargets(cleanedTargets);
      setSaved(true);
      setMessage("");

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Failed to save LifeOS settings:",
        error
      );

      setSaved(false);
      setMessage(
        "Could not save settings. Please try again."
      );
    }
  }

  function resetSettings() {
    const confirmed = window.confirm(
      "Reset your LifeOS settings to the default values?"
    );

    if (!confirmed) return;

    try {
      localStorage.removeItem(
        SETTINGS_STORAGE_KEY
      );
      localStorage.removeItem(
        NUTRITION_TARGETS_KEY
      );
      localStorage.removeItem(
        WATER_TARGET_KEY
      );

      setSettings(DEFAULT_SETTINGS);
      setNutritionTargets(
        DEFAULT_NUTRITION_TARGETS
      );
      setSaved(false);
      setMessage(
        "Settings restored to default values."
      );
    } catch (error) {
      console.error(
        "Failed to reset LifeOS settings:",
        error
      );
    }
  }

  function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setMessage("Please select an image file.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage(
        "Please choose an image smaller than 2 MB."
      );
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      if (typeof result === "string") {
        updateSetting("profilePhoto", result);
        setMessage(
          "Photo selected. Click Save Settings to keep it."
        );
      }
    };

    reader.readAsDataURL(file);
  }

  function removePhoto() {
    updateSetting("profilePhoto", "");
    setMessage(
      "Profile photo removed. Click Save Settings to confirm."
    );
  }

  return (
    <main className="space-y-6">
      {/* HEADER */}
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-green-600">
          Settings
        </p>

        <h1 className="mt-1 text-3xl font-bold tracking-tight text-slate-900">
          Personal Settings
        </h1>

        <p className="mt-1 text-sm text-slate-500">
          Customize LifeOS for your personal goals,
          profile, and targets.
        </p>
      </div>

      {/* PROFILE */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            👤 Profile
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Your personal information used by LifeOS.
          </p>
        </div>

        <div className="mt-5 flex flex-col gap-6 lg:flex-row">
          {/* PHOTO */}
          <div className="flex w-full flex-col items-center lg:w-40">
            <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-slate-200 bg-slate-100 text-4xl">
              {settings.profilePhoto ? (
                <img
                  src={settings.profilePhoto}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                "👤"
              )}
            </div>

            <label className="mt-3 cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-600 transition hover:bg-slate-50">
              📷 Change Photo

              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="hidden"
              />
            </label>

            {settings.profilePhoto && (
              <button
                type="button"
                onClick={removePhoto}
                className="mt-2 text-xs font-medium text-red-500 hover:text-red-600"
              >
                Remove Photo
              </button>
            )}

            <p className="mt-2 text-center text-[11px] text-slate-400">
              JPG, PNG or WebP
              <br />
              Maximum 2 MB
            </p>
          </div>

          {/* PROFILE FIELDS */}
          <div className="grid flex-1 grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="text-sm font-semibold text-slate-700">
                Name
              </label>

              <input
                type="text"
                value={settings.name}
                onChange={(event) =>
                  updateSetting(
                    "name",
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Age
              </label>

              <input
                type="number"
                min="1"
                step="1"
                value={settings.age}
                onChange={(event) =>
                  updateSetting(
                    "age",
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                placeholder="Age"
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Must be greater than 0.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Height (cm)
              </label>

              <input
                type="number"
                min="1"
                step="0.1"
                value={settings.height}
                onChange={(event) =>
                  updateSetting(
                    "height",
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                placeholder="Height"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Weight (kg)
              </label>

              <input
                type="number"
                min="1"
                step="0.1"
                value={settings.weight}
                onChange={(event) =>
                  updateSetting(
                    "weight",
                    event.target.value
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
                placeholder="Weight"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Account Role
              </label>

              <select
                value={settings.role}
                onChange={(event) =>
                  updateSetting(
                    "role",
                    event.target.value as AccountRole
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >
                <option value="User">User</option>
                <option value="Trainer">Trainer</option>
                <option value="Owner">Owner / Admin</option>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Fitness Goal
              </label>

              <select
                value={settings.fitnessGoal}
                onChange={(event) =>
                  updateSetting(
                    "fitnessGoal",
                    event.target.value as FitnessGoal
                  )
                }
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              >
                <option value="Lose Weight">
                  Lose Weight
                </option>

                <option value="Build Muscle">
                  Build Muscle
                </option>

                <option value="Maintain Weight">
                  Maintain Weight
                </option>

                <option value="Improve Fitness">
                  Improve Fitness
                </option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* TRAINER / ACCOUNT RELATIONSHIP */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            🏋️ Trainer & Account
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Connect a user with a trainer and keep trainer
            information ready for the future LifeOS portal.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="text-sm font-semibold text-slate-700">
              Trainer Name
            </label>

            <input
              type="text"
              value={settings.trainerName}
              onChange={(event) =>
                updateSetting(
                  "trainerName",
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              placeholder="e.g. Rahul Sharma"
            />
          </div>

          <div>
            <label className="text-sm font-semibold text-slate-700">
              Trainer Specialization
            </label>

            <input
              type="text"
              value={settings.trainerSpecialization}
              onChange={(event) =>
                updateSetting(
                  "trainerSpecialization",
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              placeholder="e.g. Strength & Fitness"
            />
          </div>

          <div className="sm:col-span-2">
            <label className="text-sm font-semibold text-slate-700">
              Trainer Email
            </label>

            <input
              type="email"
              value={settings.trainerEmail}
              onChange={(event) =>
                updateSetting(
                  "trainerEmail",
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-100"
              placeholder="trainer@example.com"
            />
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-4">
          <p className="text-sm leading-relaxed text-blue-800">
            💡 In the future, the Trainer Portal can use this
            relationship to assign workouts, habits, nutrition
            targets, and review reports for each user.
          </p>
        </div>
      </section>

      {/* NUTRITION */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            🍎 Nutrition Goals
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Enter the daily targets provided by your trainer
            or nutrition plan.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-xl bg-orange-50 p-4">
            <label className="text-xs font-semibold text-orange-700">
              🔥 Calories (kcal)
            </label>

            <input
              type="number"
              min="1"
              value={nutritionTargets.calories}
              onChange={(event) =>
                updateNutritionTarget(
                  "calories",
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-lg border border-orange-100 bg-white px-3 py-2 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-100"
            />
          </div>

          <div className="rounded-xl bg-green-50 p-4">
            <label className="text-xs font-semibold text-green-700">
              💪 Protein (g)
            </label>

            <input
              type="number"
              min="0.1"
              step="0.1"
              value={nutritionTargets.protein}
              onChange={(event) =>
                updateNutritionTarget(
                  "protein",
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-lg border border-green-100 bg-white px-3 py-2 text-sm outline-none focus:border-green-400 focus:ring-2 focus:ring-green-100"
            />
          </div>

          <div className="rounded-xl bg-yellow-50 p-4">
            <label className="text-xs font-semibold text-yellow-700">
              🌾 Carbs (g)
            </label>

            <input
              type="number"
              min="0.1"
              step="0.1"
              value={nutritionTargets.carbs}
              onChange={(event) =>
                updateNutritionTarget(
                  "carbs",
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-lg border border-yellow-100 bg-white px-3 py-2 text-sm outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100"
            />
          </div>

          <div className="rounded-xl bg-purple-50 p-4">
            <label className="text-xs font-semibold text-purple-700">
              🥑 Fat (g)
            </label>

            <input
              type="number"
              min="0.1"
              step="0.1"
              value={nutritionTargets.fat}
              onChange={(event) =>
                updateNutritionTarget(
                  "fat",
                  event.target.value
                )
              }
              className="mt-2 w-full rounded-lg border border-purple-100 bg-white px-3 py-2 text-sm outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-100"
            />
          </div>
        </div>
      </section>

      {/* WATER */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            💧 Hydration Goal
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Set your daily water target.
          </p>
        </div>

        <div className="mt-5 max-w-sm">
          <label className="text-sm font-semibold text-slate-700">
            Daily Water Goal (ml)
          </label>

          <input
            type="number"
            min="100"
            step="100"
            value={settings.waterGoal}
            onChange={(event) =>
              updateSetting(
                "waterGoal",
                event.target.value
              )
            }
            className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            placeholder="3000"
          />

          <p className="mt-2 text-xs text-slate-400">
            Current goal:{" "}
            {Number(settings.waterGoal || 0) / 1000}
            {" "}L per day
          </p>
        </div>
      </section>

      {/* SAVE / RESET */}
      <section className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            {saved && (
              <p className="text-sm font-semibold text-green-600">
                ✓ Settings saved successfully.
              </p>
            )}

            {message && !saved && (
              <p className="text-sm font-medium text-slate-600">
                {message}
              </p>
            )}

            {!saved && !message && (
              <p className="text-xs text-slate-500">
                Changes are saved locally on this device.
              </p>
            )}
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={resetSettings}
              className="rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-100"
            >
              Reset
            </button>

            <button
              type="button"
              onClick={saveSettings}
              className="rounded-lg bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-green-700"
            >
              {saved ? "✓ Saved" : "Save Settings"}
            </button>
          </div>
        </div>
      </section>

      {/* INFO */}
      <section className="rounded-2xl border border-green-100 bg-green-50 p-5">
        <p className="text-sm leading-relaxed text-green-800">
          💡 Your nutrition targets are shared with the
          Nutrition and Analytics sections. Your water goal
          is also saved for LifeOS hydration tracking.
          Profile and trainer information are saved locally
          for this prototype.
        </p>
      </section>
    </main>
  );
}
