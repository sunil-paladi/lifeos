"use client";

import { useEffect, useMemo, useState } from "react";

type WaterEntry = {
  id: number;
  amount: number;
  time: string;
};

type WaterDay = {
  date: string;
  entries: WaterEntry[];
};

type StoredWaterData = {
  currentDate: string;
  entries: WaterEntry[];
  history: WaterDay[];
};

const STORAGE_KEY = "lifeos-water-data";
const DAILY_TARGET = 3000;

function getToday() {
  return new Date().toISOString().split("T")[0];
}

function saveDayToHistory(
  history: WaterDay[],
  date: string,
  entries: WaterEntry[]
): WaterDay[] {
  const existingIndex = history.findIndex(
    (day) => day.date === date
  );

  const newDay: WaterDay = {
    date,
    entries,
  };

  if (existingIndex >= 0) {
    const updatedHistory = [...history];

    updatedHistory[existingIndex] = newDay;

    return updatedHistory;
  }

  return [...history, newDay].slice(-7);
}

export default function WaterTracker() {
  const [entries, setEntries] = useState<WaterEntry[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return [];
      }

      const parsed: StoredWaterData =
        JSON.parse(saved);

      const today = getToday();

      /*
       * Current day
       */
      if (
        parsed.currentDate === today &&
        Array.isArray(parsed.entries)
      ) {
        return parsed.entries;
      }

      /*
       * New day.
       *
       * Start with empty entries.
       * Previous days remain inside history.
       */
      return [];
    } catch (error) {
      console.error(
        "Failed to load water data:",
        error
      );

      return [];
    }
  });

  const [history, setHistory] = useState<WaterDay[]>(() => {
    if (typeof window === "undefined") {
      return [];
    }

    try {
      const saved =
        localStorage.getItem(STORAGE_KEY);

      if (!saved) {
        return [];
      }

      const parsed: StoredWaterData =
        JSON.parse(saved);

      if (Array.isArray(parsed.history)) {
        return parsed.history;
      }
    } catch (error) {
      console.error(
        "Failed to load water history:",
        error
      );
    }

    return [];
  });

  const [customAmount, setCustomAmount] =
    useState("");

  /*
   * Save today's water and 7-day history.
   */
  useEffect(() => {
    try {
      const today = getToday();

      const updatedHistory =
        saveDayToHistory(
          history,
          today,
          entries
        );

      const data: StoredWaterData = {
        currentDate: today,
        entries,
        history: updatedHistory,
      };

      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(data)
      );
    } catch (error) {
      console.error(
        "Failed to save water data:",
        error
      );
    }
  }, [entries, history]);

  /*
   * Keep today's history updated whenever
   * the water entries change.
   */
  useEffect(() => {
    const today = getToday();

    setHistory((currentHistory) =>
      saveDayToHistory(
        currentHistory,
        today,
        entries
      )
    );
  }, [entries]);

  /*
   * Calculate total water.
   */
  const totalWater = useMemo(() => {
    return entries.reduce(
      (total, entry) =>
        total + entry.amount,
      0
    );
  }, [entries]);

  /*
   * Calculate progress.
   */
  const percentage = Math.min(
    Math.round(
      (totalWater / DAILY_TARGET) * 100
    ),
    100
  );

  /*
   * Calculate remaining water.
   */
  const remaining = Math.max(
    DAILY_TARGET - totalWater,
    0
  );

  /*
   * Add water.
   */
  function addWater(amount: number) {
    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }

    const newEntry: WaterEntry = {
      id: Date.now(),
      amount,
      time: new Date().toLocaleTimeString(
        "en-IN",
        {
          hour: "2-digit",
          minute: "2-digit",
        }
      ),
    };

    setEntries((prev) => [
      ...prev,
      newEntry,
    ]);
  }

  /*
   * Add custom amount.
   */
  function addCustomWater() {
    const amount = Number(customAmount);

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      return;
    }

    addWater(amount);

    setCustomAmount("");
  }

  /*
   * Delete water entry.
   */
  function removeEntry(id: number) {
    setEntries((prev) =>
      prev.filter(
        (entry) => entry.id !== id
      )
    );
  }

  /*
   * Reset today's water.
   */
  function resetToday() {
    const confirmed = window.confirm(
      "Reset today's water intake?"
    );

    if (!confirmed) {
      return;
    }

    setEntries([]);
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-xl">
            💧
          </div>

          <div>

            <h2 className="text-lg font-bold text-slate-900 sm:text-xl">
              Today&apos;s Water
            </h2>

            <p className="mt-0.5 text-xs text-slate-500 sm:text-sm">
              Stay hydrated throughout the day.
            </p>

          </div>

        </div>

        <button
          type="button"
          onClick={resetToday}
          className="text-xs font-medium text-slate-400 transition hover:text-red-500"
        >
          Reset
        </button>

      </div>

      {/* Main Progress */}
      <div className="mt-6 rounded-xl border border-blue-100 bg-blue-50/60 p-5">

        <div className="flex items-end justify-between gap-4">

          <div>

            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Daily Intake
            </p>

            <div className="mt-1 flex items-baseline gap-1.5">

              <span className="text-3xl font-bold text-slate-900">
                {(totalWater / 1000).toFixed(1)}
              </span>

              <span className="text-sm font-medium text-slate-500">
                / 3.0 L
              </span>

            </div>

          </div>

          <div className="text-right">

            <p className="text-xl font-bold text-blue-600">
              {percentage}%
            </p>

            <p className="text-[11px] text-slate-500">
              daily goal
            </p>

          </div>

        </div>

        {/* Progress Bar */}
        <div className="mt-4 h-3 w-full overflow-hidden rounded-full bg-white">

          <div
            className="h-full rounded-full bg-blue-500 transition-all duration-500"
            style={{
              width: `${percentage}%`,
            }}
          />

        </div>

        {/* Progress Details */}
        <div className="mt-2 flex justify-between text-[11px]">

          <span className="font-medium text-slate-500">
            {totalWater} ml consumed
          </span>

          {remaining > 0 ? (
            <span className="text-slate-400">
              {remaining} ml remaining
            </span>
          ) : (
            <span className="font-semibold text-green-600">
              🎉 Goal reached
            </span>
          )}

        </div>

      </div>

      {/* Quick Add */}
      <div className="mt-6">

        <h3 className="text-sm font-semibold text-slate-900">
          Quick Add
        </h3>

        <p className="mt-0.5 text-xs text-slate-500">
          Add water with one tap.
        </p>

        <div className="mt-3 grid grid-cols-3 gap-2">

          <button
            type="button"
            onClick={() => addWater(250)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            +250 ml
          </button>

          <button
            type="button"
            onClick={() => addWater(500)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            +500 ml
          </button>

          <button
            type="button"
            onClick={() => addWater(1000)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700"
          >
            +1 L
          </button>

        </div>

        {/* Custom Amount */}
        <div className="mt-3 flex gap-2">

          <input
            type="number"
            min="1"
            value={customAmount}
            onChange={(event) =>
              setCustomAmount(
                event.target.value
              )
            }
            placeholder="Custom amount in ml"
            className="min-w-0 flex-1 rounded-xl border border-slate-300 px-3 py-2.5 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />

          <button
            type="button"
            onClick={addCustomWater}
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
          >
            Add
          </button>

        </div>

      </div>

      {/* Today's History */}
      <div className="mt-6 border-t border-slate-100 pt-5">

        <div className="flex items-center justify-between">

          <div>

            <h3 className="text-sm font-semibold text-slate-900">
              Today&apos;s Intake
            </h3>

            <p className="mt-0.5 text-xs text-slate-500">
              {entries.length} drink
              {entries.length !== 1
                ? "s"
                : ""}{" "}
              logged
            </p>

          </div>

          <span className="text-xs font-semibold text-blue-600">
            {(totalWater / 1000).toFixed(1)} L
          </span>

        </div>

        {/* Empty State */}
        {entries.length === 0 ? (

          <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-5 text-center">

            <div className="text-2xl">
              💧
            </div>

            <p className="mt-2 text-sm font-semibold text-slate-700">
              No water logged yet
            </p>

            <p className="mt-1 text-xs text-slate-500">
              Start with a quick-add button above.
            </p>

          </div>

        ) : (

          <div className="mt-3 space-y-2">

            {entries.map((entry) => (

              <div
                key={entry.id}
                className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5"
              >

                <div className="flex items-center gap-3">

                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white text-sm shadow-sm">
                    💧
                  </div>

                  <div>

                    <p className="text-sm font-semibold text-slate-700">
                      {entry.amount >= 1000
                        ? `${entry.amount / 1000} L`
                        : `${entry.amount} ml`}
                    </p>

                    <p className="text-[11px] text-slate-400">
                      {entry.time}
                    </p>

                  </div>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    removeEntry(entry.id)
                  }
                  className="rounded-lg px-2 py-1.5 text-xs text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                  title="Remove"
                >
                  🗑️
                </button>

              </div>

            ))}

          </div>

        )}

      </div>

    </div>
  );
}