import type { RequestHandler } from "express";
import { Router } from "express";
import { storage } from "../../storage";
import { validateBody } from "../../shared/validation";
import { sendError } from "../../shared/errors";
import {
  insertDrugTestSchema,
  insertAlcoholTestSchema,
  insertHydrationTestSchema,
  insertInstantTestSchema,
  updateInstantTestSchema,
  insertRandomTestingPoolSchema,
} from "@shared/schema";
import { z } from "zod";
import { createTestingController } from "./testing.controller";
import { createTestingProgramsRouter } from "./testing-programs/testing-programs.routes";
import { createTestingEquipmentRouter } from "./testing-equipment/testing-equipment.routes";

const generateSelectionsBodySchema = z.object({
  selectionCount: z.number().int().positive(),
});

export interface TestingRoutesDeps {
  authMiddleware: RequestHandler;
  injectLocationMiddleware: RequestHandler;
}

function needTenant(req: any, res: any): string | null {
  const tenantId = req.user?.tenantId;
  if (!tenantId) { sendError(res, 400, "User has no tenant association"); return null; }
  return tenantId;
}

/**
 * Create the testing router (drug/alcohol/hydration/instant tests, random pools/selections, analytics). Mount at /api.
 */
export function createTestingRouter(deps: TestingRoutesDeps): Router {
  const { authMiddleware, injectLocationMiddleware } = deps;
  const router = Router();
  const ctrl = createTestingController(storage);

  router.get("/testing/analytics", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.getAnalytics(tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/drug-tests", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const { employeeId, testType, result: testResult, dateFrom, dateTo, programId } = req.query;
    const result = await ctrl.getDrugTests(tenantId, {
      employeeId: employeeId as string,
      testType: testType as string,
      result: testResult as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      programId: programId as string,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.post("/drug-tests", authMiddleware, validateBody(insertDrugTestSchema), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.createDrugTest(tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });
  router.get("/drug-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.getDrugTest(req.params.id, tenantId);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
    res.json(result.data);
  });
  router.patch("/drug-tests/:id", authMiddleware, validateBody(insertDrugTestSchema.partial()), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.updateDrugTest(req.params.id, tenantId, req.user?.id, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.delete("/drug-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.deleteDrugTest(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/alcohol-tests", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const { employeeId, testType, result: testResult, dateFrom, dateTo, programId } = req.query;
    const result = await ctrl.getAlcoholTests(tenantId, {
      employeeId: employeeId as string,
      testType: testType as string,
      result: testResult as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      programId: programId as string,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.post("/alcohol-tests", authMiddleware, validateBody(insertAlcoholTestSchema), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.createAlcoholTest(tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });
  router.get("/alcohol-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.getAlcoholTest(req.params.id, tenantId);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
    res.json(result.data);
  });
  router.patch("/alcohol-tests/:id", authMiddleware, validateBody(insertAlcoholTestSchema.partial()), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.updateAlcoholTest(req.params.id, tenantId, req.user?.id, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.delete("/alcohol-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.deleteAlcoholTest(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.put("/drug-alcohol-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.updateAlcoholTest(req.params.id, tenantId, req.user?.id, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/hydration-tests", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const { employeeId, testType, result: testResult, dateFrom, dateTo, programId } = req.query;
    const result = await ctrl.getHydrationTests(tenantId, {
      employeeId: employeeId as string,
      testType: testType as string,
      result: testResult as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      programId: programId as string,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.post("/hydration-tests", authMiddleware, validateBody(insertHydrationTestSchema), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.createHydrationTest(tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });
  router.get("/hydration-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.getHydrationTest(req.params.id, tenantId);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
    res.json(result.data);
  });
  router.patch("/hydration-tests/:id", authMiddleware, validateBody(insertHydrationTestSchema.partial()), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.updateHydrationTest(req.params.id, tenantId, req.user?.id, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.delete("/hydration-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.deleteHydrationTest(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/instant-tests", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const { employeeId, customerId, testType, dateFrom, dateTo } = req.query;
    const result = await ctrl.getInstantTests(tenantId, {
      employeeId: employeeId as string,
      customerId: customerId as string,
      testType: testType as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.post("/instant-tests", authMiddleware, injectLocationMiddleware, validateBody(insertInstantTestSchema), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const userId = req.user?.id;
    const testData = {
      ...req.body,
      createdBy: req.body.createdBy || userId,
      testedBy: req.body.testedBy || userId,
      // Normalize empty strings / exclusive subject
      customerId: req.body.customerId || null,
      employeeId: req.body.employeeId || null,
    };
    if (!testData.locationId) return sendError(res, 400, "Store location is required. Please select your working location before recording instant tests.");
    const result = await ctrl.createInstantTest(tenantId, testData);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });
  router.get("/instant-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.getInstantTest(req.params.id, tenantId);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
    res.json(result.data);
  });
  router.patch("/instant-tests/:id", authMiddleware, validateBody(updateInstantTestSchema), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.updateInstantTest(req.params.id, tenantId, req.user?.id, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.delete("/instant-tests/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.deleteInstantTest(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/random-testing-pools", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const { department, active } = req.query;
    const result = await ctrl.getRandomTestingPools(tenantId, { department: department as string, active: active === "true" });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.post("/random-testing-pools", authMiddleware, validateBody(insertRandomTestingPoolSchema), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.createRandomTestingPool(tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });
  router.post("/random-testing-pools/:poolId/generate-selections", authMiddleware, validateBody(generateSelectionsBodySchema), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const { selectionCount } = req.body as z.infer<typeof generateSelectionsBodySchema>;
    const result = await ctrl.generateRandomSelections(req.params.poolId, selectionCount, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });
  router.get("/random-testing-pools/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.getRandomTestingPool(req.params.id, tenantId);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
    res.json(result.data);
  });
  router.put("/random-testing-pools/:id", authMiddleware, validateBody(insertRandomTestingPoolSchema.partial()), async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.updateRandomTestingPool(req.params.id, tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.delete("/random-testing-pools/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.deleteRandomTestingPool(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  router.get("/random-selections", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const { poolId, employeeId, dateFrom, dateTo, testCompleted } = req.query;
    const result = await ctrl.getRandomSelections(tenantId, {
      poolId: poolId as string,
      employeeId: employeeId as string,
      dateFrom: dateFrom ? new Date(dateFrom as string) : undefined,
      dateTo: dateTo ? new Date(dateTo as string) : undefined,
      testCompleted: testCompleted === "true",
    });
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.post("/random-selections", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.createRandomSelection(tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });
  router.put("/random-selections/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.updateRandomSelection(req.params.id, tenantId, req.body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });
  router.delete("/random-selections/:id", authMiddleware, async (req: any, res) => {
    const tenantId = needTenant(req, res); if (!tenantId) return;
    const result = await ctrl.deleteRandomSelection(req.params.id, tenantId);
    if (!result.ok) return sendError(res, 500, result.error);
    res.json(result.data);
  });

  // Testing feature: programs and equipment (coarse domain consolidation)
  router.use(createTestingProgramsRouter({ authMiddleware }));
  router.use(createTestingEquipmentRouter({ authMiddleware }));

  return router;
}
