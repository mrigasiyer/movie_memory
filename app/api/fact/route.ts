import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createFact, getLatestFact } from "@/lib/facts";
import type { FactResponse } from "@/lib/contracts";

// GET /api/fact — generate and store a fun fact for the user's current movie.
// Failure handling: if OpenAI errors/times out, fall back to the most recent
// stored fact for this movie; if there's none, return a friendly 503.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteMovie: true },
  });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }
  if (!user.favoriteMovie) {
    return NextResponse.json(
      { error: "Set a favorite movie first." },
      { status: 409 },
    );
  }

  try {
    const fact = await createFact(session.user.id, user.favoriteMovie);
    const body: FactResponse = {
      fact: fact.content,
      movie: fact.movie,
      createdAt: fact.createdAt.toISOString(),
    };
    return NextResponse.json(body);
  } catch {
    const latest = await getLatestFact(session.user.id, user.favoriteMovie);
    if (latest) {
      const body: FactResponse = {
        fact: latest.content,
        movie: latest.movie,
        createdAt: latest.createdAt.toISOString(),
      };
      return NextResponse.json(body);
    }
    return NextResponse.json(
      { error: "Couldn't generate a fact right now. Please try again." },
      { status: 503 },
    );
  }
}
