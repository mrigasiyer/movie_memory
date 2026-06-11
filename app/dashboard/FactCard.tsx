"use client";

import { useFact } from "@/hooks/useFact";

// Displays the fun fact for the current movie, with explicit loading / error /
// empty states. "New fact" forces a fresh generation (bypassing the 30s cache).
export function FactCard({ movie }: { movie: string }) {
  const { fact, loading, error, refresh } = useFact(movie);

  return (
    <section className="mt-6 rounded-xl bg-zinc-50 p-5 dark:bg-zinc-800/60">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Fun fact
        </h2>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="text-sm font-medium text-zinc-500 hover:text-zinc-900 disabled:opacity-60 dark:text-zinc-400 dark:hover:text-zinc-100"
        >
          {loading ? "Loading…" : "New fact"}
        </button>
      </div>

      <div className="mt-2 min-h-[1.5rem]">
        {loading && !fact ? (
          <p className="text-zinc-400">Fetching a fun fact…</p>
        ) : error ? (
          <p role="alert" className="text-red-600 dark:text-red-400">
            {error}
          </p>
        ) : fact ? (
          <p className="text-zinc-800 dark:text-zinc-200">{fact}</p>
        ) : (
          <p className="text-zinc-400">No fact yet.</p>
        )}
      </div>
    </section>
  );
}
