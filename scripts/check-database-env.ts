import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const envPath = resolve(process.cwd(), ".env");

if (!existsSync(envPath)) {
  console.error("Missing .env. Run: copy .env.example .env");
  process.exit(1);
}

const contents = readFileSync(envPath, "utf8");
const match = contents.match(/^DATABASE_URL=(.+)$/m);

if (!match || !match[1].includes("postgresql://")) {
  console.error("DATABASE_URL is missing or is not a PostgreSQL URL.");
  process.exit(1);
}

console.log("Bite2Eat database environment looks valid.");
