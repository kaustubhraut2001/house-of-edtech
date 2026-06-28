/**
 * lib/db/prisma.ts
 *
 * Prisma client singleton.
 * Prevents multiple instances during Next.js hot-reload in development.
 */

import { PrismaClient } from "@prisma/client";

// Extend the global object in development to cache the Prisma client
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
  });

// Cache in development to avoid recreating on every hot-reload
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
