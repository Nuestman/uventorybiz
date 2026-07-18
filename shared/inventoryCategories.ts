/**
 * Default inventory categories seeded per tenant.
 * Slugs are stable; medication/supplies legacy values are import aliases only
 * (mapped to pharmaceuticals / medical-supplies — not duplicate picker rows).
 */

export type InventoryFieldTemplate = "medication" | "supplies" | "equipment" | "consumables";

export type InventoryCategoryDefault = {
  name: string;
  slug: string;
  itemCodePrefix: string;
  fieldTemplate: InventoryFieldTemplate;
  sortOrder: number;
};

/** Canonical defaults shown in Inventory / PO pickers (no medication/supplies duplicate rows). */
export const DEFAULT_INVENTORY_CATEGORIES: readonly InventoryCategoryDefault[] = [
  {
    name: "Pharmaceuticals",
    slug: "pharmaceuticals",
    itemCodePrefix: "MED",
    fieldTemplate: "medication",
    sortOrder: 10,
  },
  {
    name: "General Supplies",
    slug: "medical-supplies",
    itemCodePrefix: "SUP",
    fieldTemplate: "supplies",
    sortOrder: 20,
  },
  {
    name: "Personal Protective Equipment",
    slug: "ppe",
    itemCodePrefix: "PPE",
    fieldTemplate: "supplies",
    sortOrder: 30,
  },
  {
    name: "Emergency Supplies",
    slug: "emergency-supplies",
    itemCodePrefix: "EMG",
    fieldTemplate: "supplies",
    sortOrder: 40,
  },
  {
    name: "Equipment",
    slug: "equipment",
    itemCodePrefix: "EQP",
    fieldTemplate: "equipment",
    sortOrder: 50,
  },
  {
    name: "Consumables",
    slug: "consumables",
    itemCodePrefix: "CON",
    fieldTemplate: "consumables",
    sortOrder: 60,
  },
] as const;

/** Legacy / friendly CSV labels → default slugs (no duplicate categories). */
export const INVENTORY_CATEGORY_ALIASES: Record<string, string> = {
  medication: "pharmaceuticals",
  medications: "pharmaceuticals",
  pharmaceuticals: "pharmaceuticals",
  pharmacy: "pharmaceuticals",
  supplies: "medical-supplies",
  "medical-supplies": "medical-supplies",
  medicalsupplies: "medical-supplies",
  "general-supplies": "medical-supplies",
  generalsupplies: "medical-supplies",
  packaging: "medical-supplies",
  ppe: "ppe",
  "emergency-supplies": "emergency-supplies",
  emergencysupplies: "emergency-supplies",
  equipment: "equipment",
  consumables: "consumables",
  grocery: "consumables",
  beverages: "consumables",
  fmcg: "consumables",
};

export const INVENTORY_FIELD_TEMPLATES: InventoryFieldTemplate[] = [
  "medication",
  "supplies",
  "equipment",
  "consumables",
];

/** Form field configs keyed by field_template (not slug). */
export const INVENTORY_CATEGORY_FIELD_CONFIG: Record<
  InventoryFieldTemplate,
  { required: string[]; optional: string[]; labels: Record<string, string> }
> = {
  medication: {
    required: ["itemName", "category", "unitOfMeasure", "dosageForm", "expiryDate", "batchNumber"],
    optional: ["description", "supplier", "lotNumber"],
    labels: {
      batchNumber: "Batch/Lot Number",
      dosageForm: "Dosage Form",
      unitOfMeasure: "Unit of Measure",
    },
  },
  supplies: {
    required: ["itemName", "category", "unitOfMeasure"],
    optional: ["description", "supplier", "expiryDate", "batchNumber", "lotNumber"],
    labels: {
      batchNumber: "Batch Number",
      unitOfMeasure: "Unit of Measure",
    },
  },
  equipment: {
    required: ["itemName", "category", "unitOfMeasure", "supplier", "equipmentStatus"],
    optional: [
      "description",
      "serialNumber",
      "lastMaintenanceDate",
      "nextMaintenanceDate",
      "warrantyExpiry",
    ],
    labels: {
      supplier: "Manufacturer",
      unitOfMeasure: "Unit of Measure",
      equipmentStatus: "Equipment Status",
      serialNumber: "Serial Number",
      lastMaintenanceDate: "Last Maintenance",
      nextMaintenanceDate: "Next Maintenance",
      warrantyExpiry: "Warranty Expiry",
    },
  },
  consumables: {
    required: ["itemName", "category", "unitOfMeasure"],
    optional: ["description", "supplier", "expiryDate", "batchNumber", "lotNumber"],
    labels: {
      unitOfMeasure: "Unit of Measure",
      batchNumber: "Batch Number",
    },
  },
};

export function slugifyInventoryCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

export function normalizeInventoryCategoryKey(raw: string): string {
  return raw.trim().toLowerCase().replace(/\s+/g, "-");
}

/** Resolve CSV/UI input to a category slug using aliases, else the normalized key. */
export function resolveInventoryCategorySlug(raw: string): string {
  const key = normalizeInventoryCategoryKey(raw);
  return INVENTORY_CATEGORY_ALIASES[key] ?? key;
}
