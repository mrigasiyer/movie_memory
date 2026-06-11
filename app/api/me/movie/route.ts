import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import {
  updateMovieRequestSchema,
  type UpdateMovieResponse,
} from "@/lib/contracts";

// PUT /api/me/movie — update the authenticated user's favorite movie.
// Validates the title server-side (trim + length) and only ever writes to the
// session user's own row.
export async function PUT(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const parsed = updateMovieRequestSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid movie title." },
      { status: 400 },
    );
  }

  const user = await prisma.user.update({
    where: { id: session.user.id },
    data: { favoriteMovie: parsed.data.movie },
  });

  const body: UpdateMovieResponse = { favoriteMovie: user.favoriteMovie! };
  return NextResponse.json(body);
}
