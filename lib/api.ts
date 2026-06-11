import type { ZodType } from "zod";
import {
  apiErrorSchema,
  factResponseSchema,
  meResponseSchema,
  updateMovieResponseSchema,
} from "@/lib/contracts";

// Typed client wrapper for the browser. Responsibilities:
//   - consistent requests (JSON headers, same-origin)
//   - typed responses (every payload is parsed against its Zod schema)
//   - normalized errors (everything that can go wrong becomes an ApiError)

/** Normalized error for any failed request: carries an HTTP-ish status code. */
export class ApiError extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

async function request<T>(
  url: string,
  schema: ZodType<T>,
  init?: RequestInit,
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
  } catch {
    // Network failure / offline — status 0 signals "never reached the server".
    throw new ApiError(0, "Network error. Check your connection and try again.");
  }

  // Parse the body once (tolerating empty bodies).
  let body: unknown = null;
  const text = await res.text();
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = null;
    }
  }

  if (!res.ok) {
    const parsed = apiErrorSchema.safeParse(body);
    throw new ApiError(
      res.status,
      parsed.success ? parsed.data.error : `Request failed (${res.status}).`,
    );
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    throw new ApiError(res.status, "Unexpected response from the server.");
  }
  return parsed.data;
}

export const api = {
  getMe: () => request("/api/me", meResponseSchema),
  getFact: () => request("/api/fact", factResponseSchema),
  updateMovie: (movie: string) =>
    request("/api/me/movie", updateMovieResponseSchema, {
      method: "PUT",
      body: JSON.stringify({ movie }),
    }),
};
