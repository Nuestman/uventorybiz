import type { IStorage } from "../../storage";
import type { FhirBundle } from "../fhir/fhir.types";
import { buildCareTransferBundle } from "../fhir/fhir-read.service";
import {
  createInteropTransfer,
  getInteropPartnerById,
  getInteropTransferById,
  markTransferDelivered,
  markTransferFailed,
} from "./interop.repository";
import { logError } from "../../logger";

export type PrepareTransferInput = {
  patientId: string;
  partnerId?: string | null;
  encounterIds?: string[];
  referringEncounterId?: string | null;
  createdBy?: string | null;
};

export type PrepareTransferResult =
  | { ok: true; transferId: string; bundle: FhirBundle }
  | { ok: false; error: string; code?: string };

export async function prepareCareTransferBundle(
  storage: IStorage,
  tenantId: string,
  input: PrepareTransferInput,
): Promise<PrepareTransferResult> {
  let partnerName: string | undefined;
  let destinationFacilityId: string | null | undefined;

  if (input.partnerId) {
    const partner = await getInteropPartnerById(tenantId, input.partnerId);
    if (!partner) return { ok: false, error: "Interop partner not found", code: "NOT_FOUND" };
    partnerName = partner.name;
    destinationFacilityId = partner.referralFacilityId;
  }

  const bundle = await buildCareTransferBundle(storage, tenantId, {
    patientId: input.patientId,
    encounterIds: input.encounterIds ?? [],
    partnerName,
    destinationFacilityId,
    referringEncounterId: input.referringEncounterId,
  });

  if (!bundle?.id) {
    return { ok: false, error: "Unable to build transfer bundle for this patient", code: "BUILD_FAILED" };
  }

  const transfer = await createInteropTransfer(tenantId, {
    patientId: input.patientId,
    partnerId: input.partnerId,
    referringEncounterId: input.referringEncounterId,
    encounterIds: input.encounterIds ?? [],
    bundleId: bundle.id!,
    createdBy: input.createdBy,
    deliveryMethod: input.partnerId ? "push_or_download" : "download",
  });

  return { ok: true, transferId: transfer.id, bundle };
}

export async function deliverTransferBundle(
  storage: IStorage,
  tenantId: string,
  transferId: string,
): Promise<{ ok: true } | { ok: false; error: string; code?: string }> {
  const transfer = await getInteropTransferById(tenantId, transferId);
  if (!transfer) return { ok: false, error: "Transfer not found", code: "NOT_FOUND" };

  if (!transfer.partnerId) {
    return { ok: false, error: "No partner configured for push delivery", code: "NO_PARTNER" };
  }

  const partner = await getInteropPartnerById(tenantId, transfer.partnerId);
  if (!partner?.deliveryUrl) {
    return { ok: false, error: "Partner has no delivery URL configured", code: "NO_DELIVERY_URL" };
  }

  const bundle = await buildCareTransferBundle(storage, tenantId, {
    patientId: transfer.patientId,
    encounterIds: (transfer.encounterIds as string[]) ?? [],
    referringEncounterId: transfer.referringEncounterId,
    partnerName: partner?.name,
    destinationFacilityId: partner?.referralFacilityId,
  });

  if (!bundle) {
    await markTransferFailed(tenantId, transferId, "Unable to rebuild bundle");
    return { ok: false, error: "Unable to rebuild bundle", code: "BUILD_FAILED" };
  }

  try {
    const headers: Record<string, string> = {
      "Content-Type": "application/fhir+json",
      Accept: "application/fhir+json",
    };
    if (partner.deliveryBearerToken) {
      headers.Authorization = `Bearer ${partner.deliveryBearerToken}`;
    }

    const res = await fetch(partner.deliveryUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(bundle),
    });

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      const msg = `Partner endpoint returned ${res.status}${body ? `: ${body.slice(0, 200)}` : ""}`;
      await markTransferFailed(tenantId, transferId, msg);
      return { ok: false, error: msg, code: "DELIVERY_FAILED" };
    }

    await markTransferDelivered(tenantId, transferId);
    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Delivery failed";
    logError("FHIR transfer delivery failed", err);
    await markTransferFailed(tenantId, transferId, msg);
    return { ok: false, error: msg, code: "DELIVERY_FAILED" };
  }
}

export async function getTransferBundleForDownload(
  storage: IStorage,
  tenantId: string,
  transferId: string,
): Promise<{ ok: true; bundle: FhirBundle } | { ok: false; error: string; code?: string }> {
  const transfer = await getInteropTransferById(tenantId, transferId);
  if (!transfer) return { ok: false, error: "Transfer not found", code: "NOT_FOUND" };

  const partner = transfer.partnerId
    ? await getInteropPartnerById(tenantId, transfer.partnerId)
    : null;

  const bundle = await buildCareTransferBundle(storage, tenantId, {
    patientId: transfer.patientId,
    encounterIds: (transfer.encounterIds as string[]) ?? [],
    referringEncounterId: transfer.referringEncounterId,
    partnerName: partner?.name,
    destinationFacilityId: partner?.referralFacilityId,
  });

  if (!bundle) return { ok: false, error: "Unable to rebuild bundle", code: "BUILD_FAILED" };
  return { ok: true, bundle };
}
