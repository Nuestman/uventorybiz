import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import {
  confirmPortalAppointmentRequest,
  declinePortalAppointmentRequest,
  listPortalAppointmentRequestsForTenant,
} from "./portal-appointment-requests.service";

const confirmSchema = z.object({
  appointmentDate: z.coerce.date(),
  medicalStaffId: z.string().min(1),
  appointmentType: z.string().max(120).optional(),
  staffNotes: z.string().max(4000).optional().nullable(),
  locationId: z.string().min(1).optional().nullable(),
});

const declineSchema = z.object({
  staffNotes: z.string().max(4000).optional().nullable(),
});

export interface PortalAppointmentRequestsRoutesDeps {
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

/**
 * Staff review of patient portal appointment requests (in-person or telehealth).
 */
export function createPortalAppointmentRequestsRouter(deps: PortalAppointmentRequestsRoutesDeps): Router {
  const { authMiddleware, requireClinicalAccess, injectLocationMiddleware } = deps;
  const router = Router();

  router.get("/portal-appointment-requests", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const status = (req.query.status as string | undefined) ?? "pending";
    const rows = await listPortalAppointmentRequestsForTenant(tenantId, status === "all" ? undefined : status);
    res.json(
      rows.map(({ request, patient, employee }) => ({
        id: request.id,
        status: request.status,
        preferredDate: request.preferredDate,
        preferredTimeWindow: request.preferredTimeWindow,
        preferredModality: request.preferredModality,
        preferredLocationId: request.preferredLocationId,
        reason: request.reason,
        staffNotes: request.staffNotes,
        linkedAppointmentId: request.linkedAppointmentId,
        createdAt: request.createdAt,
        patient: {
          id: patient.id,
          employeeId: patient.employeeId,
          firstName: employee.firstName,
          lastName: employee.lastName,
          employeeNumber: employee.employeeNumber,
        },
      })),
    );
  });

  router.post(
    "/portal-appointment-requests/:id/confirm",
    authMiddleware,
    requireClinicalAccess,
    injectLocationMiddleware,
    validateBody(confirmSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof confirmSchema> & { locationId?: string };
      const result = await confirmPortalAppointmentRequest({
        tenantId,
        staffUserId: req.user.id,
        requestId: req.params.id,
        appointmentDate: body.appointmentDate,
        medicalStaffId: body.medicalStaffId,
        appointmentType: body.appointmentType,
        staffNotes: body.staffNotes,
        locationId: body.locationId ?? null,
      });
      if (!result.ok) {
        const code =
          result.code === "NOT_FOUND"
            ? 404
            : result.code === "INVALID_STATE"
              ? 409
              : result.code === "CONFLICT" || result.code === "VALIDATION"
                ? 400
                : 500;
        return sendError(res, code, result.error);
      }
      res.status(201).json(result.data);
    },
  );

  router.post(
    "/portal-appointment-requests/:id/decline",
    authMiddleware,
    requireClinicalAccess,
    validateBody(declineSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof declineSchema>;
      const result = await declinePortalAppointmentRequest({
        tenantId,
        requestId: req.params.id,
        staffNotes: body.staffNotes,
      });
      if (!result.ok) {
        const code = result.code === "NOT_FOUND" ? 404 : result.code === "INVALID_STATE" ? 409 : 500;
        return sendError(res, code, result.error);
      }
      res.json(result.data);
    },
  );

  return router;
}
