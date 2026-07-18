/**
 * Builds the Express app with all routes and error handler for use in API integration tests.
 * Does not import env at top level so test runs without DATABASE_URL (e.g. unit-only) do not fail.
 * When getAppForTest() is called, env is loaded and DATABASE_URL must be set.
 */
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { sendError } from "./shared/errors";

export async function getAppForTest(): Promise<express.Express> {
  await import("./config/env");
  const app = express();
  const jsonBodyLimit = process.env.JSON_BODY_LIMIT ?? "1mb";
  app.use(express.json({ limit: jsonBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: jsonBodyLimit }));
  app.use(cookieParser());
  await registerRoutes(app);
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status =
      (err as { status?: number; statusCode?: number }).status ??
      (err as { status?: number; statusCode?: number }).statusCode ??
      500;
    const message = err instanceof Error ? err.message : "Internal Server Error";
    sendError(res, status, message);
  });
  return app;
}
