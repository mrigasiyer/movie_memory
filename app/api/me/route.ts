import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import type { Me } from "@/lib/contracts";

// GET /api/me — the authenticated user's profile + favorite movie.
// Authorization: the user is always derived from the session, never from a
// client-supplied id, so a user can only ever read their own record.
export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const body: Me = {
    id: user.id,
    name: user.name,
    email: user.email,
    image: user.image,
    favoriteMovie: user.favoriteMovie,
  };
  return NextResponse.json(body);
}
