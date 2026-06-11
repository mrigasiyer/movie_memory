import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { OnboardingForm } from "./OnboardingForm";

// First-time onboarding. Guarded so that:
// - logged-out visitors are sent to the landing page, and
// - users who already chose a movie skip straight to the dashboard.
export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { favoriteMovie: true },
  });
  if (user?.favoriteMovie) {
    redirect("/dashboard");
  }

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 dark:bg-black">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          What&apos;s your favorite movie?
        </h1>
        <p className="mt-2 text-zinc-600 dark:text-zinc-400">
          We&apos;ll use it to surface fun facts on your dashboard.
        </p>
        <OnboardingForm />
      </div>
    </main>
  );
}
