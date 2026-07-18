import { and, eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { db } from "../../config/db";
import { resourceIdentifiers } from "@shared/schema";
import { identifierSystem, MINEAID_INTERNAL_SYSTEM } from "./fhir.constants";

export type FhirResourceType = "patient" | "encounter" | "organization";

export async function findPrimaryIdentifier(
  tenantId: string,
  resourceType: FhirResourceType,
  resourceId: string,
) {
  const [row] = await db
    .select()
    .from(resourceIdentifiers)
    .where(
      and(
        eq(resourceIdentifiers.tenantId, tenantId),
        eq(resourceIdentifiers.resourceType, resourceType),
        eq(resourceIdentifiers.resourceId, resourceId),
        eq(resourceIdentifiers.isPrimary, true),
      ),
    )
    .limit(1);
  return row;
}

export async function findBySystemValue(tenantId: string, system: string, value: string) {
  const [row] = await db
    .select()
    .from(resourceIdentifiers)
    .where(
      and(
        eq(resourceIdentifiers.tenantId, tenantId),
        eq(resourceIdentifiers.system, system),
        eq(resourceIdentifiers.value, value),
      ),
    )
    .limit(1);
  return row;
}

export async function ensurePrimaryFhirIdentifier(
  tenantId: string,
  resourceType: FhirResourceType,
  resourceId: string,
): Promise<{ fhirId: string; system: string; value: string }> {
  const existing = await findPrimaryIdentifier(tenantId, resourceType, resourceId);
  if (existing) {
    return { fhirId: existing.value, system: existing.system, value: existing.value };
  }

  const value = randomUUID();
  const system = identifierSystem(tenantId, resourceType);
  await db.insert(resourceIdentifiers).values({
    tenantId,
    resourceType,
    resourceId,
    system,
    value,
    isPrimary: true,
  });

  await db.insert(resourceIdentifiers).values({
    tenantId,
    resourceType,
    resourceId,
    system: MINEAID_INTERNAL_SYSTEM,
    value: resourceId,
    isPrimary: false,
  });

  return { fhirId: value, system, value };
}

export async function resolveInternalResourceId(
  tenantId: string,
  resourceType: FhirResourceType,
  fhirId: string,
): Promise<string | null> {
  const byPrimary = await findBySystemValue(tenantId, identifierSystem(tenantId, resourceType), fhirId);
  if (byPrimary) return byPrimary.resourceId;

  const byInternal = await findBySystemValue(tenantId, MINEAID_INTERNAL_SYSTEM, fhirId);
  if (byInternal && byInternal.resourceType === resourceType) return byInternal.resourceId;

  const [direct] = await db
    .select()
    .from(resourceIdentifiers)
    .where(
      and(
        eq(resourceIdentifiers.tenantId, tenantId),
        eq(resourceIdentifiers.resourceType, resourceType),
        eq(resourceIdentifiers.resourceId, fhirId),
      ),
    )
    .limit(1);
  return direct?.resourceId ?? fhirId;
}
