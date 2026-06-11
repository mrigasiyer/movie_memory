import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

// NextAuth v5 (Auth.js). We use the Prisma adapter with DATABASE sessions:
// sessions live in the Session table (not a JWT), so the server can always
// resolve the current user from a DB-backed session token. This keeps
// authorization simple — every protected query is scoped by session.user.id.
//
// The Google provider with no explicit config reads AUTH_GOOGLE_ID /
// AUTH_GOOGLE_SECRET from the environment; AUTH_SECRET signs the session cookie.
export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [Google],
  session: { strategy: "database" },
  // Required when self-hosting / running on localhost (no Vercel host header trust).
  trustHost: true,
  callbacks: {
    // With the database strategy this receives the persisted `user` row.
    // Expose the user id on the session so server code can authorize by id.
    session({ session, user }) {
      session.user.id = user.id;
      return session;
    },
  },
});
