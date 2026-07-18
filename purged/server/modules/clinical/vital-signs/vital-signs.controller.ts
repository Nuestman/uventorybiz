import type { IStorage } from "../../../storage";
import type { InsertVitalSigns, VitalSigns } from "@shared/schema";
import { assertEncounterWritable } from "../../encounters/encounter-lifecycle";

export type VitalSignsResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export interface VitalSignsListFilters {
  patientId?: string;
  medicalVisitId?: string;
  encounterId?: string;
  triageId?: string;
  from?: Date;
  to?: Date;
}

/**
 * Vital signs controller: create, list, getById. No req/res; returns result objects.
 */
export function createVitalSignsController(storage: IStorage) {
  return {
    async create(
      tenantId: string,
      data: Omit<InsertVitalSigns, "recordedBy"> & { recordedBy?: string }
    ): Promise<VitalSignsResult<VitalSigns>> {
      try {
        const encounterId = data.encounterId;
        if (!encounterId) {
          return { ok: false, error: "encounterId is required", code: "ENCOUNTER_REQUIRED" };
        }

        const encounter = await storage.getMedicalVisit(encounterId, tenantId);
        const check = assertEncounterWritable(encounter);
        if (!check.ok) {
          return { ok: false, error: check.error, code: check.code };
        }

        const payload = {
          ...data,
          encounterId,
          medicalVisitId: encounterId,
          patientId: data.patientId ?? encounter!.patientId,
          locationId: data.locationId ?? encounter!.locationId ?? null,
        } as InsertVitalSigns;

        const record = await storage.createVitalSigns(payload, tenantId);

        if (encounter!.status === "arrived" || encounter!.status === "triaged") {
          await storage.updateMedicalVisit(
            encounterId,
            { status: "in_progress" },
            tenantId,
            data.recordedBy,
          );
        }

        return { ok: true, data: record };
      } catch (err) {
        console.error("Vital signs controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create vital signs",
        };
      }
    },

    async list(
      tenantId: string,
      filters?: VitalSignsListFilters
    ): Promise<VitalSignsResult<VitalSigns[]>> {
      try {
        const data = await storage.listVitalSigns(tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Vital signs controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch vital signs",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<VitalSignsResult<VitalSigns> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const record = await storage.getVitalSigns(id, tenantId);
        if (!record) return { ok: false, error: "Vital signs not found", code: "NOT_FOUND" };
        return { ok: true, data: record };
      } catch (err) {
        console.error("Vital signs controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch vital signs",
        };
      }
    },
  };
}

export type VitalSignsController = ReturnType<typeof createVitalSignsController>;
