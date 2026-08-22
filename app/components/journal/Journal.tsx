"use client";

import { useEffect, useState } from "react";

type Mood = "Great" | "Good" | "Okay" | "Low";

type JournalData = {
  date: string;
  note: string;
  achievement: string;
  learning: string;
  mood: Mood;
};

const STORAGE_KEY = "lifeos-daily-journal";

const DEFAULT_NOTE =
  "Completed workout. Feeling energetic today! 💪";

export default function Journal() {
  const [note, setNote] = useState(DEFAULT_NOTE);
  const [achievement, setAchievement] = useState("");
  const [learning, setLearning] = useState("");
  const [mood, setMood] = useState<Mood>("Good");

  const [saved, setSaved] = useState(false);
  const [loaded, setLoaded] = useState(false);

  /*
   * Load today's journal
   */
  useEffect(() => {
    try {
      const savedData = localStorage.getItem(STORAGE_KEY);

      if (!savedData) {
        setLoaded(true);
        return;
      }

      const parsed: JournalData = JSON.parse(savedData);

      const today = new Date()
        .toISOString()
        .split("T")[0];

      // Only load today's journal
      if (parsed.date === today) {
        setNote(parsed.note ?? "");
        setAchievement(parsed.achievement ?? "");
        setLearning(parsed.learning ?? "");
        setMood(parsed.mood ?? "Good");
      } else {
        // New day → start a fresh journal
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (error) {
      console.error(
        "Failed to load journal:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  /*
   * Save journal
   */
  function handleSave() {
    const today = new Date()
      .toISOString()
      .split("T")[0];

    const journalData: JournalData = {
      date: today,
      note,
      achievement,
      learning,
      mood,
    };

    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(journalData)
      );

      setSaved(true);

      setTimeout(() => {
        setSaved(false);
      }, 3000);
    } catch (error) {
      console.error(
        "Failed to save journal:",
        error
      );
    }
  }

  const totalCharacters =
    note.length +
    achievement.length +
    learning.length;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">

        <div className="flex items-start gap-3">

          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-green-50 text-xl">
            📝
          </div>

          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Daily Journal
            </h2>

            <p className="mt-0.5 text-xs text-slate-500">
              Record today&apos;s thoughts and achievements
            </p>
          </div>

        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={!loaded}
          className="rounded-lg bg-green-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {saved ? "✓ Saved" : "Save"}
        </button>

      </div>


      {/* Today's Date */}
      <div className="mt-4 rounded-lg bg-slate-50 px-3 py-2">
        <p className="text-xs font-medium text-slate-500">
          📅 Today&apos;s Entry
        </p>
      </div>


      {/* Mood */}
      <div className="mt-4">

        <label className="text-sm font-semibold text-slate-700">
          How are you feeling today?
        </label>

        <div className="mt-2 grid grid-cols-4 gap-2">

          {[
            { value: "Great", emoji: "😄" },
            { value: "Good", emoji: "🙂" },
            { value: "Okay", emoji: "😐" },
            { value: "Low", emoji: "😔" },
          ].map((item) => (

            <button
              key={item.value}
              type="button"
              onClick={() =>
                setMood(item.value as Mood)
              }
              className={`rounded-lg border px-2 py-2 text-xs font-medium transition ${
                mood === item.value
                  ? "border-green-500 bg-green-50 text-green-700"
                  : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
              }`}
            >
              <span className="mr-1">
                {item.emoji}
              </span>

              {item.value}
            </button>

          ))}

        </div>

      </div>


      {/* Today's Thoughts */}
      <div className="mt-4">

        <label className="text-sm font-semibold text-slate-700">
          Today&apos;s Thoughts
        </label>

        <textarea
          value={note}
          onChange={(e) =>
            setNote(e.target.value)
          }
          className="mt-2 h-32 w-full resize-none rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
          placeholder="Write about your day..."
        />

      </div>


      {/* Achievement + Learning */}
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">

        {/* Achievement */}
        <div>

          <label className="text-sm font-semibold text-slate-700">
            🏆 Today&apos;s Achievement
          </label>

          <textarea
            value={achievement}
            onChange={(e) =>
              setAchievement(e.target.value)
            }
            className="mt-2 h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
            placeholder="What did you accomplish today?"
          />

        </div>


        {/* Learning */}
        <div>

          <label className="text-sm font-semibold text-slate-700">
            💡 What I Learned
          </label>

          <textarea
            value={learning}
            onChange={(e) =>
              setLearning(e.target.value)
            }
            className="mt-2 h-24 w-full resize-none rounded-xl border border-slate-200 p-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-green-500 focus:ring-2 focus:ring-green-100"
            placeholder="What did you learn today?"
          />

        </div>

      </div>


      {/* Footer */}
      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">

        <span className="text-xs text-slate-400">
          Mood:{" "}
          <span className="font-semibold text-slate-600">
            {mood}
          </span>
        </span>

        <span className="text-xs text-slate-400">
          Characters: {totalCharacters}
        </span>

      </div>


      {/* Saved Message */}
      {saved && (
        <div className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-xs font-medium text-green-700">
          ✓ Journal entry saved successfully.
        </div>
      )}

    </div>
  );
}