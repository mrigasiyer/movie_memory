"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { api, ApiError } from "@/lib/api";

// Client-side fact cache.
//
// Strategy: keep the last fact + its movie + a timestamp in localStorage. On
// load, reuse the cached fact when it is for the *same* movie and less than
// 30s old — unless the caller forces a refresh ("New fact"). The fact is keyed
// by movie, so changing the favorite movie naturally invalidates the cache.
//
// Why localStorage + a tiny custom hook instead of SWR/React Query: the rules
// here (a hard 30s window, explicit force-refresh, invalidate-on-movie-change)
// are small and specific, and persisting across reloads is the whole point of
// the cache. A 40-line hook expresses exactly that with zero dependencies and
// nothing implicit to explain.

const CACHE_WINDOW_MS = 30_000;
const CACHE_KEY = "movie-memory:lastFact";

type CachedFact = { fact: string; movie: string; timestamp: number };

function readCache(): CachedFact | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    return raw ? (JSON.parse(raw) as CachedFact) : null;
  } catch {
    return null;
  }
}

function writeCache(entry: CachedFact) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // Ignore quota / private-mode errors — caching is best-effort.
  }
}

export function useFact(movie: string) {
  const [fact, setFact] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Guards against races when the movie changes while a request is in flight.
  const requestId = useRef(0);

  const load = useCallback(
    async (force: boolean) => {
      const cached = readCache();
      const isFresh =
        cached !== null &&
        cached.movie === movie &&
        Date.now() - cached.timestamp < CACHE_WINDOW_MS;

      if (!force && isFresh) {
        setFact(cached.fact);
        setError(null);
        return;
      }

      const id = ++requestId.current;
      setLoading(true);
      setError(null);
      try {
        const res = await api.getFact();
        if (id !== requestId.current) return; // a newer request superseded this
        writeCache({ fact: res.fact, movie, timestamp: Date.now() });
        setFact(res.fact);
      } catch (err) {
        if (id !== requestId.current) return;
        setError(
          err instanceof ApiError ? err.message : "Couldn't load a fun fact.",
        );
      } finally {
        if (id === requestId.current) setLoading(false);
      }
    },
    [movie],
  );

  // Load on mount and whenever the movie changes (load() decides cache vs fetch).
  useEffect(() => {
    load(false);
  }, [load]);

  const refresh = useCallback(() => load(true), [load]);

  return { fact, loading, error, refresh };
}
