"use client";

import { ChangeEvent, useEffect, useState } from "react";
import { authClient } from "@/app/lib/auth-client";
import {
  type ThemeMode,
  useTheme,
} from "@/app/components/theme/ThemeProvider";
import { DEFAULT_USER_PREFERENCES } from "@/app/lib/regional-preferences";

type AccountRole = "USER" | "TRAINER" | "OWNER";

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

type RegionalPreferences = {
  timezone: string;
  country: string;
  locale: string;
  currency: string;
  weightUnit: string;
  heightUnit: string;
  distanceUnit: string;
  dateFormat: string;
  timeFormat: string;
};

const DEFAULT_REGIONAL_PREFERENCES: RegionalPreferences = {
  ...DEFAULT_USER_PREFERENCES,
};

const SUPPORTED_CURRENCIES = Intl.supportedValuesOf("currency");

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
  const { theme, setTheme } = useTheme();
  const [accountRole, setAccountRole] = useState<AccountRole | null>(null);
  const [settings, setSettings] =
    useState<SettingsData>(DEFAULT_SETTINGS);
  const [regionalPreferences, setRegionalPreferences] =
    useState<RegionalPreferences>(DEFAULT_REGIONAL_PREFERENCES);
  const [regionalSaving, setRegionalSaving] = useState(false);
  const [regionalMessage, setRegionalMessage] = useState("");

  const [loading, setLoading] = useState(true);

  const [nutritionTargets, setNutritionTargets] =
    useState<NutritionTargets>(DEFAULT_NUTRITION_TARGETS);

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
          setLoading(false);
          return;
        }

        const data = await response.json();
        const user = data.user;
        if (user.role === "USER" || user.role === "TRAINER" || user.role === "OWNER") {
          setAccountRole(user.role);
        } else {
          throw new Error("Profile contains an unsupported account role");
        }

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
        setRegionalPreferences({
          timezone: user.timezone ?? DEFAULT_USER_PREFERENCES.timezone,
          country: user.country ?? DEFAULT_USER_PREFERENCES.country,
          locale: user.locale ?? DEFAULT_USER_PREFERENCES.locale,
          currency: user.currency ?? DEFAULT_USER_PREFERENCES.currency,
          weightUnit: user.weightUnit ?? DEFAULT_USER_PREFERENCES.weightUnit,
          heightUnit: user.heightUnit ?? DEFAULT_USER_PREFERENCES.heightUnit,
          distanceUnit:
            user.distanceUnit ?? DEFAULT_USER_PREFERENCES.distanceUnit,
          dateFormat: user.dateFormat ?? DEFAULT_USER_PREFERENCES.dateFormat,
          timeFormat: user.timeFormat ?? DEFAULT_USER_PREFERENCES.timeFormat,
        });

        // Load nutrition targets from the database.
        const nutritionResponse = await fetch(
          "/api/nutrition/targets",
          {
            cache: "no-store",
          }
        );

        if (nutritionResponse.ok) {
          const nutritionData =
            await nutritionResponse.json();

          if (nutritionData.target) {
            setNutritionTargets({
              calories: String(
                nutritionData.target.calories
              ),
              protein: String(
                nutritionData.target.protein
              ),
              carbs: String(
                nutritionData.target.carbs
              ),
              fat: String(
                nutritionData.target.fat
              ),
            });
          }
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

        setLoading(false);
      } catch (error) {
        console.error(
          "Failed to load LifeOS settings:",
          error
        );
        setMessage("Unable to load settings");
        setLoading(false);
      }
    }

    loadSettings();
  }, []);

  function updateRegionalPreference(
    field: keyof RegionalPreferences,
    value: string,
  ) {
    setRegionalPreferences((previous) => ({ ...previous, [field]: value }));
    setRegionalMessage("");
  }

  async function saveRegionalPreferences() {
    setRegionalSaving(true);
    setRegionalMessage("");

    try {
      const response = await fetch("/api/profile", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(regionalPreferences),
      });
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error ?? "Unable to save regional preferences");
      }

      const user = result.user;
      setRegionalPreferences({
        timezone: user.timezone,
        country: user.country,
        locale: user.locale,
        currency: user.currency,
        weightUnit: user.weightUnit,
        heightUnit: user.heightUnit,
        distanceUnit: user.distanceUnit,
        dateFormat: user.dateFormat,
        timeFormat: user.timeFormat,
      });
      setRegionalMessage("Regional & units preferences saved.");
    } catch (error) {
      console.error("Failed to save regional preferences:", error);
      setRegionalMessage(
        error instanceof Error
          ? error.message
          : "Unable to save regional preferences",
      );
    } finally {
      setRegionalSaving(false);
    }
  }

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

  }

  function isPositiveNumber(value: string) {
    const number = Number(value);
    return (
      value.trim() !== "" &&
      Number.isFinite(number) &&
      number > 0
    );
  }

  async function saveSettings() {
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

      const nutritionResponse = await fetch(
        "/api/nutrition/targets",
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            calories: Number(cleanedTargets.calories),
            protein: Number(cleanedTargets.protein),
            carbs: Number(cleanedTargets.carbs),
            fat: Number(cleanedTargets.fat),
          }),
        }
      );

      if (!nutritionResponse.ok) {
        const nutritionData =
          await nutritionResponse.json();

        throw new Error(
          nutritionData.error ||
            "Failed to save nutrition targets."
        );
      }

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

  if (loading) {
    return (
      <main className="flex min-h-[60vh] items-center justify-center">
        <p className="text-sm text-slate-500">
          Loading your settings...
        </p>
      </main>
    );
  }

  return (
    <main className="space-y-6">
      {/* HEADER */}
      <div>
        <p className="text-sm font-medium uppercase tracking-wide text-primary">
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

      <section className="rounded-2xl border border-border bg-card p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-card-foreground">
            Appearance
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Choose how LifeOS looks on this device.
          </p>
        </div>

        <fieldset className="mt-4 grid gap-3 sm:grid-cols-3">
          <legend className="sr-only">Theme</legend>
          {(["light", "dark", "system"] as const).map((mode: ThemeMode) => (
            <label
              key={mode}
              className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium capitalize transition ${
                theme === mode
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              <input
                type="radio"
                name="appearance"
                value={mode}
                checked={theme === mode}
                onChange={() => setTheme(mode)}
                className="accent-primary"
              />
              {mode}
            </label>
          ))}
        </fieldset>
      </section>

      {/* REGIONAL & UNITS */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div>
          <h2 className="text-lg font-bold text-slate-900">
            Regional &amp; Units
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Set the timezone, language, currency, and measurement formats used
            for your personal experience.
          </p>
        </div>

        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-slate-700">
            Timezone
            <input
              type="text"
              value={regionalPreferences.timezone}
              onChange={(event) =>
                updateRegionalPreference("timezone", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              placeholder="America/New_York"
              autoComplete="off"
            />
            <span className="mt-1 block text-xs font-normal text-slate-400">
              Use an IANA timezone, such as America/New_York.
            </span>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Country code
            <input
              type="text"
              value={regionalPreferences.country}
              onChange={(event) =>
                updateRegionalPreference(
                  "country",
                  event.target.value.toUpperCase(),
                )
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              placeholder="IN"
              maxLength={2}
              autoComplete="country"
            />
            <span className="mt-1 block text-xs font-normal text-slate-400">
              ISO 3166-1 alpha-2 code.
            </span>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Locale / language
            <input
              type="text"
              value={regionalPreferences.locale}
              onChange={(event) =>
                updateRegionalPreference("locale", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
              placeholder="en-IN"
              maxLength={35}
              autoComplete="language"
            />
            <span className="mt-1 block text-xs font-normal text-slate-400">
              BCP 47 language tag, such as en-IN or fr-CA.
            </span>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Currency
            <select
              value={regionalPreferences.currency}
              onChange={(event) =>
                updateRegionalPreference("currency", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
            >
              {SUPPORTED_CURRENCIES.map((currency) => (
                <option key={currency} value={currency}>
                  {currency}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Weight
            <select
              value={regionalPreferences.weightUnit}
              onChange={(event) =>
                updateRegionalPreference("weightUnit", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
            >
              <option value="kg">Kilograms (kg)</option>
              <option value="lb">Pounds (lb)</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Height
            <select
              value={regionalPreferences.heightUnit}
              onChange={(event) =>
                updateRegionalPreference("heightUnit", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
            >
              <option value="cm">Centimeters (cm)</option>
              <option value="ft_in">Feet and inches (ft/in)</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Distance
            <select
              value={regionalPreferences.distanceUnit}
              onChange={(event) =>
                updateRegionalPreference("distanceUnit", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
            >
              <option value="km">Kilometers (km)</option>
              <option value="miles">Miles</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Date format
            <select
              value={regionalPreferences.dateFormat}
              onChange={(event) =>
                updateRegionalPreference("dateFormat", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
            >
              <option value="DD/MM/YYYY">DD/MM/YYYY</option>
              <option value="MM/DD/YYYY">MM/DD/YYYY</option>
              <option value="YYYY-MM-DD">YYYY-MM-DD</option>
            </select>
          </label>

          <label className="text-sm font-semibold text-slate-700">
            Time format
            <select
              value={regionalPreferences.timeFormat}
              onChange={(event) =>
                updateRegionalPreference("timeFormat", event.target.value)
              }
              className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
            >
              <option value="12h">12-hour</option>
              <option value="24h">24-hour</option>
            </select>
          </label>
        </div>

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p
            role="status"
            className={`text-sm ${
              regionalMessage.includes("saved")
                ? "font-semibold text-primary"
                : "text-slate-600"
            }`}
          >
            {regionalMessage}
          </p>
          <button
            type="button"
            onClick={saveRegionalPreferences}
            disabled={regionalSaving}
            className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {regionalSaving ? "Saving..." : "Save Regional Preferences"}
          </button>
        </div>
      </section>

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
                Name <span className="text-red-500">*</span>
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
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                placeholder="Your name"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Age <span className="text-red-500">*</span>
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
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                placeholder="Age"
              />

              <p className="mt-1 text-[11px] text-slate-400">
                Must be greater than 0.
              </p>
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Height (cm) <span className="text-red-500">*</span>
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
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                placeholder="Height"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Weight (kg) <span className="text-red-500">*</span>
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
                className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
                placeholder="Weight"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-slate-700">
                Account Role
              </label>

              <p className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-600">
                {accountRole === "TRAINER"
                  ? "Trainer"
                  : accountRole === "OWNER"
                    ? "Owner / Admin"
                    : accountRole === "USER"
                      ? "User"
                      : "Unknown"}
              </p>
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
                className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
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
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
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
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
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
              className="mt-2 w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none transition focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
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
              🔥 Calories (kcal) <span className="text-red-500">*</span>
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

          <div className="rounded-xl bg-primary/10 p-4">
            <label className="text-xs font-semibold text-primary">
              💪 Protein (g) <span className="text-red-500">*</span>
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
              className="mt-2 w-full rounded-lg border border-primary/20 bg-white px-3 py-2 text-sm outline-none focus:border-primary/30 focus:ring-2 focus:ring-primary/20"
            />
          </div>

          <div className="rounded-xl bg-yellow-50 p-4">
            <label className="text-xs font-semibold text-yellow-700">
              🌾 Carbs (g) <span className="text-red-500">*</span>
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
              🥑 Fat (g) <span className="text-red-500">*</span>
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
            Daily Water Goal (ml) <span className="text-red-500">*</span>
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
              <p className="text-sm font-semibold text-primary">
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
              className="rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-primary/90"
            >
              {saved ? "✓ Saved" : "Save Settings"}
            </button>
          </div>
        </div>
      </section>

      {/* INFO */}
      <section className="rounded-2xl border border-primary/20 bg-primary/10 p-5">
        <p className="text-sm leading-relaxed text-primary">
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
