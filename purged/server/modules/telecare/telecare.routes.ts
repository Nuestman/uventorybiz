import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { insertTelecareSessionSchema } from "@shared/schema";
import { createTelecareController } from "./telecare.controller";
import * as repo from "./telecare.repository";
import { joinTelecareSession, completeTelecareSession } from "./telecare-join.service";
import { extendTelecareSession } from "./telecare-extend.service";
import { provisionTelecareVideoMeeting } from "./telecare-provisioning.service";
import { getDefaultVideoProviderId, isVideoProviderConfigured } from "./video-providers";
import { buildTelecareSessionDetail } from "./telecare-context.service";
import { reconcileExpiredTelecareSession } from "./telecare-session-reconcile.service";
import { openEncounterForTelecareSession } from "./telecare-encounter.service";
import { finalizeTelehealthVisitFromSession, syncPortalRequestFromTelecareSessionOutcome } from "./telecare-appointment-sync.service";

const updateStatusSchema = z.object({
  status: z.enum(["scheduled", "waiting_room", "in_progress", "completed", "no_show", "cancelled", "failed"]),
  cancellationReason: z.string().optional(),
});

export interface TelecareRoutesDeps {
  storage: IStorage;
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
}

function joinResponsePayload(result: Extract<Awaited<ReturnType<typeof joinTelecareSession>>, { ok: true }>) {
  return {
    room: result.room,
    joinUrl: result.joinUrl,
    videoProvider: result.videoProvider,
    session: repo.sanitizeTelecareSession(result.session),
  };
}

const telecareQueueViewSchema = z.enum(["today", "upcoming", "active", "recent", "all"]);

async function enrichTelecareQueueRows(
  storage: IStorage,
  tenantId: string,
  rows: Awaited<ReturnType<typeof repo.listTelecareQueueForStaff>>,
) {
  return Promise.all(
    rows.map(async ({ session, appointment }) => {
      const patientData = await storage.getPatient(appointment.patientId, tenantId);
      const employee = patientData?.employee;
      const patientName = employee
        ? `${employee.firstName ?? ""} ${employee.lastName ?? ""}`.trim() || "Patient"
        : "Patient";
      return {
        appointment: {
          id: appointment.id,
          patientId: appointment.patientId,
          patientName,
          appointmentDate: appointment.appointmentDate,
          appointmentType: appointment.appointmentType,
          status: appointment.status,
          modality: appointment.modality,
          telecareSessionId: appointment.telecareSessionId,
          durationMinutes: appointment.durationMinutes ?? null,
          createdAt: appointment.createdAt,
        },
        session: session
          ? repo.sanitizeTelecareSession(session, appointment.durationMinutes ?? undefined)
          : null,
      };
    }),
  );
}

