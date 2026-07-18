import type { IStorage } from "../../storage";
import {
  INVENTORY_FIELD_TEMPLATES,
  slugifyInventoryCategoryName,
} from "@shared/inventoryCategories";

export type InventoryCategoryResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: "NOT_FOUND" | "IN_USE" | "SYSTEM" | "INVALID" };

export function createInventoryCategoriesController(storage: IStorage) {
  return {
    async list(
      tenantId: string,
      options?: { includeInactive?: boolean }
    ): Promise<InventoryCategoryResult<Awaited<ReturnType<IStorage["listInventoryCategories"]>>>> {
      try {
        const data = await storage.listInventoryCategories(tenantId, options);
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory categories list:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to list categories" };
      }
    },

    async create(
      tenantId: string,
      body: {
        name: string;
        slug?: string;
        itemCodePrefix: string;
        fieldTemplate?: string;
        sortOrder?: number;
      }
    ): Promise<InventoryCategoryResult<Awaited<ReturnType<IStorage["createInventoryCategory"]>>>> {
      try {
        const name = body.name?.trim();
        if (!name) return { ok: false, error: "Name is required", code: "INVALID" };
        const slug = (body.slug?.trim() || slugifyInventoryCategoryName(name)).toLowerCase();
        if (!slug) return { ok: false, error: "Slug is required", code: "INVALID" };
        const fieldTemplate = body.fieldTemplate || "supplies";
        if (!INVENTORY_FIELD_TEMPLATES.includes(fieldTemplate as (typeof INVENTORY_FIELD_TEMPLATES)[number])) {
          return {
            ok: false,
            error: `fieldTemplate must be one of: ${INVENTORY_FIELD_TEMPLATES.join(", ")}`,
            code: "INVALID",
          };
        }
        const data = await storage.createInventoryCategory(tenantId, {
          name,
          slug,
          itemCodePrefix: body.itemCodePrefix,
          fieldTemplate,
          sortOrder: body.sortOrder,
        });
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory categories create:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to create category" };
      }
    },

    async update(
      id: string,
      tenantId: string,
      body: Partial<{
        name: string;
        slug: string;
        itemCodePrefix: string;
        fieldTemplate: string;
        sortOrder: number;
        isActive: boolean;
      }>
    ): Promise<InventoryCategoryResult<NonNullable<Awaited<ReturnType<IStorage["updateInventoryCategory"]>>>>> {
      try {
        if (body.fieldTemplate != null
          && !INVENTORY_FIELD_TEMPLATES.includes(body.fieldTemplate as (typeof INVENTORY_FIELD_TEMPLATES)[number])) {
          return {
            ok: false,
            error: `fieldTemplate must be one of: ${INVENTORY_FIELD_TEMPLATES.join(", ")}`,
            code: "INVALID",
          };
        }
        const data = await storage.updateInventoryCategory(id, tenantId, body);
        if (!data) return { ok: false, error: "Category not found", code: "NOT_FOUND" };
        return { ok: true, data };
      } catch (err) {
        console.error("Inventory categories update:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to update category" };
      }
    },

    async delete(
      id: string,
      tenantId: string
    ): Promise<InventoryCategoryResult<{ success: true }>> {
      try {
        const result = await storage.deleteInventoryCategory(id, tenantId);
        if (!result.ok) {
          if (result.reason === "not_found") {
            return { ok: false, error: "Category not found", code: "NOT_FOUND" };
          }
          if (result.reason === "system") {
            return {
              ok: false,
              error: "System categories cannot be deleted. Deactivate them instead.",
              code: "SYSTEM",
            };
          }
          return {
            ok: false,
            error: "Category is in use by inventory items",
            code: "IN_USE",
          };
        }
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Inventory categories delete:", err);
        return { ok: false, error: err instanceof Error ? err.message : "Failed to delete category" };
      }
    },
  };
}

export type InventoryCategoriesController = ReturnType<typeof createInventoryCategoriesController>;
