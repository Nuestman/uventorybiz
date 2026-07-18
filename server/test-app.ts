import "../env";
import express, { type Request, Response, NextFunction } from "express";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes";
import { sendError } from "./shared/errors";

/**
 * Create an Express app with all API routes mounted, for use with supertest.
 * Does not start the server or set up Vite/static. Used only in integration tests.
 */
export async function createTestApp(): Promise<express.Express> {
  const app = express();
  const jsonBodyLimit = process.env.JSON_BODY_LIMIT ?? "1mb";
  app.use(express.json({ limit: jsonBodyLimit }));
  app.use(express.urlencoded({ extended: false, limit: jsonBodyLimit }));
  app.use(cookieParser());

  await registerRoutes(app);

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    const status = (err as { status?: number; statusCode?: number }).status
      ?? (err as { status?: number; statusCode?: number }).statusCode
      ?? 500;
    const message = err instanceof Error ? err.message : "Internal Server Error";
    sendError(res, status, message);
  });

  return app;
}
