/**
 * Seed expansive demo data into the UventoryBiz tenant from CSV fixtures.
 *
 * Usage:
 *   npm run db:seed:demo
 *   DEMO_TENANT_ID=<uuid> npm run db:seed:demo
 *
 * Reads migrations/seeds/demo/{customers,suppliers,products,employees}.csv
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { eq } from "drizzle-orm";
import { db } from "../server/config/db";
import { storage } from "../server/storage";
import { tenants, companies, careLocations, inventoryItems } from "@shared/schema";
import { parseCsvTable } from "../server/shared/csvParse";
import { createCustomersController } from "../server/modules/customers/customers.controller";
import { createSuppliersController } from "../server/modules/suppliers/suppliers.controller";
import { createInventoryController } from "../server/modules/inventory/inventory.controller";
import { createEmployeesController } from "../server/modules/employees/employees.controller";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEMO_DIR = path.join(__dirname, "..", "migrations", "seeds", "demo");
const DEMO_TENANT_NAME = "UventoryBiz";

function readCsv(name: string): string {
  const full = path.join(DEMO_DIR, name);
  if (!fs.existsSync(full)) throw new Error(`Missing demo CSV: ${full}`);
  return fs.readFileSync(full, "utf-8");
}

async function resolveDemoContext() {
  const envId = process.env.DEMO_TENANT_ID?.trim();
  let tenant;
  if (envId) {
    tenant = await storage.getTenant(envId);
    if (!tenant) throw new Error(`DEMO_TENANT_ID not found: ${envId}`);
  } else {
    const [row] = await db.select().from(tenants).where(eq(tenants.name, DEMO_TENANT_NAME)).limit(1);
    tenant = row;
    if (!tenant) throw new Error(`Tenant named "${DEMO_TENANT_NAME}" not found. Set DEMO_TENANT_ID.`);
  }

  const companyRows = await db.select().from(companies).where(eq(companies.tenantId, tenant.id)).limit(1);
  const company = companyRows[0];
  if (!company) throw new Error(`No company found for tenant ${tenant.id}`);

  const locationRows = await db
    .select()
    .from(careLocations)
    .where(eq(careLocations.tenantId, tenant.id))
    .limit(1);
  const location = locationRows[0];
  if (!location) throw new Error(`No store location found for tenant ${tenant.id}`);

  return { tenant, company, location };
}

async function seedCustomers(tenantId: string) {
  const csv = readCsv("customers.csv");
  const controller = createCustomersController(storage);
  const out = await controller.bulkImport(tenantId, csv);
  if (!out.ok) throw new Error(out.error);
  console.log(`  Customers: imported ${out.data.imported}, skipped ${out.data.skipped}`);
  if (out.data.errors.length) console.log(`    sample errors: ${out.data.errors.slice(0, 3).join("; ")}`);
}

async function seedSuppliers(tenantId: string) {
  const csv = readCsv("suppliers.csv");
  const controller = createSuppliersController(storage);
  const out = await controller.bulkImport(tenantId, csv);
  if (!out.ok) throw new Error(out.error);
  console.log(`  Suppliers: imported ${out.data.imported}, skipped ${out.data.skipped}`);
  if (out.data.errors.length) console.log(`    sample errors: ${out.data.errors.slice(0, 3).join("; ")}`);
}

async function seedProducts(tenantId: string, locationId: string) {
  const csv = readCsv("products.csv");
  const { rows } = parseCsvTable(csv, [
    "itemName",
    "itemCode",
    "category",
    "unitOfMeasure",
    "barcode",
    "brand",
    "description",
    "currentStock",
    "minimumStock",
    "maximumStock",
    "reorderPoint",
    "unitCost",
    "supplier",
  ]);

  const existing = await db
    .select({ itemCode: inventoryItems.itemCode })
    .from(inventoryItems)
    .where(eq(inventoryItems.tenantId, tenantId));
  const existingCodes = new Set(existing.map((r) => (r.itemCode || "").toUpperCase()));

  const toImport = rows.filter((r) => {
    const code = (r.itemCode || "").trim().toUpperCase();
    return !code || !existingCodes.has(code);
  });
  const skippedExisting = rows.length - toImport.length;

  const controller = createInventoryController(storage);
  const out = await controller.import(tenantId, toImport, locationId);
  if (!out.ok) throw new Error(out.error);
  console.log(
    `  Products: created ${out.data.created.length}, already present ${skippedExisting}, row errors ${out.data.errors.length}`,
  );
  if (out.data.errors.length) {
    console.log(
      `    sample errors: ${out.data.errors
        .slice(0, 3)
        .map((e) => `row ${e.row}: ${e.error}`)
        .join("; ")}`,
    );
  }
}

async function seedEmployees(tenantId: string, companyId: string) {
  let csv = readCsv("employees.csv");
  csv = csv.replace(/PLACEHOLDER_COMPANY_ID/g, companyId);
  const controller = createEmployeesController(storage);
  const out = await controller.bulkImport(tenantId, csv);
  if (!out.ok) throw new Error(out.error);
  console.log(`  Employees: imported ${out.data.imported}, skipped ${out.data.skipped}`);
  if (out.data.errors.length) console.log(`    sample errors: ${out.data.errors.slice(0, 3).join("; ")}`);
}

async function main() {
  console.log("Seeding demo tenant data…");
  const { tenant, company, location } = await resolveDemoContext();
  console.log(`  Tenant: ${tenant.name} (${tenant.id})`);
  console.log(`  Company: ${company.name} (${company.id})`);
  console.log(`  Location: ${location.locationName} (${location.id})`);

  await seedCustomers(tenant.id);
  await seedSuppliers(tenant.id);
  await seedProducts(tenant.id, location.id);
  await seedEmployees(tenant.id, company.id);

  console.log("Demo seed complete.");
  process.exit(0);
}

main().catch((err) => {
  console.error("Demo seed failed:", err);
  process.exit(1);
});
