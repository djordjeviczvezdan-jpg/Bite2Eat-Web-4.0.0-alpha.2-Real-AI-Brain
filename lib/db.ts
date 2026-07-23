/**
 * Lazy Prisma loader.
 *
 * Keeping the import lazy allows the Next.js UI to build before the developer
 * runs `npm run db:generate`. Once Prisma Client has been generated, this
 * returns the normal shared Prisma singleton.
 */
type PrismaLike = any;

const globalForPrisma = globalThis as unknown as { prisma?: PrismaLike };

export function getDb(): PrismaLike {
  if (globalForPrisma.prisma) return globalForPrisma.prisma;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const clientModule = require("@prisma/client") as {
    PrismaClient?: new (options?: unknown) => PrismaLike;
  };

  if (!clientModule.PrismaClient) {
    throw new Error("Prisma Client has not been generated. Run: npm run db:generate");
  }

  const client = new clientModule.PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"]
  });

  if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = client;
  return client;
}
