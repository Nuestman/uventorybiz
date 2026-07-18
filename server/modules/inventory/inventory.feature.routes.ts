import type { RequestHandler } from "express";
import { Router } from "express";
import { createInventoryRouter } from "./inventory.routes";
import { createInventoryCategoriesRouter } from "./inventory-categories.routes";
import { createInventoryAlertsRouter } from "./inventory-alerts/inventory-alerts.routes";
import { createInventoryTransactionsRouter } from "./inventory-transactions/inventory-transactions.routes";
import { createStockRequisitionsRouter } from "./stock-requisitions/stock-requisitions.routes";
import { createStockTransfersRouter } from "./stock-transfers/stock-transfers.routes";
import { createPurchaseOrdersRouter } from "./purchase-orders/purchase-orders.routes";

export interface InventoryFeatureRoutesDeps {
  authMiddleware: RequestHandler;
  requireAdmin: RequestHandler;
  injectLocationMiddleware: RequestHandler;
  inventoryImageUpload: { single: (field: string) => RequestHandler };
}

/**
 * Inventory feature router: items, categories, alerts, transactions, requisitions, transfers, purchase orders.
 * Mount at /api. Registers all inventory-related paths under one feature.
 */
export function createInventoryFeatureRouter(deps: InventoryFeatureRoutesDeps): Router {
  const router = Router();
  router.use(
    createInventoryRouter({
      authMiddleware: deps.authMiddleware,
      injectLocationMiddleware: deps.injectLocationMiddleware,
      inventoryImageUpload: deps.inventoryImageUpload,
    })
  );
  router.use(
    createInventoryCategoriesRouter({
      authMiddleware: deps.authMiddleware,
      requireAdmin: deps.requireAdmin,
    })
  );
  router.use(
    createInventoryAlertsRouter({
      authMiddleware: deps.authMiddleware,
      requireAdmin: deps.requireAdmin,
    })
  );
  router.use(
    createInventoryTransactionsRouter({ authMiddleware: deps.authMiddleware })
  );
  router.use(
    createStockRequisitionsRouter({ authMiddleware: deps.authMiddleware })
  );
  router.use(
    createStockTransfersRouter({ authMiddleware: deps.authMiddleware })
  );
  router.use(
    createPurchaseOrdersRouter({ authMiddleware: deps.authMiddleware })
  );
  return router;
}
