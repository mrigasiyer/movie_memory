import { handlers } from "@/lib/auth";

// Mounts NextAuth's route handlers (sign-in, callback, sign-out, session, etc.)
// at /api/auth/*. NextAuth manages the dynamic [...nextauth] params internally.
export const { GET, POST } = handlers;
