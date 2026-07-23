import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1).startsWith("postgresql://")
});

export type ServerEnvironment = z.infer<typeof serverEnvironmentSchema>;

export function readServerEnvironment(): ServerEnvironment {
  const parsed = serverEnvironmentSchema.safeParse({
    DATABASE_URL: process.env.DATABASE_URL
  });

  if (!parsed.success) {
    throw new Error(
      "DATABASE_URL is missing or invalid. Copy .env.example to .env and update the PostgreSQL connection string."
    );
  }

  return parsed.data;
}
