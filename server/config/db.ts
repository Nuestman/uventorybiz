import { env } from './env';
import { Pool as PgPool, type PoolConfig } from 'pg';
import { Pool as NeonPool, neonConfig } from '@neondatabase/serverless';
import { drizzle as drizzlePg } from 'drizzle-orm/node-postgres';
import { drizzle as drizzleNeon } from 'drizzle-orm/neon-serverless';
import ws from 'ws';
import * as schema from "@shared/schema";
import { logError } from '../logger';

/** Shared by Drizzle and connect-pg-simple when USE_NEON_WEBSOCKET is set. */
export const pool = env.USE_NEON_WEBSOCKET
  ? createNeonPool()
  : createPgPool();

export const db = env.USE_NEON_WEBSOCKET
  ? drizzleNeon(pool as InstanceType<typeof NeonPool>, { schema })
  : drizzlePg(pool as InstanceType<typeof PgPool>, { schema });

pool.on('error', (err) => {
  logError('PostgreSQL pool idle client error (pool will recover on next query)', err);
});

const dbTarget = env.USE_NEON_WEBSOCKET
  ? 'Neon PostgreSQL (WebSocket)'
  : env.USING_NEON_DATABASE
    ? 'Neon PostgreSQL (TCP)'
    : 'local PostgreSQL';
console.log(`✓ Database pool initialized for ${dbTarget}`);

function createNeonPool() {
  neonConfig.webSocketConstructor = ws;
  return new NeonPool({ connectionString: env.DATABASE_URL });
}

function createPgPool() {
  const poolConfig: PoolConfig = {
    connectionString: env.DATABASE_URL,
    max: env.NODE_ENV === 'production' ? 20 : 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 15_000,
    allowExitOnIdle: false,
  };

  if (env.USING_NEON_DATABASE) {
    poolConfig.ssl = { rejectUnauthorized: false };
  }

  return new PgPool(poolConfig);
}
