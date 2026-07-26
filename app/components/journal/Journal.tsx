"use client";

import { useState } from "react";

export default function Journal() {
  const [note, setNote] = useState(
    "Completed workout. Feeling energetic today! 💪"
  );

  return (
    <div className="bg-white rounded-2xl shadow p-6 mt-8">
      <div className="flex justify-between items-center mb-4">
        <div>
          <h2 className="text-2xl font-bold">📝 Daily Journal</h2>
          <p className="text-gray-500">
            Record today's thoughts and achievements
          </p>
        </div>

        <button className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700">
          Save
        </button>
      </div>

      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        className="w-full h-48 border rounded-xl p-4 focus:outline-none focus:ring-2 focus:ring-green-500"
        placeholder="Write about your day..."
      />

      <div className="mt-4 text-sm text-gray-500">
        Characters: {note.length}
      </div>
    </div>
  );
}