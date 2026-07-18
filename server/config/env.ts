import { config } from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Get the directory name of the current module (server/config/)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root (single source of truth — see scripts/load-env.ts)
config({ path: resolve(__dirname, '../../.env') });

// Validate required environment variables
// DATABASE_URL should be set to Neon connection string
// Format: postgresql://user:password@host/database?sslmode=require
if (!process.env.DATABASE_URL) {
  throw new Error(
    'DATABASE_URL must be set in .env file. ' +
    'For Neon: postgresql://user:password@host/database?sslmode=require'
  );
}

// Detect if using Neon (connection string contains neon.tech or similar)
const isNeonDatabase = process.env.DATABASE_URL.includes('neon.tech');

export type DatabaseDriver = 'tcp' | 'websocket';

function parseDatabaseDriver(): DatabaseDriver {
  const raw = process.env.DATABASE_DRIVER?.trim().toLowerCase();
  if (!raw || raw === 'tcp') {
    return 'tcp';
  }
  if (raw === 'websocket') {
    return 'websocket';
  }
  throw new Error('DATABASE_DRIVER must be "tcp" or "websocket"');
}

const databaseDriver = parseDatabaseDriver();

if (databaseDriver === 'websocket' && !isNeonDatabase) {
  throw new Error(
    'DATABASE_DRIVER=websocket requires a Neon DATABASE_URL (hostname contains neon.tech)',
  );
}

/** Neon over WebSocket when DATABASE_DRIVER=websocket; otherwise TCP via node-pg. */
const useNeonWebSocket = isNeonDatabase && databaseDriver === 'websocket';

/**
 * Kill switch for the hourly DB crons (appointment no-show, telecare expiry backup).
 * Set HOURLY_CRON_JOBS_ENABLED=false to let Neon Free scale to zero between real traffic.
 * Daily/weekly crons (duty spawner, reminders, health report) are unaffected.
 */
const hourlyCronJobsEnabled =
  process.env.HOURLY_CRON_JOBS_ENABLED?.trim().toLowerCase() !== 'false';

// Determine FRONTEND_URL
// Priority: FRONTEND_URL (manual) > RAILWAY_PUBLIC_DOMAIN (Railway auto) > localhost
let frontendUrl = 'http://localhost:17009';
if (process.env.FRONTEND_URL) {
  frontendUrl = process.env.FRONTEND_URL;
} else if (process.env.RAILWAY_PUBLIC_DOMAIN) {
  // Railway automatically sets RAILWAY_PUBLIC_DOMAIN for custom domains
  frontendUrl = `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
}

export const env = {
  DATABASE_URL: process.env.DATABASE_URL,
  /** tcp (default) | websocket — websocket avoids Neon TCP issues on some local networks */
  DATABASE_DRIVER: databaseDriver,
  USE_NEON_WEBSOCKET: useNeonWebSocket,
  NODE_ENV: process.env.NODE_ENV || 'development',
  USING_NEON_DATABASE: isNeonDatabase,
  /** false ⇒ skip hourly crons (appointment no-show, telecare expiry backup); default true */
  HOURLY_CRON_JOBS_ENABLED: hourlyCronJobsEnabled,
  BLOB_READ_WRITE_TOKEN: process.env.BLOB_READ_WRITE_TOKEN, // Optional - for Vercel Blob storage
  FRONTEND_URL: frontendUrl,
  /** Google Cloud OAuth 2.0 Client (OIDC). Both required to enable “Continue with Google”. */
  GOOGLE_OIDC_CLIENT_ID: process.env.GOOGLE_OIDC_CLIENT_ID,
  GOOGLE_OIDC_CLIENT_SECRET: process.env.GOOGLE_OIDC_CLIENT_SECRET,
  /** Microsoft Entra app registration. All required to enable “Continue with Microsoft”. */
  MICROSOFT_OIDC_CLIENT_ID: process.env.MICROSOFT_OIDC_CLIENT_ID,
  MICROSOFT_OIDC_CLIENT_SECRET: process.env.MICROSOFT_OIDC_CLIENT_SECRET,
  /** e.g. organizations | common | or a directory (tenant) GUID */
  MICROSOFT_OIDC_TENANT: process.env.MICROSOFT_OIDC_TENANT?.trim() || 'organizations',
  /** Telehealth default provider: livekit (default) | teams */
  TELEHEALTH_PROVIDER: process.env.TELEHEALTH_PROVIDER?.trim().toLowerCase() || "livekit",
  /** LiveKit WebRTC telehealth */
  LIVEKIT_API_KEY: process.env.LIVEKIT_API_KEY?.trim(),
  LIVEKIT_API_SECRET: process.env.LIVEKIT_API_SECRET?.trim(),
  /** WebSocket URL patients/clinicians connect to, e.g. wss://your-project.livekit.cloud */
  LIVEKIT_WS_URL: process.env.LIVEKIT_WS_URL?.trim(),
  /** HTTP API URL for room management, e.g. https://your-project.livekit.cloud */
  LIVEKIT_HTTP_URL: process.env.LIVEKIT_HTTP_URL?.trim(),
  /** Microsoft Graph — Teams online meetings (when TELEHEALTH_PROVIDER=teams) */
  TEAMS_GRAPH_TENANT_ID:
    process.env.TEAMS_GRAPH_TENANT_ID?.trim() ||
    process.env.MICROSOFT_OIDC_TENANT?.trim() ||
    "organizations",
  TEAMS_GRAPH_CLIENT_ID: process.env.TEAMS_GRAPH_CLIENT_ID || process.env.MICROSOFT_OIDC_CLIENT_ID,
  TEAMS_GRAPH_CLIENT_SECRET:
    process.env.TEAMS_GRAPH_CLIENT_SECRET || process.env.MICROSOFT_OIDC_CLIENT_SECRET,
  TEAMS_ORGANIZER_USER_ID: process.env.TEAMS_ORGANIZER_USER_ID?.trim(),
  TEAMS_ORGANIZER_EMAIL: process.env.TEAMS_ORGANIZER_EMAIL?.trim(),
} as const;
