import type { DefaultSession } from "next-auth";

// Augment the Session type so `session.user.id` (set in the session callback in
// lib/auth.ts) is typed throughout the app. name / email / image come from
// DefaultSession["user"].
declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}