export function createTelecareRouter(deps: TelecareRoutesDeps): Router {
  const { storage, authMiddleware, requireClinicalAccess } = deps;
  const router = Router();
  const controller = createTelecareController();
  const defaultProvider = getDefaultVideoProviderId();

  router.get("/telecare/config", authMiddleware, requireClinicalAccess, async (_req: any, res) => {
    res.json({
      videoProvider: defaultProvider,
      configured: isVideoProviderConfigured(defaultProvider),
    });
  });

  router.get("/telecare/queue/summary", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const counts = await repo.getTelecareQueueSummaryCounts(tenantId);
    res.json({
      ...counts,
      videoProvider: defaultProvider,
      videoConfigured: isVideoProviderConfigured(defaultProvider),
    });
  });

  router.get("/telecare/queue", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const viewRaw = typeof req.query.view === "string" ? req.query.view : "today";
    const parsedView = telecareQueueViewSchema.safeParse(viewRaw);
    if (!parsedView.success) return sendError(res, 400, "Invalid view");
    const rows = await repo.listTelecareQueueForStaff(tenantId, {
      view: parsedView.data,
      appointmentStatus:
        typeof req.query.appointmentStatus === "string" ? req.query.appointmentStatus : undefined,
      sessionStatus: typeof req.query.sessionStatus === "string" ? req.query.sessionStatus : undefined,
    });
    for (const { session } of rows) {
      if (session?.id) {
        await reconcileExpiredTelecareSession(tenantId, session.id);
      }
    }
    const refreshed = await repo.listTelecareQueueForStaff(tenantId, {
      view: parsedView.data,
      appointmentStatus:
        typeof req.query.appointmentStatus === "string" ? req.query.appointmentStatus : undefined,
      sessionStatus: typeof req.query.sessionStatus === "string" ? req.query.sessionStatus : undefined,
    });
    const enriched = await enrichTelecareQueueRows(storage, tenantId, refreshed);
    res.json(enriched);
  });

  router.get("/telecare/queue/today", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const rows = await repo.listTelecareQueueForStaff(tenantId, { view: "today" });
    const enriched = await enrichTelecareQueueRows(storage, tenantId, rows);
    res.json(enriched);
  });

  router.get("/telecare/sessions", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await controller.list(tenantId, {
      patientId: req.query.patientId as string | undefined,
      status: req.query.status as string | undefined,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/telecare/sessions/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    await reconcileExpiredTelecareSession(tenantId, req.params.id);
    const detail = await buildTelecareSessionDetail(storage, tenantId, req.params.id, "staff");
    if (!detail) return sendError(res, 404, "Telecare session not found");
    res.json(detail);
  });

  router.post(
    "/telecare/sessions",
    authMiddleware,
    requireClinicalAccess,
    validateBody(insertTelecareSessionSchema.omit({ providerId: true })),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const providerId = req.user?.claims?.sub || req.user?.id;
      if (!tenantId || !providerId) return sendError(res, 400, "User has no tenant association");
      const result = await controller.create(tenantId, providerId, req.body);
      if (!result.ok) return sendError(res, 500, result.error);
      res.status(201).json(result.data);
    },
  );

  router.post(
    "/telecare/sessions/:id/provision",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const { appointment } = await repo.getAppointmentForSession(tenantId, req.params.id);
      const session = await provisionTelecareVideoMeeting(storage, tenantId, req.params.id, appointment);
      if (!session) return sendError(res, 404, "Telecare session not found");
      res.json(repo.sanitizeTelecareSession(session));
    },
  );

  router.post(
    "/telecare/sessions/:id/open-encounter",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.claims?.sub || req.user?.id;
      if (!tenantId || !userId) return sendError(res, 400, "User has no tenant association");
      const result = await openEncounterForTelecareSession(storage, tenantId, userId, req.params.id);
      if (!result.ok) {
        const status = result.code === "NOT_FOUND" ? 404 : result.code === "ACTIVE_ENCOUNTER_EXISTS" ? 409 : 500;
        return sendError(res, status, result.error);
      }
      res.json(result);
    },
  );

  router.post(
    "/telecare/sessions/:id/join",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const { appointment } = await repo.getAppointmentForSession(tenantId, req.params.id);
      const result = await joinTelecareSession(storage, tenantId, req.params.id, "provider", appointment);
      if (!result.ok) {
        const status =
          result.code === "NOT_FOUND"
            ? 404
            : result.code === "NOT_PROVISIONED"
              ? 503
              : result.code === "OUTSIDE_WINDOW" || result.code === "INVALID_STATE" || result.code === "NOT_CONFIRMED"
                ? 409
                : 500;
        return sendError(res, status, result.error);
      }
      res.json(joinResponsePayload(result));
    },
  );

  router.post(
    "/telecare/sessions/:id/extend",
    authMiddleware,
    requireClinicalAccess,
    validateBody(
      z.object({
        additionalMinutes: z.union([z.literal(15), z.literal(30)]),
      }),
    ),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as { additionalMinutes: 15 | 30 };
      const result = await extendTelecareSession(tenantId, req.params.id, body.additionalMinutes);
      if (!result.ok) {
        const status =
          result.code === "NOT_FOUND"
            ? 404
            : result.code === "INVALID_STATE" || result.code === "INVALID_INPUT"
              ? 409
              : 500;
        return sendError(res, status, result.error);
      }
      const { appointment } = await repo.getAppointmentForSession(tenantId, req.params.id);
      const durationMinutes = appointment?.durationMinutes ?? undefined;
      res.json({
        scheduledEnd: result.scheduledEnd,
        session: repo.sanitizeTelecareSession(result.session, durationMinutes),
      });
    },
  );

  router.post(
    "/telecare/sessions/:id/complete",
    authMiddleware,
    requireClinicalAccess,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await completeTelecareSession(tenantId, req.params.id, "provider");
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      res.json({ session: repo.sanitizeTelecareSession(result.session) });
    },
  );

  router.patch(
    "/telecare/sessions/:id/status",
    authMiddleware,
    requireClinicalAccess,
    validateBody(updateStatusSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof updateStatusSchema>;
      const extras: Parameters<typeof repo.updateTelecareSessionStatus>[3] = {};
      if (body.cancellationReason) extras.cancellationReason = body.cancellationReason;
      if (body.status === "in_progress") extras.actualStart = new Date();
      if (body.status === "completed" || body.status === "no_show" || body.status === "cancelled") {
        extras.actualEnd = new Date();
      }
      const result = await controller.updateStatus(tenantId, req.params.id, body.status, extras);
      if (!result.ok) {
        if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
        return sendError(res, 500, result.error);
      }
      if (body.status === "completed") {
        await finalizeTelehealthVisitFromSession(tenantId, req.params.id);
      } else if (body.status === "no_show" || body.status === "cancelled") {
        await syncPortalRequestFromTelecareSessionOutcome(tenantId, req.params.id, body.status);
      }
      res.json(result.data);
    },
  );

  return router;
}
