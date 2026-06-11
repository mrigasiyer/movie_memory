import OpenAI from "openai";

// The OpenAI client reads OPENAI_API_KEY from the environment automatically.
// This module is server-only — the key must never reach the browser.
const openai = new OpenAI();

// Cap how long we'll wait on OpenAI so a slow/hung request can't block a page
// render indefinitely. Callers handle the thrown error (timeout or API error).
const OPENAI_TIMEOUT_MS = 12_000;

/**
 * Generate a short, fun fact about a movie. Throws on timeout, API error, or an
 * empty response so the caller can decide how to recover (e.g. fall back to a
 * previously cached fact or show a friendly message).
 */
export async function generateMovieFact(movie: string): Promise<string> {
  const completion = await openai.chat.completions.create(
    {
      model: "gpt-4o-mini",
      temperature: 0.8,
      messages: [
        {
          role: "system",
          content:
            "You share fun, surprising, and plausible facts about movies. " +
            "Reply with 1–2 sentences, no preamble, no quotation marks.",
        },
        {
          role: "user",
          content: `Tell me a fun fact about the movie "${movie}".`,
        },
      ],
    },
    { timeout: OPENAI_TIMEOUT_MS },
  );

  const text = completion.choices[0]?.message?.content?.trim();
  if (!text) {
    throw new Error("OpenAI returned an empty response");
  }
  return text;
}
