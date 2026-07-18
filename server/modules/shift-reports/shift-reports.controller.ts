import type { IStorage } from "../../storage";
import type { HandoverStructured, ShiftReport } from "@shared/schema";
import {
  notifyShiftReportAcknowledged,
  notifyShiftReportPublished,
} from "../../notificationTriggers";

export type ShiftReportResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export type ShiftReportWithDetails = ShiftReport & {
  locationName?: string;
  reportedByName?: string;
  ackCount?: number;
  acknowledgedByMe?: boolean;
};

export type ListFilters = {
  locationId?: string;
  fromDate?: string;
  toDate?: string;
  shift?: string;
  limit?: number;
  offset?: number;
  unacknowledgedByUserId?: string;
};

export type ShiftReportDetailBundle = ShiftReportWithDetails & {
  acknowledgments?: Awaited<ReturnType<IStorage["listShiftReportAcknowledgments"]>>;
  links?: Awaited<ReturnType<IStorage["listShiftReportLinks"]>>;
  attachments?: Awaited<ReturnType<IStorage["listShiftReportAttachments"]>>;
  revisionHistory?: Awaited<ReturnType<IStorage["listShiftReportRevisionHistory"]>>;
};

async function canManageShiftReport(storage: IStorage, report: ShiftReport, userId: string): Promise<boolean> {
  if (report.reportedById === userId) return true;
  const user = await storage.getUserById(userId);
  return user?.role === "admin" || user?.role === "super_admin";
}

