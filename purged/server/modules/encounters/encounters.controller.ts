import type { IStorage } from "../../storage";
import type { Encounter, InsertMedicalVisit } from "@shared/schema";
import type { z } from "zod";
import type { dischargeEncounterSchema, editEncounterHeaderSchema, openEncounterSchema } from "@shared/schema";
import {
  applyEncounterOpenDefaults,
  derivePathwaySlug,
} from "./encounter-pathways.service";
import { assertEncounterWritable, validateDischargeDisposition } from "./encounter-lifecycle";
import { WRITABLE_ENCOUNTER_STATUSES } from "@shared/encounterPathways";
import type { EncounterModality } from "@shared/encounterPathways";

export type EncounterResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

type OpenEncounterInput = z.infer<typeof openEncounterSchema>;
type DischargeEncounterInput = z.infer<typeof dischargeEncounterSchema>;
type EditEncounterHeaderInput = z.infer<typeof editEncounterHeaderSchema>;

export type EncounterDetail = Encounter & {
  vitalSigns: Awaited<ReturnType<IStorage["listVitalSigns"]>>;
  triageRecords: Awaited<ReturnType<IStorage["listTriage"]>>;
  latestTriage: Awaited<ReturnType<IStorage["listTriage"]>>[number] | null;
};

export function createEncountersController(storage: IStorage) {
  return {
    async open(
      tenantId: string,
      userId: string,
      input: OpenEncounterInput,
    ): Promise<EncounterResult<Encounter>> {
      try {
        const active = await storage.getActiveEncounterForPatient(input.patientId, tenantId);
        if (active) {
          return {
            ok: false,
            error: "Patient already has an open encounter. Discharge it before starting a new one.",
            code: "ACTIVE_ENCOUNTER_EXISTS",
          };
        }

        const defaults = applyEncounterOpenDefaults({
          visitType: input.visitType,
          modality: input.modality,
          triageRequired: input.triageRequired,
          status: "arrived",
        });

        const now = input.visitDate ?? new Date();
        const visitData = {
          patientId: input.patientId,
          locationId: input.locationId ?? null,
          medicalStaffId: userId,
          visitType: defaults.visitType,
          modality: defaults.modality,
          pathway: defaults.pathway,
          triageRequired: defaults.triageRequired,
          visitDate: now,
          arrivedAt: now,
          status: defaults.status,
          chiefComplaint: null,
          disposition: null,
          appointmentId: input.appointmentId ?? null,
          telecareSessionId: input.telecareSessionId ?? null,
          patientLocationNote: input.patientLocationNote ?? null,
        } as InsertMedicalVisit;

        const record = await storage.createMedicalVisit(visitData, tenantId, userId);
        return { ok: true, data: record };
      } catch (err) {
        console.error("Encounters controller open:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to open encounter",
        };
      }
    },

    async editHeader(
      id: string,
      tenantId: string,
      userId: string,
      input: EditEncounterHeaderInput,
    ): Promise<EncounterResult<Encounter> | { ok: false; error: string; code: "NOT_FOUND" | "CLOSED" }> {
      try {
        const existing = await storage.getMedicalVisit(id, tenantId);
        const check = assertEncounterWritable(existing);
        if (!check.ok) {
          return { ok: false, error: check.error, code: check.code };
        }

        const visitType = input.visitType ?? existing!.visitType;
        const modality = (input.modality ?? existing!.modality) as EncounterModality;
        const triageRequired =
          input.triageRequired !== undefined ? input.triageRequired : existing!.triageRequired;

        const updated = await storage.updateMedicalVisit(
          id,
          {
            visitType,
            modality,
            triageRequired,
            pathway: derivePathwaySlug(visitType, modality),
          },
          tenantId,
          userId,
        );
        if (!updated) return { ok: false, error: "Encounter not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Encounters controller editHeader:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update encounter",
        };
      }
    },

    async getActive(
      tenantId: string,
      patientId: string,
    ): Promise<EncounterResult<Encounter | null>> {
      try {
        const record = await storage.getActiveEncounterForPatient(patientId, tenantId);
        return { ok: true, data: record ?? null };
      } catch (err) {
        console.error("Encounters controller getActive:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch active encounter",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string,
    ): Promise<EncounterResult<EncounterDetail> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const encounter = await storage.getMedicalVisit(id, tenantId);
        if (!encounter) return { ok: false, error: "Encounter not found", code: "NOT_FOUND" };

        const [vitalSigns, triageRecords] = await Promise.all([
          storage.listVitalSigns(tenantId, { encounterId: id }),
          storage.listTriage(tenantId, { encounterId: id }),
        ]);

        const latestTriage =
          triageRecords.length > 0
            ? [...triageRecords].sort(
                (a, b) => new Date(b.triageAt).getTime() - new Date(a.triageAt).getTime(),
              )[0]
            : null;

        return {
          ok: true,
          data: { ...encounter, vitalSigns, triageRecords, latestTriage },
        };
      } catch (err) {
        console.error("Encounters controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch encounter",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      updateData: Partial<InsertMedicalVisit>,
    ): Promise<EncounterResult<Encounter> | { ok: false; error: string; code: "NOT_FOUND" | "CLOSED" }> {
      try {
        const existing = await storage.getMedicalVisit(id, tenantId);
        const check = assertEncounterWritable(existing);
        if (!check.ok) {
          return { ok: false, error: check.error, code: check.code };
        }

        const nextStatus =
          updateData.status ??
          (existing!.status === "arrived" || existing!.status === "triaged"
            ? "in_progress"
            : existing!.status);

        const updated = await storage.updateMedicalVisit(
          id,
          { ...updateData, status: nextStatus },
          tenantId,
          userId,
        );
        if (!updated) return { ok: false, error: "Encounter not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Encounters controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update encounter",
        };
      }
    },

    async discharge(
      id: string,
      tenantId: string,
      userId: string,
      input: DischargeEncounterInput,
    ): Promise<EncounterResult<Encounter> | { ok: false; error: string; code: "NOT_FOUND" | "CLOSED" }> {
      try {
        const existing = await storage.getMedicalVisit(id, tenantId);
        const check = assertEncounterWritable(existing);
        if (!check.ok) {
          return { ok: false, error: check.error, code: check.code };
        }

        const dispositionCheck = validateDischargeDisposition(existing!.modality, input.disposition);
        if (!dispositionCheck.ok) {
          return { ok: false, error: dispositionCheck.error };
        }

        const finishedAt = input.dispositionDateTime ?? new Date();
        const updated = await storage.updateMedicalVisit(
          id,
          {
            ...input,
            status: "finished",
            dispositionDateTime: finishedAt,
            finishedAt,
          },
          tenantId,
          userId,
        );
        if (!updated) return { ok: false, error: "Encounter not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Encounters controller discharge:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to discharge encounter",
        };
      }
    },

    async cancel(
      id: string,
      tenantId: string,
      userId: string,
    ): Promise<EncounterResult<Encounter> | { ok: false; error: string; code: "NOT_FOUND" | "CLOSED" }> {
      try {
        const existing = await storage.getMedicalVisit(id, tenantId);
        const check = assertEncounterWritable(existing);
        if (!check.ok) {
          return { ok: false, error: check.error, code: check.code };
        }

        const cancelledAt = new Date();
        const updated = await storage.updateMedicalVisit(
          id,
          { status: "cancelled", cancelledAt },
          tenantId,
          userId,
        );
        if (!updated) return { ok: false, error: "Encounter not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Encounters controller cancel:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to cancel encounter",
        };
      }
    },

    listWritableStatuses(): readonly string[] {
      return WRITABLE_ENCOUNTER_STATUSES;
    },
  };
}

export type EncountersController = ReturnType<typeof createEncountersController>;
