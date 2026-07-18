import type { IStorage } from "../../../storage";
import type { InsertMedicalRecord, MedicalRecord } from "@shared/schema";

export type MedicalRecordResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/**
 * Medical records controller: create, list by patient. No req/res; returns result objects.
 */
export function createMedicalRecordsController(storage: IStorage) {
  return {
    async create(
      tenantId: string,
      data: Omit<InsertMedicalRecord, "medicalStaffId"> & { medicalStaffId: string }
    ): Promise<MedicalRecordResult<MedicalRecord>> {
      try {
        const record = await storage.createMedicalRecord(data as InsertMedicalRecord, tenantId);
        return { ok: true, data: record };
      } catch (err) {
        console.error("Medical records controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create medical record",
        };
      }
    },

    async listByPatient(
      patientId: string,
      tenantId: string
    ): Promise<MedicalRecordResult<MedicalRecord[]>> {
      try {
        const data = await storage.getMedicalRecords(patientId, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Medical records controller listByPatient:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch medical records",
        };
      }
    },
  };
}

export type MedicalRecordsController = ReturnType<typeof createMedicalRecordsController>;
