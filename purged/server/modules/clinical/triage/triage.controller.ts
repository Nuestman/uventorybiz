import type { IStorage } from "../../../storage";

import type { InsertTriage, InsertVitalSigns, Triage } from "@shared/schema";

import { normalizeVitalsAtTriage, type VitalsAtTriageInput } from "./triage-vitals";

import { assertEncounterWritable } from "../../encounters/encounter-lifecycle";



export type TriageResult<T> =

  | { ok: true; data: T }

  | { ok: false; error: string; code?: string };



export interface TriageListFilters {

  patientId?: string;

  locationId?: string;

  acuity?: string;

  encounterId?: string;

  from?: Date;

  to?: Date;

}



/**

 * Triage (SATS) controller: create, list, getById, update. No req/res; returns result objects.

 */

export function createTriageController(storage: IStorage) {

  return {

    async create(

      tenantId: string,

      userId: string,

      data: Omit<InsertTriage, "recordedBy"> & { recordedBy?: string },

      vitalsAtTriage?: VitalsAtTriageInput,

    ): Promise<TriageResult<Triage>> {

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



        const triagePayload = {

          ...data,

          encounterId,

          medicalVisitId: encounterId,

          patientId: data.patientId ?? encounter!.patientId,

          locationId: data.locationId ?? encounter!.locationId ?? null,

        } as InsertTriage;



        const record = await storage.createTriage(triagePayload, tenantId, userId);

        const vitals = normalizeVitalsAtTriage(vitalsAtTriage);



        if (vitals && record?.id && record.patientId) {

          const vs = await storage.createVitalSigns(

            {

              ...vitals,

              recordedBy: userId,

              patientId: record.patientId,

              locationId: record.locationId ?? triagePayload.locationId ?? null,

              recordedAt: vitals.recordedAt

                ? new Date(vitals.recordedAt as string | Date)

                : record.triageAt,

              encounterId,

              medicalVisitId: encounterId,

              triageId: record.id,

            } as InsertVitalSigns,

            tenantId,

          );



          await storage.updateTriage(

            record.id,

            { vitalSignsId: vs.id },

            tenantId,

            userId,

          );



          await storage.updateMedicalVisit(

            encounterId,

            { triageId: record.id, status: "triaged" },

            tenantId,

            userId,

          );



          const updated = await storage.getTriage(record.id, tenantId);

          return { ok: true, data: updated ?? record };

        }



        await storage.updateMedicalVisit(

          encounterId,

          { triageId: record.id, status: "triaged" },

          tenantId,

          userId,

        );



        return { ok: true, data: record };

      } catch (err) {

        console.error("Triage controller create:", err);

        return {

          ok: false,

          error: err instanceof Error ? err.message : "Failed to create triage",

        };

      }

    },



    async list(tenantId: string, filters?: TriageListFilters): Promise<TriageResult<Triage[]>> {

      try {

        const data = await storage.listTriage(tenantId, filters);

        return { ok: true, data };

      } catch (err) {

        console.error("Triage controller list:", err);

        return {

          ok: false,

          error: err instanceof Error ? err.message : "Failed to fetch triage",

        };

      }

    },



    async getById(

      id: string,

      tenantId: string

    ): Promise<TriageResult<Triage> | { ok: false; error: string; code: "NOT_FOUND" }> {

      try {

        const record = await storage.getTriage(id, tenantId);

        if (!record) return { ok: false, error: "Triage not found", code: "NOT_FOUND" };

        return { ok: true, data: record };

      } catch (err) {

        console.error("Triage controller getById:", err);

        return {

          ok: false,

          error: err instanceof Error ? err.message : "Failed to fetch triage",

        };

      }

    },



    async update(

      id: string,

      tenantId: string,

      userId: string,

      data: Partial<InsertTriage>

    ): Promise<TriageResult<Triage>> {

      try {

        const record = await storage.updateTriage(id, data, tenantId, userId);

        return { ok: true, data: record };

      } catch (err) {

        console.error("Triage controller update:", err);

        return {

          ok: false,

          error: err instanceof Error ? err.message : "Failed to update triage",

        };

      }

    },

  };

}



export type TriageController = ReturnType<typeof createTriageController>;

