import type { RequestHandler } from "express";
import type { z } from "zod";

/**
 * Express middleware that validates req.body against a Zod schema.
 * On success: assigns parsed value to req.body and calls next().
 * On failure: responds with 400 and a consistent JSON error shape.
 */
export function validateBody<T extends z.ZodType>(schema: T): RequestHandler {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (result.success) {
      req.body = result.data;
      next();
      return;
    }
    res.status(400).json({
      message: "Validation failed",
      errors: result.error.flatten().fieldErrors,
    });
  };
}
