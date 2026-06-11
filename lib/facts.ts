import { prisma } from "@/lib/prisma";
import { generateMovieFact } from "@/lib/openai";

// Fact persistence + generation. Kept separate from lib/openai.ts (which only
// talks to OpenAI) so the DB concerns and the API concerns stay decoupled.

/**
 * Generate a fresh fact for the user's movie and store it. The stored row keeps
 * a snapshot of `movie`, so facts stay correctly attributed if the user later
 * changes their favorite movie. Throws if OpenAI generation fails.
 */
export async function createFact(userId: string, movie: string) {
  const content = await generateMovieFact(movie);
  return prisma.fact.create({
    data: { userId, movie, content },
  });
}

/**
 * The user's most recent fact, or null. Optionally scoped to a specific movie
 * (used as a fallback when OpenAI fails, so we return a fact for the *current*
 * movie rather than a stale one from a previous favorite).
 */
export function getLatestFact(userId: string, movie?: string) {
  return prisma.fact.findFirst({
    where: { userId, ...(movie ? { movie } : {}) },
    orderBy: { createdAt: "desc" },
  });
}
