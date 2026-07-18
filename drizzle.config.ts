import { defineConfig } from "drizzle-kit";
import "./scripts/load-env.ts";

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set in .env before running drizzle-kit.",
  );
}

export default defineConfig({
  schema: "./shared/schema.ts",
  out: "./drizzle",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL,
  },
  // Fresh installs: run `npm run db:drizzle-migrate` (not push) to avoid rename prompts.
  strict: false,
});
