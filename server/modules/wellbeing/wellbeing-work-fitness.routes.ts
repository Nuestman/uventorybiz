import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { insertEmployeeWorkFitnessCaseSchema } from "@shared/schema";
import { caseHasWorkImpact } from "@shared/workFitness";

export interface WellbeingWorkFitnessRoutesDeps {
  authMiddleware: RequestHandler;
  requireWellbeingRead: RequestHandler;
  requireWellbeingWrite: RequestHandler;
}

const createCaseSchema = insertEmployeeWorkFitnessCaseSchema.extend({
  employeeId: z.string().min(1, "Employee is required"),
});

const assessCaseSchema = z.object({
  fitnessOutcome: z.string().optional(),
  fitnessImpact: z.string().optional(),
  workRestrictions: z.string().optional(),
  restrictionStartDate: z.coerce.date().optional().nullable(),
  restrictionEndDate: z.coerce.date().optional().nullable(),
  clearedUnderground: z.boolean().optional(),
  clearedHeavyMachinery: z.boolean().optional(),
  mayAffectDrugTest: z.boolean().optional(),
  drugTestDisclosureNotes: z.string().optional(),
  assessmentNotes: z.string().optional(),
  actionTaken: z.string().optional(),
  actionNotes: z.string().optional(),
  medicationNotes: z
    .array(
      z.object({
        id: z.string(),
        clinicianMedicationNotes: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

async function logWorkFitnessAudit(
  tenantId: string,
  userId: string,
  action: string,
  resourceId: string,
  details?: Record<string, unknown>,
) {
  await storage.createAuditLog(
    {
      userId,
      action,
      resourceType: "work_fitness_case",
      resourceId,
      details,
    },
    tenantId,
  );
}

export function createWellbeingWorkFitnessRouter(deps: WellbeingWorkFitnessRoutesDeps): Router {
  const { authMiddleware, requireWellbeingRead, requireWellbeingWrite } = deps;
  const router = Router();

  router.get(
    "/wellbeing/work-fitness",
    authMiddleware,
    requireWellbeingRead,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const { employeeId, locationId, status, portalOnly } = req.query as Record<string, string | undefined>;
      const isOperations = req.user?.role === "operations";

      const cases = await storage.listWorkFitnessCases(tenantId, {
        employeeId,
        ...(portalOnly === "true" ? { portalOnly: true } : locationId ? { locationId } : {}),
        status,
        ...(isOperations ? { hasWorkImpact: true } : {}),
      });

      res.json(cases);
    },
  );

  router.get(
    "/wellbeing/work-fitness/employee/:employeeId",
    authMiddleware,
    requireWellbeingRead,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const rawEmployeeId = req.params.employeeId;
      const isOperations = req.user?.role === "operations";

      let resolvedEmployeeId = rawEmployeeId;
      let employee = await storage.getEmployee(resolvedEmployeeId, tenantId);
      if (!employee) {
        employee = await storage.getEmployeeByNumber(rawEmployeeId, tenantId);
        if (!employee) return sendError(res, 404, "Employee not found for supplied identifier.");
        resolvedEmployeeId = employee.id;
      }

      const cases = await storage.listWorkFitnessCases(tenantId, {
        employeeId: resolvedEmployeeId,
        ...(isOperations ? { hasWorkImpact: true } : {}),
      });

      res.json(cases);
    },
  );

  router.get(
    "/wellbeing/work-fitness/:id",
    authMiddleware,
    requireWellbeingRead,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");

      const wfCase = await storage.getWorkFitnessCase(req.params.id, tenantId);
      if (!wfCase) return sendError(res, 404, "Work fitness case not found");

      if (req.user?.role === "operations" && !caseHasWorkImpact(wfCase)) {
        return sendError(res, 403, "You only have access to cases with documented work impact or drug-test relevance.");
      }

      res.json(wfCase);
    },
  );

  router.post(
    "/wellbeing/work-fitness",
    authMiddleware,
    requireWellbeingWrite,
    validateBody(createCaseSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 400, "User missing id");

      const body = req.body as z.infer<typeof createCaseSchema>;
      const created = await storage.createWorkFitnessCase(tenantId, userId, {
        ...body,
        submittedByEmployee: false,
        status: "submitted",
      });
      await logWorkFitnessAudit(tenantId, userId, "create", created.id, {
        employeeId: created.employeeId,
        caseType: created.caseType,
        medicationCount: created.medications.length,
      });
      res.status(201).json(created);
    },
  );

  router.put(
    "/wellbeing/work-fitness/:id",
    authMiddleware,
    requireWellbeingWrite,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 400, "User missing id");

      const existing = await storage.getWorkFitnessCase(req.params.id, tenantId);
      if (!existing) return sendError(res, 404, "Work fitness case not found");

      const updated = await storage.updateWorkFitnessCase(req.params.id, tenantId, req.body || {});
      await logWorkFitnessAudit(tenantId, userId, "update", req.params.id, req.body || {});
      res.json(updated);
    },
  );

  router.put(
    "/wellbeing/work-fitness/:id/assess",
    authMiddleware,
    requireWellbeingWrite,
    validateBody(assessCaseSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 400, "User missing id");

      const existing = await storage.getWorkFitnessCase(req.params.id, tenantId);
      if (!existing) return sendError(res, 404, "Work fitness case not found");

      const body = req.body as z.infer<typeof assessCaseSchema>;
      const wasReviewed = existing.status === "assessed" || existing.status === "closed";
      const updated = await storage.assessWorkFitnessCase(req.params.id, tenantId, userId, body);
      await logWorkFitnessAudit(tenantId, userId, wasReviewed ? "review_updated" : "review_completed", req.params.id, {
        fitnessOutcome: body.fitnessOutcome,
        fitnessImpact: body.fitnessImpact,
        mayAffectDrugTest: body.mayAffectDrugTest,
      });
      res.json(updated);
    },
  );

  router.delete(
    "/wellbeing/work-fitness/:id",
    authMiddleware,
    requireWellbeingWrite,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      if (!userId) return sendError(res, 400, "User missing id");

      const existing = await storage.getWorkFitnessCase(req.params.id, tenantId);
      if (!existing) return sendError(res, 404, "Work fitness case not found");

      await storage.deleteWorkFitnessCase(req.params.id, tenantId);
      await logWorkFitnessAudit(tenantId, userId, "delete", req.params.id, {
        employeeId: existing.employeeId,
        caseType: existing.caseType,
      });
      res.json({ success: true });
    },
  );

  return router;
}
