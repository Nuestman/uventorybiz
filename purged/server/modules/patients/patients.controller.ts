import type { IStorage } from "../../storage";
import type { InsertPatient, Patient } from "@shared/schema";

export type PatientListRow = { patient: Patient; employee: unknown; company: unknown };

/** Result type for controller actions */
export type PatientResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function createPatientsController(storage: IStorage) {
  return {
    async search(tenantId: string, q: string): Promise<PatientResult<unknown[]>> {
      try {
        if (!q || typeof q !== "string") return { ok: true, data: [] };
        const data = await storage.searchPatientsEmployees(q, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Patients controller search:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to search patient employees",
        };
      }
    },

    async create(
      tenantId: string,
      data: InsertPatient
    ): Promise<PatientResult<Patient> | { ok: false; error: string; code: "ALREADY_REGISTERED"; employeeId: string }> {
      try {
        const existing = await storage.getPatientByEmployeeId(data.employeeId, tenantId);
        if (existing) {
          return { ok: false, error: "This employee is already registered as a patient", code: "ALREADY_REGISTERED", employeeId: data.employeeId };
        }
        const patient = await storage.createPatient(data, tenantId);
        return { ok: true, data: patient };
      } catch (err) {
        console.error("Patients controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create patient",
        };
      }
    },

    async list(
      tenantId: string,
      options: { search?: string; limit?: number }
    ): Promise<PatientResult<PatientListRow[]>> {
      try {
        const data = options.search
          ? await storage.searchPatients(options.search, tenantId)
          : await storage.getPatients(tenantId, options.limit);
        return { ok: true, data };
      } catch (err) {
        console.error("Patients controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch patients",
        };
      }
    },

    async getById(id: string, tenantId: string): Promise<PatientResult<Patient> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const patient = await storage.getPatient(id, tenantId);
        if (!patient) return { ok: false, error: "Patient not found", code: "NOT_FOUND" };
        return { ok: true, data: patient };
      } catch (err) {
        console.error("Patients controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch patient",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      data: Partial<InsertPatient>
    ): Promise<PatientResult<Patient>> {
      try {
        const patient = await storage.updatePatient(id, data, tenantId);
        return { ok: true, data: patient };
      } catch (err) {
        console.error("Patients controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update patient",
        };
      }
    },
  };
}

export type PatientsController = ReturnType<typeof createPatientsController>;
