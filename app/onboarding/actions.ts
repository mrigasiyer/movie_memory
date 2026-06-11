"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { movieSchema } from "@/lib/validation";

export type OnboardingState = { error?: string };

// Server action invoked by the onboarding form. Validates the movie title
// server-side, stores it on the authenticated user, then redirects to the
// dashboard. Returns an { error } state (rendered by the form) on bad input.
export async function saveMovie(
  _prevState: OnboardingState,
  formData: FormData,
): Promise<OnboardingState> {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const parsed = movieSchema.safeParse(formData.get("movie"));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid movie title." };
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { favoriteMovie: parsed.data },
  });

  // redirect() throws internally, so it must stay outside any try/catch.
  redirect("/dashboard");
}
