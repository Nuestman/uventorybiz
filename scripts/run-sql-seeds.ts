/**
 * Run ordered seed SQL from migrations/seeds/ (no psql required).
 *
 * Usage:
 *   npm run db:seed              # required/*.sql in lexicographic order
 *   npm run db:seed:optional     # optional/*.sql
 */
import "./load-env.ts";
import { readdirSync } from "node:fs";
import { join } from "node:path";
import { runSqlFile } from "./lib/run-sql-file.ts";

const optional = process.argv.includes("--optional");
const subdir = optional ? "optional" : "required";
const seedsDir = join(process.cwd(), "migrations", "seeds", subdir);

let files: string[];
try {
  files = readdirSync(seedsDir)
    .filter((name) => name.endsWith(".sql"))
    .sort();
} catch {
  console.error(`Seed directory not found: migrations/seeds/${subdir}/`);
  process.exit(1);
}

if (files.length === 0) {
  console.error(`No .sql files in migrations/seeds/${subdir}/`);
  process.exit(1);
}

console.log(`Running ${files.length} seed file(s) from migrations/seeds/${subdir}/ ...`);

for (const file of files) {
  const relativePath = `migrations/seeds/${subdir}/${file}`;
  console.log(`\n--- ${relativePath} ---`);
  try {
    await runSqlFile({ fileArg: relativePath });
  } catch (err) {
    console.error(`Seed failed (${relativePath}):`, err instanceof Error ? err.message : err);
    process.exit(1);
  }
}

console.log(`\nAll ${subdir} seeds applied.`);
