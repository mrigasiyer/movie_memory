import "dotenv/config";
import { defineConfig } from "@prisma/config";

// Prisma 7 moved connection URLs out of schema.prisma. This config is used by
// the Prisma CLI (`prisma migrate`, `prisma db`, `prisma studio`). We point
// migrations at DIRECT_URL — Neon's non-pooled connection — because pgbouncer
// (the pooled DATABASE_URL) doesn't support the session-level operations that
// migrations need. The app runtime connects separately via a driver adapter
// in lib/prisma.ts.
export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DIRECT_URL ?? process.env.DATABASE_URL,
  },
});
