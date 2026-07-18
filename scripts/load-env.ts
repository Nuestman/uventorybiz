/**
 * Load environment from project root `.env` only (single source of truth).
 * Import this module before reading process.env in Node scripts and drizzle.config.ts.
 *
 * Do not add .env.local — the server, drizzle-kit, and migration scripts all use .env.
 */
import { config } from "dotenv";
import { resolve } from "node:path";

export const ENV_FILE = resolve(process.cwd(), ".env");

const result = config({ path: ENV_FILE });

if (result.error) {
  const code = (result.error as NodeJS.ErrnoException).code;
  if (code !== "ENOENT") {
    console.warn(`[load-env] Failed to read ${ENV_FILE}:`, result.error.message);
  }
}
