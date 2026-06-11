import { z } from "zod";
import { movieSchema } from "@/lib/validation";

// Single source of truth for the API contract. Each endpoint has a Zod schema;
// the TS types are inferred from it, so the server (route handlers) and the
// client (lib/api.ts) can never drift out of sync. The client also uses these
// schemas to *parse* responses at runtime, catching contract violations.

// GET /api/me
export const meResponseSchema = z.object({
  id: z.string(),
  name: z.string().nullable(),
  email: z.string().nullable(),
  image: z.string().nullable(),
  favoriteMovie: z.string().nullable(),
});
export type Me = z.infer<typeof meResponseSchema>;

// PUT /api/me/movie
export const updateMovieRequestSchema = z.object({ movie: movieSchema });
export type UpdateMovieRequest = z.infer<typeof updateMovieRequestSchema>;

export const updateMovieResponseSchema = z.object({ favoriteMovie: z.string() });
export type UpdateMovieResponse = z.infer<typeof updateMovieResponseSchema>;

// GET /api/fact
export const factResponseSchema = z.object({
  fact: z.string(),
  movie: z.string(),
  createdAt: z.string(), // ISO timestamp
});
export type FactResponse = z.infer<typeof factResponseSchema>;

// Uniform error envelope returned by every endpoint on failure.
export const apiErrorSchema = z.object({ error: z.string() });
export type ApiErrorBody = z.infer<typeof apiErrorSchema>;
