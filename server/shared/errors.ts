import type { Response } from "express";

/** Standard API error response shape */
export interface ApiErrorBody {
  message: string;
  code?: string;
  errors?: unknown;
}

/**
 * Send a consistent JSON error response. Use in route handlers and middleware.
 */
export function sendError(
  res: Response,
  status: number,
  message: string,
  details?: { code?: string; errors?: unknown }
): void {
  const body: ApiErrorBody = { message };
  if (details?.code) body.code = details.code;
  if (details?.errors !== undefined) body.errors = details.errors;
  res.status(status).json(body);
}
