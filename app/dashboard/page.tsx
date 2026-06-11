import { redirect } from "next/navigation";
import { auth, signOut } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { DashboardClient } from "./DashboardClient";

export const dynamic = "force-dynamic";

// Server component: authenticates, guards the route, and renders the static
// profile header + logout. The favorite movie and fun fact are handled by
// DashboardClient (Variant B: client orchestration via the typed API).
export default async function DashboardPage() {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) {
    redirect("/");
  }
  if (!user.favoriteMovie) {
    redirect("/onboarding");
  }

  const displayName = user.name?.trim() || "there";

  return (
    <main className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-12 dark:bg-black">
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-900">
          {/* Profile header (server-rendered, static) */}
          <div className="flex items-center gap-4">
            <Avatar name={user.name} email={user.email} image={user.image} />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-semibold text-zinc-900 dark:text-zinc-50">
                Welcome back, {displayName}
              </h1>
              {user.email ? (
                <p className="truncate text-sm text-zinc-500 dark:text-zinc-400">
                  {user.email}
                </p>
              ) : null}
            </div>
          </div>

          {/* Favorite movie + fun fact (client-orchestrated) */}
          <DashboardClient initialMovie={user.favoriteMovie} />

          {/* Logout */}
          <form
            className="mt-8"
            action={async () => {
              "use server";
              await signOut({ redirectTo: "/" });
            }}
          >
            <button
              type="submit"
              className="h-11 rounded-lg border border-zinc-300 px-5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800"
            >
              Log out
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}

// Avatar with graceful fallback: Google photo when present, else initials.
function Avatar({
  name,
  email,
  image,
}: {
  name: string | null;
  email: string | null;
  image: string | null;
}) {
  if (image) {
    // Plain <img> (not next/image) to avoid configuring remote image domains.
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={image}
        alt={name ?? "Profile photo"}
        className="h-14 w-14 shrink-0 rounded-full object-cover"
        referrerPolicy="no-referrer"
      />
    );
  }

  const initials = getInitials(name, email);
  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-zinc-200 text-lg font-semibold text-zinc-600 dark:bg-zinc-700 dark:text-zinc-200">
      {initials}
    </div>
  );
}

function getInitials(name: string | null, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "?";
  const parts = source.split(/\s+/).filter(Boolean);
  const letters =
    parts.length >= 2
      ? parts[0][0] + parts[parts.length - 1][0]
      : source.slice(0, 2);
  return letters.toUpperCase();
}
