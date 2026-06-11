import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

// Prisma 7 no longer ships a bundled query engine binary; the client talks to
// Postgres through a driver adapter. We use @prisma/adapter-pg over the pooled
// DATABASE_URL (Neon pgbouncer), which is the right pool for short-lived
// serverless/request-scoped queries.
//
// In dev, Next.js hot-reload re-evaluates modules repeatedly, which would spawn
// a new client (and connection pool) on every reload. We cache a single client
// on globalThis to avoid exhausting connections.

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({ adapter });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
