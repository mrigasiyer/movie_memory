"use client";

import { useEffect, useState } from "react";
import { ApiError } from "@/lib/api";
import { MOVIE_MAX_LENGTH } from "@/lib/validation";

// Inline editor for the favorite movie with optimistic UI:
// on save we immediately show the new title and close the editor; if the server
// rejects/fails we revert to the previous title and reopen with an error.
//
// `onSave` performs the actual API write (in the parent) and throws on failure.
export function MovieEditor({
  movie,
  onSave,
}: {
  movie: string;
  onSave: (next: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(movie);
  // Optimistically-displayed title; kept in sync with the confirmed `movie`.
  const [display, setDisplay] = useState(movie);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDisplay(movie);
  }, [movie]);

  function startEdit() {
    setValue(display);
    setError(null);
    setEditing(true);
  }

  function cancel() {
    setEditing(false);
    setError(null);
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const trimmed = value.trim();
    if (!trimmed) {
      setError("Please enter a movie title.");
      return;
    }
    if (trimmed === display) {
      cancel();
      return;
    }

    const previous = display;
    setError(null);
    setSaving(true);
    setDisplay(trimmed); // optimistic
    setEditing(false);
    try {
      await onSave(trimmed);
    } catch (err) {
      setDisplay(previous); // revert
      setValue(trimmed); // keep their text so they can retry
      setEditing(true);
      setError(
        err instanceof ApiError ? err.message : "Couldn't save. Please try again.",
      );
    } finally {
      setSaving(false);
    }
  }

  if (!editing) {
    return (
      <div className="mt-1 flex items-center gap-3">
        <p className="text-lg font-medium text-zinc-900 dark:text-zinc-50">
          {display}
        </p>
        <button
          type="button"
          onClick={startEdit}
          className="text-sm font-medium text-zinc-500 underline-offset-2 hover:text-zinc-900 hover:underline dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          Edit
        </button>
        {saving ? (
          <span className="text-sm text-zinc-400">Saving…</span>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="mt-1 flex flex-col gap-2">
      <div className="flex flex-wrap gap-2">
        <input
          autoFocus
          value={value}
          maxLength={MOVIE_MAX_LENGTH}
          onChange={(e) => setValue(e.target.value)}
          aria-label="Favorite movie"
          className="h-10 flex-1 rounded-lg border border-zinc-300 bg-white px-3 text-base text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50"
        />
        <button
          type="submit"
          disabled={saving}
          className="h-10 rounded-lg bg-zinc-900 px-4 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          className="h-10 rounded-lg border border-zinc-300 px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
        >
          Cancel
        </button>
      </div>
      {error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : null}
    </form>
  );
}
