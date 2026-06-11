"use client";

import { useActionState } from "react";
import { saveMovie, type OnboardingState } from "./actions";
import { MOVIE_MAX_LENGTH } from "@/lib/validation";

const initialState: OnboardingState = {};

// Client form wired to the saveMovie server action via React 19's useActionState,
// which gives us the returned error state and a pending flag for free.
export function OnboardingForm() {
  const [state, formAction, pending] = useActionState(saveMovie, initialState);

  return (
    <form action={formAction} className="mt-6 flex flex-col gap-3">
      <input
        name="movie"
        type="text"
        required
        maxLength={MOVIE_MAX_LENGTH}
        autoFocus
        placeholder="e.g. The Grand Budapest Hotel"
        aria-label="Favorite movie"
        className="h-12 rounded-lg border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none focus:border-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-50 dark:focus:border-zinc-300"
      />

      {state.error ? (
        <p role="alert" className="text-sm text-red-600 dark:text-red-400">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="h-12 rounded-lg bg-zinc-900 text-base font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-60 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {pending ? "Saving…" : "Continue"}
      </button>
    </form>
  );
}
