import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../../storage";
import { validateBody } from "../../../shared/validation";
import { sendError } from "../../../shared/errors";
import { insertDutyAssignmentSchema } from "@shared/schema";
import { createDutyAssignmentsController } from "./duty-assignments.controller";
import type { DutyAssignmentHistoryFilters } from "./duty-assignments.controller";

export interface DutyAssignmentsRoutesDeps {
  authMiddleware: RequestHandler;
  injectLocationMiddleware?: RequestHandler;
}

async function resolveTenantId(req: any): Promise<string | null> {
  let tenantId = req.user?.tenantId || req.tenantId;
  if (!tenantId && req.user?.id) {
    const fullUser = await storage.getUserById(req.user.id);
    tenantId = fullUser?.tenantId ?? null;
  }
  return tenantId ?? null;
}

/**
 * Create the duty assignments and completions router. Mount at /api.
 */
export function createDutyAssignmentsRouter(deps: DutyAssignmentsRoutesDeps): Router {
  const { authMiddleware, injectLocationMiddleware } = deps;
  const router = Router();
  const controller = createDutyAssignmentsController(storage);

  const createStack = [
    authMiddleware,
    ...(injectLocationMiddleware ? [injectLocationMiddleware] : []),
    validateBody(insertDutyAssignmentSchema),
  ];

  router.post(
    "/duty-assignments",
    ...createStack,
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof insertDutyAssignmentSchema> & { assignmentDate?: string };
      const assignmentData = {
        ...body,
        assignmentDate: body.assignmentDate ? new Date(body.assignmentDate) : new Date(),
      };
      const result = await controller.create(tenantId, req.user.id, assignmentData);
      if (!result.ok) return sendError(res, 500, result.error);
      res.status(201).json(result.data);
    }
  );

  router.get("/duty-assignments", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const from = req.query.from as string | undefined;
    const to = req.query.to as string | undefined;
    const locationId = (req.query.locationId as string)?.trim() || undefined;
    const status = (req.query.status as string)?.trim() || undefined;
    const userId = (req.query.userId as string)?.trim() || undefined;
    if (from && to) {
      const fromDate = new Date(from);
      const toDate = new Date(to);
      if (!isNaN(fromDate.getTime()) && !isNaN(toDate.getTime())) {
        const result = await controller.listByDateRange(tenantId, fromDate, toDate, locationId, status, userId);
        if (!result.ok) return sendError(res, 500, result.error);
        return res.json(result.data);
      }
    }
    const date = req.query.date ? new Date(req.query.date as string) : undefined;
    const result = await controller.list(tenantId, date, locationId, status, userId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/duty-assignments/today", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const locationId = (req.query.locationId as string)?.trim() || undefined;
    const status = (req.query.status as string)?.trim() || undefined;
    const userId = (req.query.userId as string)?.trim() || undefined;
    const result = await controller.getToday(tenantId, locationId, status, userId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/duty-assignments/history", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getHistory(tenantId, parseDutyAssignmentHistoryFilters(req.query));
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/duty-assignments/analytics", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { date, locationId } = req.query;
    const result = await controller.getAnalytics(tenantId, {
      date: date as string,
      locationId: locationId as string,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  const updateStack = [
    authMiddleware,
    ...(injectLocationMiddleware ? [injectLocationMiddleware] : []),
    validateBody(insertDutyAssignmentSchema.partial()),
  ];
  router.put(
    "/duty-assignments/:id",
    ...updateStack,
    async (req: any, res) => {
      const tenantId = await resolveTenantId(req);
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.update(req.params.id, tenantId, undefined, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.json(result.data);
    }
  );

  const completeStack = [
    authMiddleware,
    ...(injectLocationMiddleware ? [injectLocationMiddleware] : []),
  ];
  router.post("/duty-assignments/:id/complete", ...completeStack, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user?.id;
    if (!tenantId || !userId) return sendError(res, 400, "Missing tenant or user information");
    const { notes, startedAt, locationId } = req.body;
    let startedAtDate: Date | null = null;
    if (startedAt && typeof startedAt === "string" && startedAt.trim()) {
      const today = new Date();
      const [hours, minutes] = startedAt.split(":").map(Number);
      if (!isNaN(hours) && !isNaN(minutes)) {
        startedAtDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hours, minutes);
      }
    }
    const result = await controller.complete(req.params.id, userId, tenantId, {
      notes,
      startedAt: startedAtDate,
      locationId: locationId as string | undefined,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/duty-assignments/:id/cancel", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    const userId = req.user?.id;
    if (!tenantId || !userId) return sendError(res, 400, "Missing tenant or user information");
    const result = await controller.cancel(
      req.params.id,
      userId,
      tenantId,
      req.body?.cancellationReason
    );
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.patch("/duty-assignments/:id/status", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { status, notes } = req.body;
    const updateData: Record<string, unknown> = { status, updatedAt: new Date() };
    if (status === "completed") {
      updateData.completedAt = new Date();
      updateData.completedById = req.user.id;
      if (notes) updateData.notes = notes;
    }
    const result = await controller.update(req.params.id, tenantId, req.user.id, updateData);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.delete("/duty-assignments/:id", authMiddleware, async (req: any, res) => {
    const tenantId = await resolveTenantId(req);
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.post("/duty-completions", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.createCompletion(tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });

  router.get("/duty-completions", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const date = req.query.date ? new Date(req.query.date as string) : undefined;
    const result = await controller.listCompletions(tenantId, date);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/duty-completions/assignment/:assignmentId", authMiddleware, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.getCompletionsByAssignment(req.params.assignmentId, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}

function parseDutyAssignmentHistoryFilters(query: Record<string, unknown>): DutyAssignmentHistoryFilters {
  const pageRaw = query.page;
  const pageSizeRaw = query.pageSize;
  const page =
    pageRaw !== undefined && pageRaw !== "" ? Math.max(1, parseInt(String(pageRaw), 10) || 1) : undefined;
  const pageSize =
    pageSizeRaw !== undefined && pageSizeRaw !== ""
      ? Math.min(100, Math.max(1, parseInt(String(pageSizeRaw), 10) || 25))
      : undefined;

  return {
    date: typeof query.date === "string" ? query.date : undefined,
    status: typeof query.status === "string" ? query.status : undefined,
    userId: typeof query.userId === "string" ? query.userId : undefined,
    locationId: typeof query.locationId === "string" ? query.locationId : undefined,
    page,
    pageSize,
    search: typeof query.search === "string" ? query.search : undefined,
  };
}
