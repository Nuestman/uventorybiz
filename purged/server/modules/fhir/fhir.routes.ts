import type { RequestHandler } from "express";
import { Router } from "express";
import { z } from "zod";
import type { IStorage } from "../../storage";
import { sendError } from "../../shared/errors";
import { validateBody } from "../../shared/validation";
import { insertInteropPartnerSchema } from "@shared/schema";
import { FHIR_VERSION } from "./fhir.constants";
import {
  buildFhirEncounter,
  buildFhirPatient,
  buildPatientEverythingBundle,
  resolveFhirEncounterId,
  resolveFhirPatientId,
} from "./fhir-read.service";
import {
  createInteropPartner,
  listInteropPartners,
  listInteropTransfers,
  rotatePartnerApiKey,
  sanitizePartner,
  updateInteropPartner,
} from "../interop/interop.repository";
import { createInteropAuthMiddleware } from "../interop/interop.middleware";
import {
  deliverTransferBundle,
  getTransferBundleForDownload,
  prepareCareTransferBundle,
} from "../interop/transfer-bundle.service";
import { ingestInboundFhirBundle } from "./fhir-ingest.service";

const prepareTransferSchema = z.object({
  patientId: z.string().min(1),
  partnerId: z.string().optional().nullable(),
  encounterIds: z.array(z.string()).optional(),
  referringEncounterId: z.string().optional().nullable(),
});

export interface FhirRoutesDeps {
  storage: IStorage;
  authMiddleware: RequestHandler;
  requireClinicalAccess: RequestHandler;
  requireAdmin: RequestHandler;
}

function fhirJson(res: import("express").Response, payload: unknown) {
  res.setHeader("Content-Type", "application/fhir+json; charset=utf-8");
  res.setHeader("X-FHIR-Version", FHIR_VERSION);
  res.json(payload);
}

function operationOutcome(diagnostics: string, code = "processing") {
  return {
    resourceType: "OperationOutcome",
    issue: [{ severity: "error", code, diagnostics }],
  };
}

