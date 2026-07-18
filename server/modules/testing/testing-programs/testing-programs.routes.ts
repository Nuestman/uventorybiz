import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertTestingProgramSchema } from "@shared/schema";
import { createTestingProgramsController } from "./testing-programs.controller";

export interface TestingProgramsRoutesDeps {
  authMiddleware: RequestHandler;
}

/**
 * Create the testing programs router. Mount at /api.
 * Routes: GET/POST /testing-programs, GET/PUT/DELETE /testing-programs/:id
 */
export function createTestingProgramsRouter(deps: TestingProgramsRoutesDeps): Router {
  const { authMiddleware } = deps;
  const router = Router();
  const controller = createTestingProgramsController(storage);

  router.get("/testing-programs", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId, { programType: req.query.programType as string, status: req.query.status as string });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post(
    "/testing-programs",
    authMiddleware,
    validateBody(insertTestingProgramSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, req.body as z.infer<typeof insertTestingProgramSchema>);
      if (!result.ok) return sendError(res, 500, result.error);
      res.status(201).json(result.data);
    }
  );

  router.get("/testing-programs/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getById(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    if (result.data === null) return sendError(res, 404, "Testing program not found");
    res.json(result.data);
  });

  router.put(
    "/testing-programs/:id",
    authMiddleware,
    validateBody(insertTestingProgramSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  router.delete("/testing-programs/:id", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json({ success: true, message: "Testing program deleted successfully" });
  });

  return router;
}
