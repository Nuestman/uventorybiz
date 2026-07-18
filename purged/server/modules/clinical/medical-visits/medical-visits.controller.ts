import type { IStorage } from "../../../storage";
import type { InsertMedicalVisit, MedicalVisit } from "@shared/schema";

export type MedicalVisitListFilters = {
  patientId?: string;
  page?: number;
  pageSize?: number;
  search?: string;
  statusGroup?: string;
  visitType?: string;
  locationId?: string;
  companyName?: string;
};

export type PaginatedMedicalVisitsResponse = {
  rows: any[];
  page: number;
  pageSize: number;
  totalCount: number;
};

export type MedicalVisitResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

/** Optional initial vitals payload when creating a visit (from req.body.initialVitals). */
export interface InitialVitalsPayload {
  recordedAt?: string;
  triageId?: string | null;
  bloodPressureSystolic?: number | null;
  bloodPressureDiastolic?: number | null;
  heartRate?: number | null;
  temperature?: number | null;
  respiratoryRate?: number | null;
  oxygenSaturation?: number | null;
  glucoseLevel?: number | null;
  painScore?: number | null;
  weight?: number | null;
  height?: number | null;
  notes?: string | null;
}

/**
 * Medical visits controller: create (with optional initial vitals), list, getById (with vitals + triage), update, delete.
 * No req/res; returns result objects. Audit log is created in controller for update/delete.
 */
export function createMedicalVisitsController(storage: IStorage) {
  return {
    async create(
      tenantId: string,
      userId: string,
      visitData: InsertMedicalVisit,
      initialVitals?: InitialVitalsPayload
    ): Promise<MedicalVisitResult<MedicalVisit>> {
      try {
        const visit = await storage.createMedicalVisit(visitData, tenantId, userId);
        if (initialVitals && visit?.id && visit?.patientId) {
          try {
            const vsPayload = {
              recordedBy: userId,
              patientId: visit.patientId,
              locationId: visit.locationId || visitData.locationId,
              recordedAt: initialVitals.recordedAt ? new Date(initialVitals.recordedAt) : visit.visitDate,
              medicalVisitId: visit.id,
              encounterId: visit.id,
              triageId: initialVitals.triageId ?? null,
              bloodPressureSystolic: initialVitals.bloodPressureSystolic ?? null,
              bloodPressureDiastolic: initialVitals.bloodPressureDiastolic ?? null,
              heartRate: initialVitals.heartRate ?? null,
              temperature: initialVitals.temperature ?? null,
              respiratoryRate: initialVitals.respiratoryRate ?? null,
              oxygenSaturation: initialVitals.oxygenSaturation ?? null,
              glucoseLevel: initialVitals.glucoseLevel ?? null,
              painScore: initialVitals.painScore ?? null,
              weight: initialVitals.weight ?? null,
              height: initialVitals.height ?? null,
              notes: initialVitals.notes ?? null,
            };
            await storage.createVitalSigns(vsPayload as any, tenantId);
          } catch (vsErr) {
            console.warn("Failed to create initial vital signs for visit:", vsErr);
          }
        }
        return { ok: true, data: visit };
      } catch (err) {
        console.error("Medical visits controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create medical visit",
        };
      }
    },

    async list(
      tenantId: string,
      filters: MedicalVisitListFilters = {},
    ): Promise<MedicalVisitResult<any[] | PaginatedMedicalVisitsResponse>> {
      try {
        const hasPagination = filters.page !== undefined;
        if (filters.patientId && !hasPagination) {
          const data = await storage.getMedicalVisits(filters.patientId, tenantId);
          return { ok: true, data };
        }
        const page = Math.max(1, filters.page ?? 1);
        const pageSize = filters.pageSize ?? (hasPagination ? 25 : 50);
        const { rows, totalCount } = await storage.listMedicalVisitsWithPatients(tenantId, {
          ...filters,
          page,
          pageSize,
        });
        if (hasPagination) {
          return { ok: true, data: { rows, page, pageSize, totalCount } };
        }
        return { ok: true, data: rows };
      } catch (err) {
        console.error("Medical visits controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch medical visits",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string
    ): Promise<MedicalVisitResult<MedicalVisit & { vitalSigns: any[]; triage: any }> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const visit = await storage.getMedicalVisit(id, tenantId);
        if (!visit) return { ok: false, error: "Medical visit not found", code: "NOT_FOUND" };
        const [vitalSigns, triageRecord] = await Promise.all([
          storage.listVitalSigns(tenantId, { medicalVisitId: visit.id }),
          visit.triageId ? storage.getTriage(visit.triageId, tenantId) : Promise.resolve(null),
        ]);
        return { ok: true, data: { ...visit, vitalSigns, triage: triageRecord } };
      } catch (err) {
        console.error("Medical visits controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch medical visit",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      updateData: Partial<InsertMedicalVisit> & Record<string, unknown>
    ): Promise<MedicalVisitResult<MedicalVisit> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const updatedVisit = await storage.updateMedicalVisit(id, updateData, tenantId, userId);
        if (!updatedVisit) return { ok: false, error: "Medical visit not found", code: "NOT_FOUND" };
        await storage.createAuditLog(
          {
            userId,
            action: "update",
            resourceType: "medical_visit",
            resourceId: id,
            details: updateData,
          },
          tenantId
        );
        return { ok: true, data: updatedVisit };
      } catch (err) {
        console.error("Medical visits controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update medical visit",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string,
      userId: string
    ): Promise<MedicalVisitResult<{ success: true }>> {
      try {
        await storage.deleteMedicalVisit(id, tenantId, userId);
        await storage.createAuditLog(
          { userId, action: "delete", resourceType: "medical_visit", resourceId: id },
          tenantId
        );
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Medical visits controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete medical visit",
        };
      }
    },
  };
}

export type MedicalVisitsController = ReturnType<typeof createMedicalVisitsController>;
