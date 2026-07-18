import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Pool as NeonPool, neonConfig } from "@neondatabase/serverless";
import pg from "pg";
import ws from "ws";

const LOCK_TIMEOUT_MS = 30_000;
const STATEMENT_TIMEOUT_MS = 10 * 60_000;
const CONNECTION_TIMEOUT_MS = 60_000;

export type DbClient = {
  query: (statement: string) => Promise<unknown>;
  end: () => Promise<void>;
};

export function splitSqlStatements(source: string): string[] {
  const statements: string[] = [];
  let current = "";
  let i = 0;

  while (i < source.length) {
    const ch = source[i];

    if (ch === "-" && source[i + 1] === "-") {
      while (i < source.length && source[i] !== "\n") i++;
      continue;
    }

    if (ch === "$") {
      const match = source.slice(i).match(/^\$([A-Za-z0-9_]*)\$/);
      if (match) {
        const tag = match[0];
        current += tag;
        i += tag.length;

        const end = source.indexOf(tag, i);
        if (end === -1) {
          throw new Error("Unterminated dollar-quoted SQL string in migration file.");
        }

        current += source.slice(i, end + tag.length);
        i = end + tag.length;
        continue;
      }
    }

    if (ch === "'") {
      current += ch;
      i++;
      while (i < source.length) {
        current += source[i];
        if (source[i] === "'" && source[i + 1] === "'") {
          i += 2;
          continue;
        }
        if (source[i] === "'") {
          i++;
          break;
        }
        i++;
      }
      continue;
    }

    if (ch === ";") {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = "";
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

function summarizeStatement(statement: string): string {
  const oneLine = statement.replace(/\s+/g, " ").trim();
  return oneLine.length > 120 ? `${oneLine.slice(0, 117)}...` : oneLine;
}

function isLockTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("lock timeout");
}

function isConnectionTimeoutError(err: unknown): boolean {
  return err instanceof Error && err.message.toLowerCase().includes("timeout expired");
}

async function createDbClient(url: string): Promise<DbClient> {
  const isNeonDatabase = url.includes("neon.tech");
  const databaseDriver = process.env.DATABASE_DRIVER?.trim().toLowerCase() ?? "tcp";
  const useNeonWebSocket = isNeonDatabase && databaseDriver === "websocket";

  if (useNeonWebSocket) {
    neonConfig.webSocketConstructor = ws;
    const pool = new NeonPool({ connectionString: url });
    const client = await pool.connect();
    return {
      query: (statement) => client.query(statement),
      end: async () => {
        client.release();
        await pool.end();
      },
    };
  }

  const client = new pg.Client({
    connectionString: url,
    ssl: isNeonDatabase ? { rejectUnauthorized: false } : undefined,
    connectionTimeoutMillis: CONNECTION_TIMEOUT_MS,
  });
  await client.connect();
  return {
    query: (statement) => client.query(statement),
    end: () => client.end(),
  };
}

export type RunSqlFileOptions = {
  fileArg: string;
  quiet?: boolean;
};

export async function runSqlFile({ fileArg, quiet = false }: RunSqlFileOptions): Promise<void> {
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("DATABASE_URL is not set in .env");
  }

  const sqlPath = resolve(process.cwd(), fileArg);
  const sql = readFileSync(sqlPath, "utf8");
  const statements = splitSqlStatements(sql);

  if (statements.length === 0) {
    throw new Error(`SQL file contains no executable statements: ${fileArg}`);
  }

  const isNeonDatabase = url.includes("neon.tech");
  const databaseDriver = process.env.DATABASE_DRIVER?.trim().toLowerCase() ?? "tcp";
  const useNeonWebSocket = isNeonDatabase && databaseDriver === "websocket";
  const transport = useNeonWebSocket ? "Neon WebSocket" : "PostgreSQL TCP";

  let client: DbClient | undefined;

  try {
    if (!quiet) {
      console.log(`Connecting via ${transport} (timeout ${CONNECTION_TIMEOUT_MS / 1000}s)...`);
    }
    client = await createDbClient(url);
    await client.query(`SET lock_timeout = '${LOCK_TIMEOUT_MS}ms'`);
    await client.query(`SET statement_timeout = '${STATEMENT_TIMEOUT_MS}ms'`);

    if (!quiet) {
      console.log(
        `Running ${statements.length} statement(s) from ${fileArg} (lock timeout ${LOCK_TIMEOUT_MS / 1000}s)...`,
      );
    }

    for (const [index, statement] of statements.entries()) {
      const label = `[${index + 1}/${statements.length}]`;
      if (!quiet) {
        console.log(`${label} ${summarizeStatement(statement)}`);
      }
      await client.query(statement);
      if (!quiet) {
        console.log(`${label} done`);
      }
    }

    if (!quiet) {
      console.log(`Applied: ${fileArg}`);
    }
  } catch (err) {
    if (isLockTimeoutError(err)) {
      throw new Error(
        "Could not acquire table lock within 30s. Stop `npm run dev` (and any other DB clients), then retry.",
      );
    }
    if (isConnectionTimeoutError(err)) {
      throw new Error(
        "Could not connect to the database in time. Stop `npm run dev`, set DATABASE_DRIVER=websocket for Neon, or run the SQL in the Neon console.",
      );
    }
    throw err;
  } finally {
    await client?.end();
  }
}
