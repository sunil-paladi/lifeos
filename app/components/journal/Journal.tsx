"use client";

import { useEffect, useMemo, useState } from "react";

type JournalEntry = {
  id: string;
  userId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
};

type EntriesResponse = { success: boolean; entries: JournalEntry[] };
type EntryResponse = { success: boolean; entry: JournalEntry };

async function readApiResponse<T>(response: Response): Promise<T> {
  let data: unknown;

  try {
    data = await response.json();
  } catch {
    throw new Error("The server returned an invalid response.");
  }

  if (!response.ok) {
    const message =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "Request failed.";
    throw new Error(message);
  }

  return data as T;
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(date));
}

export default function Journal() {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadEntries() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/journal");
        const data = await readApiResponse<EntriesResponse>(response);

        if (!cancelled) {
          setEntries(data.entries);
        }
      } catch {
        if (!cancelled) {
          setError("We could not load your journal. Please try again.");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadEntries();

    return () => {
      cancelled = true;
    };
  }, []);

  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return entries;
    }

    return entries.filter(
      (entry) =>
        entry.title.toLowerCase().includes(query) ||
        entry.content.toLowerCase().includes(query)
    );
  }, [entries, search]);

  function resetEditor() {
    setTitle("");
    setContent("");
    setEditingId(null);
  }

  function startEditing(entry: JournalEntry) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setContent(entry.content);
    setError(null);
  }

  async function saveEntry() {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();

    if (!trimmedTitle || !trimmedContent) {
      setError("Title and content are required.");
      return;
    }

    setSaving(true);
    setError(null);
    const editing = editingId !== null;

    try {
      const response = await fetch(
        editing ? `/api/journal/${editingId}` : "/api/journal",
        {
          method: editing ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            title: trimmedTitle,
            content: trimmedContent,
          }),
        }
      );
      const data = await readApiResponse<EntryResponse>(response);

      setEntries((currentEntries) => {
        if (editing) {
          return currentEntries.map((entry) =>
            entry.id === data.entry.id ? data.entry : entry
          );
        }

        return [data.entry, ...currentEntries];
      });
      resetEditor();
    } catch {
      setError(
        editing
          ? "We could not update that entry. Please try again."
          : "We could not save that entry. Please try again."
      );
    } finally {
      setSaving(false);
    }
  }

  async function deleteEntry(entryId: string) {
    if (!window.confirm("Delete this journal entry?")) {
      return;
    }

    setDeletingId(entryId);
    setError(null);

    try {
      const response = await fetch(`/api/journal/${entryId}`, {
        method: "DELETE",
      });
      await readApiResponse<{ success: boolean }>(response);
      setEntries((currentEntries) =>
        currentEntries.filter((entry) => entry.id !== entryId)
      );

      if (editingId === entryId) {
        resetEditor();
      }
    } catch {
      setError("We could not delete that entry. Please try again.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-xl">
            📝
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Journal Entries</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Capture thoughts, progress, and ideas in one place.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => {
            resetEditor();
            setError(null);
          }}
          className="rounded-lg bg-violet-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-violet-700"
        >
          + New Entry
        </button>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
          {error}
        </p>
      )}

      <div className="mt-5">
        <label htmlFor="journal-search" className="sr-only">
          Search journal entries
        </label>
        <input
          id="journal-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search entries..."
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-100"
        />
      </div>

      <div className="mt-5 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-sm font-semibold text-slate-800">
            {editingId ? "Edit Entry" : "New Entry"}
          </h3>
          {editingId && (
            <button
              type="button"
              onClick={resetEditor}
              className="text-xs font-medium text-slate-500 hover:text-violet-700"
            >
              Cancel edit
            </button>
          )}
        </div>
        <label htmlFor="journal-title" className="mt-3 block text-xs font-medium text-slate-600">
          Title *
        </label>
        <input
          id="journal-title"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          placeholder="Entry title"
          className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
        <label htmlFor="journal-content" className="mt-3 block text-xs font-medium text-slate-600">
          Write about your day *
        </label>
        <textarea
          id="journal-content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          placeholder="Write about your day..."
          className="mt-1 h-28 w-full resize-none rounded-lg border border-slate-200 bg-white p-3 text-sm text-slate-700 outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-100"
        />
        <div className="mt-3 flex justify-end">
          <button
            type="button"
            onClick={() => void saveEntry()}
            disabled={saving || !title.trim() || !content.trim()}
            className="rounded-lg bg-violet-600 px-4 py-2 text-xs font-semibold text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {saving ? "Saving..." : editingId ? "Update Entry" : "Save Entry"}
          </button>
        </div>
      </div>

      <div className="mt-6">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-800">Your entries</h3>
          {!loading && <span className="text-xs text-slate-400">{filteredEntries.length} shown</span>}
        </div>

        {loading ? (
          <p className="rounded-xl bg-slate-50 px-3 py-8 text-center text-sm text-slate-500">
            Loading journal entries...
          </p>
        ) : filteredEntries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-3 py-8 text-center text-sm text-slate-500">
            {search ? "No entries match your search." : "No journal entries yet."}
          </p>
        ) : (
          <div className="space-y-3">
            {filteredEntries.map((entry) => (
              <article
                key={entry.id}
                className="rounded-xl border border-slate-200 bg-white p-4 transition hover:border-violet-200"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h4 className="truncate text-sm font-semibold text-slate-900">
                      {entry.title}
                    </h4>
                    <p className="mt-1 text-[11px] text-slate-400">
                      {formatDate(entry.updatedAt)}
                      {entry.updatedAt !== entry.createdAt && " · Updated"}
                    </p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      onClick={() => startEditing(entry)}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 hover:border-violet-300 hover:bg-violet-50 hover:text-violet-700"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => void deleteEntry(entry.id)}
                      disabled={deletingId === entry.id}
                      className="rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs text-slate-400 hover:border-red-200 hover:bg-red-50 hover:text-red-600 disabled:opacity-50"
                    >
                      Delete
                    </button>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                  {entry.content}
                </p>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
