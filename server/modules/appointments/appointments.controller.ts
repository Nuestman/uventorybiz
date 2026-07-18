import type { IStorage } from "../../storage";
import type { InsertAppointment, Appointment, UpdateAppointment } from "@shared/schema";
import { findAppointmentConflicts, applyStaffAppointmentUpdate, staffConfirmAppointmentReschedule } from "./appointment-management.service";
import {
  notifyAppointmentScheduled,
} from "./appointment-notifications.service";

export type AppointmentResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export function createAppointmentsController(storage: IStorage) {
  return {
    async create(
      tenantId: string,
      userId: string,
      data: InsertAppointment
    ): Promise<AppointmentResult<Appointment>> {
      try {
        const appointmentDate =
          data.appointmentDate instanceof Date ? data.appointmentDate : new Date(data.appointmentDate);

        const conflicts = await findAppointmentConflicts(tenantId, {
          appointmentDate,
          medicalStaffId: data.medicalStaffId,
          employeeId: data.employeeId,
        });
        if (conflicts.length > 0) {
          return {
            ok: false,
            error: "This time overlaps another appointment for the provider or attendee",
            code: "CONFLICT",
          };
        }

        const appointment = await storage.createAppointment(
          { ...data, appointmentDate },
          tenantId,
          userId,
        );

        notifyAppointmentScheduled(storage, tenantId, appointment, userId);
        return { ok: true, data: appointment };
      } catch (err) {
        console.error("Appointments controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create appointment",
        };
      }
    },

    async list(
      tenantId: string,
      options: {
        employeeId?: string;
        today?: boolean;
        start?: Date;
        end?: Date;
        page?: number;
        pageSize?: number;
        search?: string;
        status?: string;
        appointmentType?: string;
      }
    ): Promise<
      AppointmentResult<
        | Appointment[]
        | unknown[]
        | { rows: unknown[]; page: number; pageSize: number; totalCount: number }
      >
    > {
      try {
        let data;
        if (options.start && options.end) {
          data = await storage.getAppointmentsInRange(tenantId, options.start, options.end, options.employeeId);
        } else if (options.today) {
          data = await storage.getTodayAppointments(tenantId);
        } else if (options.page !== undefined) {
          const page = Math.max(1, options.page ?? 1);
          const pageSize = options.pageSize ?? 25;
          const { rows, totalCount } = await storage.listAppointmentsPaginated(tenantId, {
            employeeId: options.employeeId,
            page,
            pageSize,
            search: options.search,
            status: options.status,
            appointmentType: options.appointmentType,
          });
          return { ok: true, data: { rows, page, pageSize, totalCount } };
        } else {
          data = await storage.getAppointments(tenantId, options.employeeId);
        }
        return { ok: true, data };
      } catch (err) {
        console.error("Appointments controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch appointments",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      data: UpdateAppointment
    ): Promise<AppointmentResult<Appointment> | { ok: false; error: string; code: "NOT_FOUND" | "CONFLICT" | "INVALID_STATE" }> {
      try {
        const result = await applyStaffAppointmentUpdate(storage, tenantId, userId, id, data);
        if (!result.ok) {
          return {
            ok: false,
            error: result.error,
            code:
              result.code === "CONFLICT"
                ? "CONFLICT"
                : result.code === "INVALID_STATE"
                  ? "INVALID_STATE"
                  : "NOT_FOUND",
          };
        }
        return { ok: true, data: result.data };
      } catch (err) {
        console.error("Appointments controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update appointment",
        };
      }
    },

    async confirmReschedule(
      id: string,
      tenantId: string,
      userId: string,
    ): Promise<AppointmentResult<Appointment> | { ok: false; error: string; code: "NOT_FOUND" | "INVALID_STATE" }> {
      try {
        const result = await staffConfirmAppointmentReschedule(storage, tenantId, userId, id);
        if (!result.ok) {
          return {
            ok: false,
            error: result.error,
            code: result.code === "INVALID_STATE" ? "INVALID_STATE" : "NOT_FOUND",
          };
        }
        return { ok: true, data: result.data };
      } catch (err) {
        console.error("Appointments controller confirmReschedule:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to confirm reschedule",
        };
      }
    },

    async delete(
      id: string,
      tenantId: string,
      userId: string
    ): Promise<AppointmentResult<{ message: string }>> {
      try {
        await storage.deleteAppointment(id, tenantId, userId);
        return { ok: true, data: { message: "Appointment deleted successfully" } };
      } catch (err) {
        console.error("Appointments controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete appointment",
        };
      }
    },
  };
}

export type AppointmentsController = ReturnType<typeof createAppointmentsController>;
