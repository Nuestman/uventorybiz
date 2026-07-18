import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Pool } from "pg";
import { env } from "./config/env";
import { pool } from "./config/db";

/**
 * Session configuration for express-session
 * Used for passport sessions (not required for staff auth, but kept for compatibility)
 */
export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    ...(env.USE_NEON_WEBSOCKET
      ? { pool: pool as Pool }
      : { conString: env.DATABASE_URL }),
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  
  const isProduction = env.NODE_ENV === 'production';
  
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: isProduction, // Only require HTTPS in production
      maxAge: sessionTtl,
    },
  });
}

