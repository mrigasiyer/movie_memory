import { z } from "zod";

// Shared movie-title validation, used server-side in both the onboarding action
// and the PUT /api/me/movie route (Variant B). `.trim()` runs before the length
// checks, so whitespace-only input is rejected and the stored value is trimmed.
export const MOVIE_MIN_LENGTH = 1;
export const MOVIE_MAX_LENGTH = 120;

export const movieSchema = z
  .string()
  .trim()
  .min(MOVIE_MIN_LENGTH, "Please enter a movie title.")
  .max(MOVIE_MAX_LENGTH, `Keep it under ${MOVIE_MAX_LENGTH} characters.`);
