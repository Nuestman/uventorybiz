/**
 * Mark Drizzle journal migrations as already applied on an existing database
 * (dev/prod that were built via legacy SQL migrations + db:push).
 *
 * Does NOT run migration SQL — only inserts rows into drizzle.__drizzle_migrations.
 *
 * Usage:
 *   npm run db:drizzle-baseline -- --confirm
 *
 * Prerequisites:
 *   - DATABASE_URL points at the target DB
 *   - Schema already matches shared/schema.ts (sanity-check: encounters table exists)
 */
import "./load-env.ts";
import { createHash } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import ws from "ws";

const MIGRATIONS_FOLDER = resolve(process.cwd(), "drizzle");
const JOURNAL_PATH = resolve(MIGRATIONS_FOLDER, "meta/_journal.json");

const args = process.argv.slice(2);
if (!args.includes("--confirm")) {
  console.error(
    "Refusing to baseline without --confirm.\n" +
      "This marks all drizzle/*.sql journal entries as applied without executing them.\n" +
      "Usage: npm run db:drizzle-baseline -- --confirm",
  );
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set in .env");
  process.exit(1);
}

type Journal = {
  entries: Array<{ tag: string; when: number; breakpoints: boolean }>;
};

type MigrationRecord = {
  tag: string;
  hash: string;
  when: number;
};

function loadJournalMigrations(): MigrationRecord[] {
  if (!existsSync(JOURNAL_PATH)) {
    throw new Error(`Missing ${JOURNAL_PATH}. Run npm run db:generate first.`);
  }
  const journal = JSON.parse(readFileSync(JOURNAL_PATH, "utf8")) as Journal;
  return journal.entries.map((entry) => {
    const sqlPath = resolve(MIGRATIONS_FOLDER, `${entry.tag}.sql`);
    const sql = readFileSync(sqlPath, "utf8");
    return {
      tag: entry.tag,
      hash: createHash("sha256").update(sql).digest("hex"),
      when: entry.when,
    };
  });
}

async function createClient() {
  const isNeon = url.includes("neon.tech");
  const driver = process.env.DATABASE_DRIVER?.trim().toLowerCase() ?? "tcp";
  const useWs = isNeon && driver === "websocket";

  if (useWs) {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString: url });
    const client = await pool.connect();
    return {
      query: (text: string, params?: unknown[]) => client.query(text, params),
      end: async () => {
        client.release();
        await pool.end();
      },
    };
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: isNeon ? { rejectUnauthorized: false } : undefined,
  });
  await client.connect();
  return {
    query: (text: string, params?: unknown[]) => client.query(text, params),
    end: () => client.end(),
  };
}

const migrations = loadJournalMigrations();
let client: Awaited<ReturnType<typeof createClient>> | undefined;

try {
  client = await createClient();

  const schemaCheck = await client.query(
    `SELECT 1 FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'encounters'`,
  );
  if (schemaCheck.rowCount === 0) {
    console.error(
      "encounters table not found. This DB looks empty — use npm run db:drizzle-migrate instead of baseline.",
    );
    process.exit(1);
  }

  await client.query(`CREATE SCHEMA IF NOT EXISTS drizzle`);
  await client.query(`
    CREATE TABLE IF NOT EXISTS drizzle.__drizzle_migrations (
      id SERIAL PRIMARY KEY,
      hash text NOT NULL,
      created_at bigint
    )
  `);
  await client.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS idx_drizzle_migrations_hash
    ON drizzle.__drizzle_migrations (hash)
  `);


  let inserted = 0;
  for (const m of migrations) {
    const insertResult = await client.query(
      `INSERT INTO drizzle.__drizzle_migrations (hash, created_at) VALUES ($1, $2)
       ON CONFLICT (hash) DO NOTHING
       RETURNING id`,
      [m.hash, m.when],
    );
    if (insertResult.rowCount === 0) {
      console.log(`skip (already recorded): ${m.tag}`);
      continue;
    }
    console.log(`baselined: ${m.tag}`);
    inserted++;
  }

  console.log(
    inserted > 0
      ? `Baseline complete. Recorded ${inserted} migration(s) in drizzle.__drizzle_migrations.`
      : "Nothing to baseline — all journal migrations already recorded.",
  );
  console.log("Future schema changes: edit shared/schema.ts → npm run db:generate → npm run db:drizzle-migrate");
} catch (err) {
  console.error("Baseline failed:", err instanceof Error ? err.message : err);
  process.exit(1);
} finally {
  await client?.end();
}