export function createFhirRouter(deps: FhirRoutesDeps): Router {
  const { storage, authMiddleware, requireClinicalAccess, requireAdmin } = deps;
  const router = Router();
  const interopAuth = createInteropAuthMiddleware();

  // --- Staff FHIR read facade ---
  router.get("/fhir/metadata", authMiddleware, requireClinicalAccess, (_req, res) => {
    fhirJson(res, {
      resourceType: "CapabilityStatement",
      status: "active",
      date: new Date().toISOString(),
      kind: "instance",
      fhirVersion: FHIR_VERSION,
      format: ["json"],
      rest: [
        {
          mode: "server",
          resource: [
            { type: "Patient", interaction: [{ code: "read" }] },
            { type: "Encounter", interaction: [{ code: "read" }] },
            { type: "Bundle", interaction: [{ code: "read" }] },
          ],
          operation: [{ name: "everything", definition: "Patient/$everything" }],
        },
      ],
    });
  });

  router.get("/fhir/Patient/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const internalId = await resolveFhirPatientId(storage, tenantId, req.params.id);
    if (!internalId) return fhirJson(res.status(404), operationOutcome("Patient not found", "not-found"));
    const resource = await buildFhirPatient(storage, tenantId, internalId);
    if (!resource) return fhirJson(res.status(404), operationOutcome("Patient not found", "not-found"));
    fhirJson(res, resource);
  });

  router.get("/fhir/Encounter/:id", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const internalId = await resolveFhirEncounterId(tenantId, req.params.id);
    if (!internalId) return fhirJson(res.status(404), operationOutcome("Encounter not found", "not-found"));
    const resource = await buildFhirEncounter(storage, tenantId, internalId);
    if (!resource) return fhirJson(res.status(404), operationOutcome("Encounter not found", "not-found"));
    fhirJson(res, resource);
  });

  router.get("/fhir/Patient/:id/$everything", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const internalId = await resolveFhirPatientId(storage, tenantId, req.params.id);
    if (!internalId) return fhirJson(res.status(404), operationOutcome("Patient not found", "not-found"));
    const bundle = await buildPatientEverythingBundle(storage, tenantId, internalId);
    if (!bundle) return fhirJson(res.status(404), operationOutcome("Patient not found", "not-found"));
    fhirJson(res, bundle);
  });

  // --- Interop partners (admin) ---
  router.get("/interop/partners", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const rows = await listInteropPartners(tenantId);
    res.json(rows.map(sanitizePartner));
  });

  router.post(
    "/interop/partners",
    authMiddleware,
    requireClinicalAccess,
    requireAdmin,
    validateBody(insertInteropPartnerSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const { partner, inboundApiKey } = await createInteropPartner(tenantId, req.body);
      res.status(201).json({
        partner: sanitizePartner(partner),
        inboundApiKey,
        message: "Store this API key securely — it will not be shown again.",
      });
    },
  );

  router.patch(
    "/interop/partners/:id",
    authMiddleware,
    requireClinicalAccess,
    requireAdmin,
    validateBody(insertInteropPartnerSchema.partial()),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const row = await updateInteropPartner(tenantId, req.params.id, req.body);
      if (!row) return sendError(res, 404, "Partner not found");
      res.json(sanitizePartner(row));
    },
  );

  router.post(
    "/interop/partners/:id/rotate-key",
    authMiddleware,
    requireClinicalAccess,
    requireAdmin,
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const result = await rotatePartnerApiKey(tenantId, req.params.id);
      if (!result) return sendError(res, 404, "Partner not found");
      res.json({
        partner: sanitizePartner(result.partner),
        inboundApiKey: result.inboundApiKey,
        message: "Store this API key securely — it will not be shown again.",
      });
    },
  );

  // --- Care transfer tools (clinical) ---
  router.get("/interop/transfers", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const patientId = req.query.patientId as string | undefined;
    const rows = await listInteropTransfers(tenantId, patientId);
    res.json(rows);
  });

  router.post(
    "/interop/transfers/prepare",
    authMiddleware,
    requireClinicalAccess,
    validateBody(prepareTransferSchema),
    async (req: any, res) => {
      const tenantId = req.user?.tenantId;
      const userId = req.user?.id;
      if (!tenantId) return sendError(res, 400, "User has no tenant association");
      const body = req.body as z.infer<typeof prepareTransferSchema>;
      const result = await prepareCareTransferBundle(storage, tenantId, {
        ...body,
        createdBy: userId,
      });
      if (!result.ok) {
        const status = result.code === "NOT_FOUND" ? 404 : 500;
        return sendError(res, status, result.error);
      }
      res.status(201).json({ transferId: result.transferId, bundle: result.bundle });
    },
  );

  router.get("/interop/transfers/:id/bundle", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await getTransferBundleForDownload(storage, tenantId, req.params.id);
    if (!result.ok) return sendError(res, result.code === "NOT_FOUND" ? 404 : 500, result.error);
    fhirJson(res, result.bundle);
  });

  router.post("/interop/transfers/:id/deliver", authMiddleware, requireClinicalAccess, async (req: any, res) => {
    const tenantId = req.user?.tenantId;
    if (!tenantId) return sendError(res, 400, "User has no tenant association");
    const result = await deliverTransferBundle(storage, tenantId, req.params.id);
    if (!result.ok) {
      const status =
        result.code === "NOT_FOUND"
          ? 404
          : result.code === "NO_DELIVERY_URL" || result.code === "NO_PARTNER"
            ? 409
            : 502;
      return sendError(res, status, result.error);
    }
    res.json({ ok: true, status: "delivered" });
  });

  // --- Partner inbound FHIR read (API key) ---
  router.get("/interop/fhir/Patient/:id/$everything", interopAuth, async (req, res) => {
    const partner = req.interopPartner!;
    const tenantId = partner.tenantId;
    const internalId = await resolveFhirPatientId(storage, tenantId, req.params.id);
    if (!internalId) return fhirJson(res.status(404), operationOutcome("Patient not found", "not-found"));
    const bundle = await buildPatientEverythingBundle(storage, tenantId, internalId);
    if (!bundle) return fhirJson(res.status(404), operationOutcome("Patient not found", "not-found"));
    fhirJson(res, bundle);
  });

  router.get("/interop/fhir/Patient/:id", interopAuth, async (req, res) => {
    const partner = req.interopPartner!;
    const tenantId = partner.tenantId;
    const internalId = await resolveFhirPatientId(storage, tenantId, req.params.id);
    if (!internalId) return fhirJson(res.status(404), operationOutcome("Patient not found", "not-found"));
    const resource = await buildFhirPatient(storage, tenantId, internalId);
    if (!resource) return fhirJson(res.status(404), operationOutcome("Patient not found", "not-found"));
    fhirJson(res, resource);
  });

  router.post("/interop/fhir/Bundle", interopAuth, async (req, res) => {
    const partner = req.interopPartner!;
    const bundle = req.body as import("./fhir.types").FhirBundle;
    const result = await ingestInboundFhirBundle(storage, partner.tenantId, partner.id, bundle);
    if (!result.ok) {
      const status =
        result.status ??
        (result.code === "patient-not-found" || result.code === "invalid" ? 422 : 500);
      return fhirJson(res.status(status), {
        resourceType: "OperationOutcome",
        issue: [
          {
            severity: "error",
            code: result.code,
            diagnostics: result.error,
          },
          ...(result.issues ?? []).map((i) => ({
            severity: i.severity,
            code: "processing",
            diagnostics: i.message,
          })),
        ],
      });
    }

    fhirJson(res.status(201), {
      resourceType: "OperationOutcome",
      id: result.transferId,
      issue: result.issues.map((i) => ({
        severity: i.severity,
        code: "informational",
        diagnostics: i.message,
      })),
      extension: [
        { url: "https://mineaidhms.com/fhir/StructureDefinition/ingest-transfer-id", valueString: result.transferId },
        { url: "https://mineaidhms.com/fhir/StructureDefinition/ingest-patient-id", valueString: result.patientId },
        {
          url: "https://mineaidhms.com/fhir/StructureDefinition/ingest-encounters-created",
          valueInteger: result.encountersCreated,
        },
      ],
    });
  });

  return router;
}
