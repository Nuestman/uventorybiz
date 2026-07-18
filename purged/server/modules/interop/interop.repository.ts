import { randomBytes } from "crypto";
import bcrypt from "bcrypt";
import { and, desc, eq } from "drizzle-orm";
import { db } from "../../config/db";
import { interopPartners, interopTransfers, type InsertInteropPartner, type InteropPartner } from "@shared/schema";

export function generateInteropApiKey(): string {
  return `maid_${randomBytes(32).toString("hex")}`;
}

export function apiKeyPrefix(rawKey: string): string {
  return rawKey.slice(0, 12);
}

export async function hashInteropApiKey(rawKey: string): Promise<string> {
  return bcrypt.hash(rawKey, 10);
}

export async function verifyInteropApiKey(rawKey: string, hash: string): Promise<boolean> {
  return bcrypt.compare(rawKey, hash);
}

export async function listInteropPartners(tenantId: string): Promise<InteropPartner[]> {
  return db
    .select()
    .from(interopPartners)
    .where(eq(interopPartners.tenantId, tenantId))
    .orderBy(desc(interopPartners.createdAt));
}

export async function getInteropPartnerById(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(interopPartners)
    .where(and(eq(interopPartners.id, id), eq(interopPartners.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function findPartnerByApiKeyPrefix(prefix: string) {
  const [row] = await db
    .select()
    .from(interopPartners)
    .where(and(eq(interopPartners.inboundApiKeyPrefix, prefix), eq(interopPartners.status, "active")))
    .limit(1);
  return row;
}

export async function createInteropPartner(
  tenantId: string,
  data: Omit<InsertInteropPartner, "tenantId" | "inboundApiKeyHash" | "inboundApiKeyPrefix">,
): Promise<{ partner: InteropPartner; inboundApiKey: string }> {
  const inboundApiKey = generateInteropApiKey();
  const inboundApiKeyHash = await hashInteropApiKey(inboundApiKey);
  const [partner] = await db
    .insert(interopPartners)
    .values({
      ...data,
      tenantId,
      inboundApiKeyHash,
      inboundApiKeyPrefix: apiKeyPrefix(inboundApiKey),
      updatedAt: new Date(),
    })
    .returning();
  return { partner, inboundApiKey };
}

export async function updateInteropPartner(
  tenantId: string,
  id: string,
  data: Partial<Omit<InsertInteropPartner, "tenantId" | "inboundApiKeyHash" | "inboundApiKeyPrefix">>,
) {
  const [row] = await db
    .update(interopPartners)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(interopPartners.id, id), eq(interopPartners.tenantId, tenantId)))
    .returning();
  return row;
}

export async function rotatePartnerApiKey(tenantId: string, id: string) {
  const inboundApiKey = generateInteropApiKey();
  const inboundApiKeyHash = await hashInteropApiKey(inboundApiKey);
  const [row] = await db
    .update(interopPartners)
    .set({
      inboundApiKeyHash,
      inboundApiKeyPrefix: apiKeyPrefix(inboundApiKey),
      updatedAt: new Date(),
    })
    .where(and(eq(interopPartners.id, id), eq(interopPartners.tenantId, tenantId)))
    .returning();
  return row ? { partner: row, inboundApiKey } : null;
}

export function sanitizePartner(partner: InteropPartner) {
  const { inboundApiKeyHash, deliveryBearerToken, ...rest } = partner;
  return {
    ...rest,
    hasDeliveryToken: !!deliveryBearerToken,
    inboundKeyPrefix: partner.inboundApiKeyPrefix,
  };
}

export async function listInteropTransfers(tenantId: string, patientId?: string) {
  const conditions = [eq(interopTransfers.tenantId, tenantId)];
  if (patientId) conditions.push(eq(interopTransfers.patientId, patientId));
  return db
    .select()
    .from(interopTransfers)
    .where(and(...conditions))
    .orderBy(desc(interopTransfers.createdAt))
    .limit(100);
}

export async function getInteropTransferById(tenantId: string, id: string) {
  const [row] = await db
    .select()
    .from(interopTransfers)
    .where(and(eq(interopTransfers.id, id), eq(interopTransfers.tenantId, tenantId)))
    .limit(1);
  return row;
}

export async function createInteropTransfer(
  tenantId: string,
  data: {
    patientId: string;
    partnerId?: string | null;
    referringEncounterId?: string | null;
    encounterIds: string[];
    bundleId: string;
    createdBy?: string | null;
    deliveryMethod?: string;
  },
) {
  const [row] = await db
    .insert(interopTransfers)
    .values({
      tenantId,
      patientId: data.patientId,
      partnerId: data.partnerId ?? null,
      referringEncounterId: data.referringEncounterId ?? null,
      encounterIds: data.encounterIds,
      bundleId: data.bundleId,
      createdBy: data.createdBy ?? null,
      deliveryMethod: data.deliveryMethod ?? "download",
      status: "prepared",
      updatedAt: new Date(),
    })
    .returning();
  return row;
}

export async function markTransferDelivered(tenantId: string, id: string) {
  const [row] = await db
    .update(interopTransfers)
    .set({ status: "delivered", deliveredAt: new Date(), errorMessage: null, updatedAt: new Date() })
    .where(and(eq(interopTransfers.id, id), eq(interopTransfers.tenantId, tenantId)))
    .returning();
  return row;
}

export async function markTransferFailed(tenantId: string, id: string, errorMessage: string) {
  const [row] = await db
    .update(interopTransfers)
    .set({ status: "failed", errorMessage, updatedAt: new Date() })
    .where(and(eq(interopTransfers.id, id), eq(interopTransfers.tenantId, tenantId)))
    .returning();
  return row;
}
