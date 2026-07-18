/**
 * Run a legacy/supplementary SQL file against DATABASE_URL (no psql required).
 *
 * For Drizzle-tracked schema (fresh DB or post-baseline), prefer:
 *   npm run db:drizzle-migrate
 *
 * For reference data / seeds on a fresh DB, prefer:
 *   npm run db:seed
 *
 * Usage:
 *   npm run db:sql-migrate -- migrations/_archive/legacy_upgrades/foo.sql
 *   (alias: npm run db:migrate -- <path>)
 */
import "./load-env.ts";
import { runSqlFile } from "./lib/run-sql-file.ts";

const fileArg = process.argv[2];
if (!fileArg) {
  console.error("Usage: npm run db:migrate -- <path-to.sql>");
  process.exit(1);
}

try {
  await runSqlFile({ fileArg });
} catch (err) {
  console.error("Migration failed:", err instanceof Error ? err.message : err);
  process.exit(1);
}
