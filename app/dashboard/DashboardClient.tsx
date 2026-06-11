"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import { MovieEditor } from "./MovieEditor";
import { FactCard } from "./FactCard";

// Owns the single source of truth for the current movie on the client, so the
// editor and the fact card stay in sync: when the movie is saved, the fact card
// receives the new movie and invalidates its cache automatically.
export function DashboardClient({ initialMovie }: { initialMovie: string }) {
  const [movie, setMovie] = useState(initialMovie);

  // Persist the new movie. Throws (ApiError) on failure so MovieEditor can
  // revert its optimistic update. We only advance the canonical `movie` — and
  // therefore refresh the fact — once the server confirms the change.
  async function handleSave(next: string) {
    const res = await api.updateMovie(next);
    setMovie(res.favoriteMovie);
  }

  return (
    <>
      <section className="mt-8">
        <h2 className="text-xs font-medium uppercase tracking-wide text-zinc-500 dark:text-zinc-400">
          Favorite movie
        </h2>
        <MovieEditor movie={movie} onSave={handleSave} />
      </section>

      <FactCard movie={movie} />
    </>
  );
}
