import type { RequestHandler } from "express";
import { Router } from "express";
import { asc, eq } from "drizzle-orm";
import { db } from "../../config/db";
import { businessCategories } from "@shared/schema";
import { storage } from "../../storage";
import { sendError } from "../../shared/errors";
import { createTenantsController } from "./tenants.controller";

export interface TenantsRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
}

function performedByLabel(req: any): string {
  return req.user?.firstName ? `${req.user.firstName} ${req.user.lastName}` : "Admin";
}

/**
 * Create the tenants router. Mount at /api.
 * Routes: POST /tenants (public), GET /tenants/:id/verify (public), PUT /tenants/:id (admin)
 */
export function createTenantsRouter(deps: TenantsRoutesDeps): Router {
  const { authMiddleware, requireAdmin } = deps;
  const router = Router();
  const controller = createTenantsController(storage);

  // Public: business categories for the tenant registration form
  router.get("/business-categories", async (_req, res) => {
    try {
      const rows = await db
        .select({
          key: businessCategories.key,
          label: businessCategories.label,
          description: businessCategories.description,
        })
        .from(businessCategories)
        .where(eq(businessCategories.isActive, true))
        .orderBy(asc(businessCategories.sortOrder), asc(businessCategories.label));
      res.json(rows);
    } catch (err) {
      console.error("Failed to list business categories:", err);
      sendError(res, 500, "Failed to load business categories");
    }
  });

  router.post("/tenants", async (req, res) => {
    const body = {
      name: req.body.name,
      description: req.body.description,
      contactEmail: req.body.contactEmail,
      contactPhone: req.body.contactPhone,
      address: req.body.address,
      planType: req.body.planType,
      businessCategory: req.body.businessCategory,
      pocTestingEnabled: req.body.pocTestingEnabled === true,
    };
    const result = await controller.create(body);
    if (!result.ok) return sendError(res, 500, result.error);
    res.status(201).json(result.data);
  });

  router.get("/tenants/:id/verify", async (req, res) => {
    const result = await controller.verify(req.params.id);
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  router.put("/tenants/:id", authMiddleware, requireAdmin, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    const userId = req.user?.id;
    const userRole = req.user?.role;
    const userTenantId = req.user?.tenantId;
    if (userRole !== "super_admin" && userTenantId !== req.params.id) {
      return sendError(res, 403, "Cannot update other tenants");
    }
    const result = await controller.update(
      req.params.id,
      userId,
      tenantId,
      performedByLabel(req),
      req.body
    );
    if (!result.ok) {
      if (result.code === "NOT_FOUND") return sendError(res, 404, result.error);
      return sendError(res, 500, result.error);
    }
    res.json(result.data);
  });

  return router;
}
