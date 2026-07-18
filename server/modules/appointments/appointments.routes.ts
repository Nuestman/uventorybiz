import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import { insertAppointmentSchema, updateAppointmentSchema } from "@shared/schema";
import { createAppointmentsController } from "./appointments.controller";

export interface AppointmentsRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

/**
 * Create the appointments router. Mount at /api so that routes are
 * /api/appointments and /api/appointments/:id.
 */
export function createAppointmentsRouter(deps: AppointmentsRoutesDeps): Router {
  const { authMiddleware, requireClinicalAccess, injectLocationMiddleware } = deps;
  const router = Router();
  const controller = createAppointmentsController(storage);

  router.post(
    "/appointments",
    authMiddleware,
    requireClinicalAccess,
    injectLocationMiddleware,
    validateBody(insertAppointmentSchema.omit({ medicalStaffId: true })),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof insertAppointmentSchema>;
      const appointmentData = { ...body, medicalStaffId: req.user.claims?.sub || req.user.id };
      const result = await controller.create(tenantId, req.user.id, appointmentData);
      if (!result.ok) {
        if (result.code === "CONFLICT") return sendError(res, 409, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    }
  );

  router.get("/appointments", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const { employeeId, today, start, end, page, pageSize, search, status, appointmentType } = req.query;
    const startDate = typeof start === "string" ? new Date(start) : undefined;
    const endDate = typeof end === "string" ? new Date(end) : undefined;
    const pageNum =
      typeof page === "string" && /^\d+$/.test(page) ? Math.max(1, parseInt(page, 10)) : undefined;
    const pageSizeNum =
      typeof pageSize === "string" && /^\d+$/.test(pageSize)
        ? Math.min(100, Math.max(1, parseInt(pageSize, 10)))
        : undefined;
    const result = await controller.list(tenantId, {
      employeeId: employeeId as string | undefined,
      today: today === "true",
      start: startDate && !Number.isNaN(startDate.getTime()) ? startDate : undefined,
      end: endDate && !Number.isNaN(endDate.getTime()) ? endDate : undefined,
      page: pageNum,
      pageSize: pageSizeNum,
      search: typeof search === "string" ? search : undefined,
      status: typeof status === "string" ? status : undefined,
      appointmentType: typeof appointmentType === "string" ? appointmentType : undefined,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  const handleUpdate = async (req: any, res: any) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const appointmentData = req.body as z.infer<typeof updateAppointmentSchema>;
    const result = await controller.update(req.params.id, tenantId, userId, appointmentData);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      if (result.code === "CONFLICT") return sendError(res, 409, result.error);
      if (result.code === "INVALID_STATE") return sendError(res, 409, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  };

  router.put(
    "/appointments/:id",
    authMiddleware,
    requireClinicalAccess,
    validateBody(updateAppointmentSchema),
    handleUpdate
  );

  router.patch(
    "/appointments/:id",
    authMiddleware,
    requireClinicalAccess,
    validateBody(updateAppointmentSchema),
    handleUpdate
  );

  router.post(
    "/appointments/:id/confirm-reschedule",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.confirmReschedule(req.params.id, tenantId, userId);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        if (result.code === "INVALID_STATE") return sendError(res, 409, result.error);
        return sendError(res, 500, result.error);
      }
      res.json(result.data);
    },
  );

  router.delete("/appointments/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.delete(req.params.id, tenantId, userId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  return router;
}