function displayName(user: Awaited<ReturnType<IStorage["getUserById"]>>): string {
  if (!user) return "Unknown";
  return `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email || user.id;
}

export function createShiftReportsController(storage: IStorage) {
  return {
    async shiftoverSummary(tenantId: string, userId: string, locationId?: string) {
      try {
        const data = await storage.getShiftoverSummary(tenantId, userId, {
          locationId,
          pendingAckDays: 14,
        });
        return { ok: true as const, data };
      } catch (err) {
        console.error("shiftoverSummary:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to load ShiftOver summary",
        };
      }
    },

    async openItems(tenantId: string, locationId?: string) {
      try {
        const data = await storage.listShiftoverOpenItems(tenantId, { locationId, sinceDays: 90 });
        return { ok: true as const, data };
      } catch (err) {
        console.error("openItems:", err);
        return {
          ok: false as const,
          error: err instanceof Error ? err.message : "Failed to load open items",
        };
      }
    },

    async list(
      tenantId: string,
      filters?: ListFilters,
      options?: { enrich?: boolean; currentUserId?: string }
    ): Promise<ShiftReportResult<ShiftReportWithDetails[]>> {
      try {
        const reports = await storage.getShiftReports(tenantId, filters);
        const userIds = Array.from(new Set(reports.map((r) => r.reportedById)));
        const [locationsList, usersList] = await Promise.all([
          storage.getCareLocations(tenantId, { includeInactive: true }),
          Promise.all(userIds.map((id) => storage.getUserById(id))),
        ]);
        const locationMap = new Map(locationsList.map((l) => [l.id, l.locationName]));
        const userMap = new Map(
          userIds.map((u, i) => [
            userIds[i],
            usersList[i]
              ? `${usersList[i]!.firstName ?? ""} ${usersList[i]!.lastName ?? ""}`.trim() ||
                usersList[i]!.email ||
                usersList[i]!.id
              : "",
          ])
        );
        let ackMap = new Map<string, { ackCount: number; acknowledgedByMe: boolean }>();
        if (options?.enrich && options.currentUserId && reports.length > 0) {
          ackMap = await storage.getShiftReportAckStats(
            tenantId,
            reports.map((r) => r.id),
            options.currentUserId
          );
        }
        const data: ShiftReportWithDetails[] = reports.map((r) => {
          const st = ackMap.get(r.id);
          return {
            ...r,
            locationName: locationMap.get(r.locationId) ?? undefined,
            reportedByName: userMap.get(r.reportedById) ?? undefined,
            ackCount: st?.ackCount ?? 0,
            acknowledgedByMe: st?.acknowledgedByMe ?? false,
          };
        });
        return { ok: true, data };
      } catch (err) {
        console.error("Shift reports controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch shift reports",
        };
      }
    },

    async getById(
      id: string,
      tenantId: string,
      options?: { detail?: boolean }
    ): Promise<
      ShiftReportResult<ShiftReportWithDetails | ShiftReportDetailBundle> | { ok: false; error: string; code: "NOT_FOUND" }
    > {
      try {
        const report = await storage.getShiftReportById(id, tenantId);
        if (!report) return { ok: false, error: "Shift report not found", code: "NOT_FOUND" };
        const [location, user] = await Promise.all([
          storage.getCareLocation(report.locationId, tenantId),
          storage.getUserById(report.reportedById),
        ]);
        const base: ShiftReportWithDetails = {
          ...report,
          locationName: location?.locationName,
          reportedByName: displayName(user),
        };
        if (!options?.detail) {
          return { ok: true, data: base };
        }
        const [acknowledgments, links, attachments, revisionHistory] = await Promise.all([
          storage.listShiftReportAcknowledgments(id, tenantId),
          storage.listShiftReportLinks(id, tenantId),
          storage.listShiftReportAttachments(id, tenantId),
          storage.listShiftReportRevisionHistory(id, tenantId, 20),
        ]);
        const data: ShiftReportDetailBundle = {
          ...base,
          acknowledgments,
          links,
          attachments,
          revisionHistory,
        };
        return { ok: true, data };
      } catch (err) {
        console.error("Shift reports controller getById:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch shift report",
        };
      }
    },

    async create(
      tenantId: string,
      userId: string,
      body: {
        locationId: string;
        reportDate: string;
        shift: string;
        summary: string;
        notes?: string;
        activitiesNotes?: string;
        handoverNotes?: string;
        hasIssues?: boolean;
        issuesNotes?: string;
        handoverStructured?: HandoverStructured | null;
      }
    ): Promise<ShiftReportResult<ShiftReport>> {
      try {
        const location = await storage.getCareLocation(body.locationId, tenantId);
        if (!location) return { ok: false, error: "Location not found or not in tenant" };
        if (location.status !== "active") return { ok: false, error: "Location is not active" };
        const report = await storage.createShiftReport(tenantId, {
          locationId: body.locationId,
          reportedById: userId,
          reportDate: body.reportDate,
          shift: body.shift,
          summary: body.summary,
          notes: body.notes ?? null,
          activitiesNotes: body.activitiesNotes ?? null,
          handoverNotes: body.handoverNotes ?? null,
          hasIssues: body.hasIssues ?? false,
          issuesNotes: body.issuesNotes ?? null,
          handoverStructured: body.handoverStructured ?? null,
        });
        void notifyShiftReportPublished(storage, report, tenantId, location.locationName);
        return { ok: true, data: report };
      } catch (err) {
        console.error("Shift reports controller create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create shift report",
        };
      }
    },

    async update(
      id: string,
      tenantId: string,
      userId: string,
      body: {
        reportDate?: string;
        shift?: string;
        summary?: string;
        notes?: string;
        activitiesNotes?: string;
        handoverNotes?: string;
        hasIssues?: boolean;
        issuesNotes?: string;
        handoverStructured?: HandoverStructured | null;
      }
    ): Promise<ShiftReportResult<ShiftReport> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" }> {
      try {
        const existing = await storage.getShiftReportById(id, tenantId);
        if (!existing) return { ok: false, error: "Shift report not found", code: "NOT_FOUND" };
        if (!(await canManageShiftReport(storage, existing, userId))) {
          return { ok: false, error: "You do not have permission to edit this shift report", code: "FORBIDDEN" };
        }
        const updated = await storage.updateShiftReport(
          id,
          tenantId,
          {
            reportDate: body.reportDate ?? existing.reportDate,
            shift: body.shift ?? existing.shift,
            summary: body.summary ?? existing.summary,
            notes: body.notes ?? existing.notes ?? undefined,
            activitiesNotes: body.activitiesNotes ?? existing.activitiesNotes ?? undefined,
            handoverNotes: body.handoverNotes ?? existing.handoverNotes ?? undefined,
            hasIssues: body.hasIssues ?? existing.hasIssues ?? false,
            issuesNotes: body.issuesNotes ?? existing.issuesNotes ?? undefined,
            handoverStructured:
              body.handoverStructured !== undefined
                ? body.handoverStructured
                : (existing.handoverStructured ?? null),
          },
          userId
        );
        return { ok: true, data: updated };
      } catch (err) {
        console.error("Shift reports controller update:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update shift report",
        };
      }
    },

    async remove(
      id: string,
      tenantId: string,
      userId: string
    ): Promise<ShiftReportResult<{ message: string }> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" }> {
      try {
        const existing = await storage.getShiftReportById(id, tenantId);
        if (!existing) return { ok: false, error: "Shift report not found", code: "NOT_FOUND" };
        if (!(await canManageShiftReport(storage, existing, userId))) {
          return { ok: false, error: "You do not have permission to delete this shift report", code: "FORBIDDEN" };
        }
        await storage.deleteShiftReport(id, tenantId);
        return { ok: true, data: { message: "Shift report deleted" } };
      } catch (err) {
        console.error("Shift reports controller delete:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete shift report",
        };
      }
    },

    async acknowledge(
      id: string,
      tenantId: string,
      userId: string,
      note?: string | null
    ): Promise<
      ShiftReportResult<{ acknowledged: boolean }> | { ok: false; error: string; code: "NOT_FOUND" }
    > {
      try {
        const report = await storage.getShiftReportById(id, tenantId);
        if (!report) return { ok: false, error: "Shift report not found", code: "NOT_FOUND" };
        await storage.createShiftReportAcknowledgment(tenantId, id, userId, note);
        const user = await storage.getUserById(userId);
        void notifyShiftReportAcknowledged(storage, report, tenantId, userId, displayName(user));
        return { ok: true, data: { acknowledged: true } };
      } catch (err) {
        console.error("Shift reports acknowledge:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to acknowledge shift report",
        };
      }
    },

    async addLink(
      reportId: string,
      tenantId: string,
      userId: string,
      body: { linkedType: "ticket" | "incident" | "duty"; linkedId: string; note?: string | null }
    ): Promise<
      ShiftReportResult<Awaited<ReturnType<IStorage["createShiftReportLink"]>>> | {
        ok: false;
        error: string;
        code: "NOT_FOUND" | "FORBIDDEN" | "BAD_TARGET";
      }
    > {
      try {
        const report = await storage.getShiftReportById(reportId, tenantId);
        if (!report) return { ok: false, error: "Shift report not found", code: "NOT_FOUND" };
        if (!(await canManageShiftReport(storage, report, userId))) {
          return { ok: false, error: "You do not have permission to add links to this report", code: "FORBIDDEN" };
        }
        if (body.linkedType === "ticket") {
          const t = await storage.getTicketById(body.linkedId, tenantId);
          if (!t) return { ok: false, error: "Ticket not found in tenant", code: "BAD_TARGET" };
        } else if (body.linkedType === "incident") {
          const i = await storage.getIncidentReport(body.linkedId, tenantId);
          if (!i) return { ok: false, error: "Incident not found in tenant", code: "BAD_TARGET" };
        } else {
          const d = await storage.getDutyAssignment(body.linkedId, tenantId);
          if (!d) return { ok: false, error: "Duty assignment not found in tenant", code: "BAD_TARGET" };
        }
        const link = await storage.createShiftReportLink(
          tenantId,
          reportId,
          userId,
          body.linkedType,
          body.linkedId,
          body.note
        );
        return { ok: true, data: link };
      } catch (err) {
        console.error("addLink:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to add link",
        };
      }
    },

    async removeAttachment(
      attachmentId: string,
      tenantId: string,
      userId: string
    ): Promise<ShiftReportResult<{ message: string }> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" }> {
      try {
        const att = await storage.getShiftReportAttachmentById(attachmentId, tenantId);
        if (!att) return { ok: false, error: "Attachment not found", code: "NOT_FOUND" };
        const report = await storage.getShiftReportById(att.shiftReportId, tenantId);
        if (!report) return { ok: false, error: "Shift report not found", code: "NOT_FOUND" };
        if (!(await canManageShiftReport(storage, report, userId))) {
          return { ok: false, error: "You do not have permission to remove this attachment", code: "FORBIDDEN" };
        }
        await storage.deleteShiftReportAttachment(attachmentId, tenantId);
        return { ok: true, data: { message: "Attachment removed" } };
      } catch (err) {
        console.error("removeAttachment:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to remove attachment",
        };
      }
    },

    async removeLink(
      linkId: string,
      tenantId: string,
      userId: string
    ): Promise<ShiftReportResult<{ message: string }> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" }> {
      try {
        const linkRow = await storage.getShiftReportLinkById(linkId, tenantId);
        if (!linkRow) return { ok: false, error: "Link not found", code: "NOT_FOUND" };
        const report = await storage.getShiftReportById(linkRow.shiftReportId, tenantId);
        if (!report) return { ok: false, error: "Shift report not found", code: "NOT_FOUND" };
        if (!(await canManageShiftReport(storage, report, userId))) {
          return { ok: false, error: "You do not have permission to remove this link", code: "FORBIDDEN" };
        }
        await storage.deleteShiftReportLink(linkId, tenantId);
        return { ok: true, data: { message: "Link removed" } };
      } catch (err) {
        console.error("removeLink:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to remove link",
        };
      }
    },
  };
}
