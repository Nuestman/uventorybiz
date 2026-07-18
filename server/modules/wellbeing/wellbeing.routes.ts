import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { insertPatientFollowUpSchema } from "@shared/schema";

export interface WellbeingRoutesDeps {
  authMiddleware: RequestHandler;
  requireWellbeingRead: RequestHandler;
  requireWellbeingWrite: RequestHandler;
}

const createFollowUpSchema = insertPatientFollowUpSchema.extend({
  patientId: z.string().optional(),
  employeeId: z.string().optional(),
});

/**
 * Employee wellbeing feature router.
 * Mount at /api. Routes under /api/wellbeing/...
 */
export function createWellbeingRouter(deps: WellbeingRoutesDeps): Router {
  const { authMiddleware, requireWellbeingRead, requireWellbeingWrite } = deps;
  const router = Router();

  router.get("/wellbeing/follow-ups", authMiddleware, requireWellbeingRead, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");

    const { patientId, status, careContext, fromDate, toDate, locationId, dueOnly } =
      req.query as Record<string, string | undefined>;

    const followUps = await storage.listPatientFollowUps(tenantId, {
      patientId,
      status,
      careContext,
      fromDate,
      toDate,
      locationId,
      dueOnly: dueOnly === "true",
    });

    res.json(followUps);
  });

  router.get("/wellbeing/follow-ups/:id", authMiddleware, requireWellbeingRead, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");

    const followUp = await storage.getPatientFollowUp(req.params.id, tenantId);
    if (!followUp) return sendError(res, 404, "Follow-up not found");
    res.json(followUp);
  });

  router.post(
    "/wellbeing/follow-ups",
    authMiddleware,
    requireWellbeingWrite,
    validateBody(createFollowUpSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const userId = req.user.id;
      const body = req.body as z.infer<typeof createFollowUpSchema>;

      let patientId = body.patientId;
      const employeeId = body.employeeId;

      if (!patientId && employeeId) {
        const existing = await storage.getPatientByEmployeeId(employeeId, tenantId);
        if (existing) {
          patientId = existing.id;
        } else {
          const employee = await storage.getEmployee(employeeId, tenantId);
          if (!employee) return sendError(res, 400, "Employee not found for auto patient creation");

          const newPatient = await storage.createPatient(
            {
              employeeId: employee.id,
              status: "active",
              medicalClearance: true,
              notes: null as any,
            } as any,
            tenantId
          );
          patientId = newPatient.id;
        }
      }

      if (!patientId) {
        return sendError(res, 400, "patientId or employeeId is required to create a follow-up");
      }

      const followUpData: any = {
        ...body,
        patientId,
      };

      const created = await storage.createPatientFollowUp(tenantId, userId, followUpData);
      res.status(201).json(created);
    }
  );

  router.get(
    "/wellbeing/follow-ups/patient/:patientId",
    authMiddleware,
    requireWellbeingRead,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const { status, careContext, fromDate, toDate, locationId } =
        req.query as Record<string, string | undefined>;

      const followUps = await storage.listPatientFollowUps(tenantId, {
        patientId: req.params.patientId,
        status,
        careContext,
        fromDate,
        toDate,
        locationId,
      });

      res.json(followUps);
    }
  );

  router.get(
    "/wellbeing/follow-ups/due",
    authMiddleware,
    requireWellbeingRead,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const { locationId, careContext } = req.query as Record<string, string | undefined>;

      const followUps = await storage.listPatientFollowUps(tenantId, {
        locationId,
        careContext,
        dueOnly: true,
      });

      res.json(followUps);
    }
  );

  router.get(
    "/wellbeing/follow-ups/external",
    authMiddleware,
    requireWellbeingRead,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const { status, fromDate, toDate, locationId } =
        req.query as Record<string, string | undefined>;

      const followUps = await storage.listPatientFollowUps(tenantId, {
        status,
        careContext: "external",
        fromDate,
        toDate,
        locationId,
      });

      res.json(followUps);
    }
  );

  router.put(
    "/wellbeing/follow-ups/:id",
    authMiddleware,
    requireWellbeingWrite,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const existing = await storage.getPatientFollowUp(req.params.id, tenantId);
      if (!existing) return sendError(res, 404, "Follow-up not found");

      const updateData: any = { ...req.body };

      if (updateData.status === "completed" && !existing.completedAt) {
        updateData.completedAt = new Date();
        updateData.completedBy = userId;
      }

      const updated = await storage.updatePatientFollowUp(req.params.id, tenantId, updateData);

      res.json(updated);
    }
  );

  router.put(
    "/wellbeing/follow-ups/:id/complete",
    authMiddleware,
    requireWellbeingWrite,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const existing = await storage.getPatientFollowUp(req.params.id, tenantId);
      if (!existing) return sendError(res, 404, "Follow-up not found");

      const { outcomeNotes, outcomeCode, nextFollowUpDate } = req.body || {};

      const updated = await storage.updatePatientFollowUp(req.params.id, tenantId, {
        status: "completed",
        completedAt: new Date(),
        completedBy: userId,
        outcomeNotes: outcomeNotes ?? existing.outcomeNotes,
        outcomeCode: outcomeCode ?? existing.outcomeCode,
        nextFollowUpDate: nextFollowUpDate ?? existing.nextFollowUpDate,
      } as any);

      res.json(updated);
    }
  );

  router.put(
    "/wellbeing/follow-ups/:id/cancel",
    authMiddleware,
    requireWellbeingWrite,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const existing = await storage.getPatientFollowUp(req.params.id, tenantId);
      if (!existing) return sendError(res, 404, "Follow-up not found");

      const updated = await storage.updatePatientFollowUp(req.params.id, tenantId, {
        status: "cancelled",
      } as any);

      res.json(updated);
    }
  );

  router.delete(
    "/wellbeing/follow-ups/:id",
    authMiddleware,
    requireWellbeingWrite,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const existing = await storage.getPatientFollowUp(req.params.id, tenantId);
      if (!existing) return sendError(res, 404, "Follow-up not found");

      await storage.deletePatientFollowUp(req.params.id, tenantId);
      res.status(204).end();
    }
  );

  return router;
}
