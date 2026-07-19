import type { IStorage } from "../../storage";
import type { Ticket, TicketActivity, TicketAttachment, TicketCategory, TicketComment } from "@shared/schema";
import { sanitizeTicketHtml } from "../../shared/ticketHtmlSanitize";

export type TicketResult<T> = { ok: true; data: T } | { ok: false; error: string; code?: string };

export type TicketRow = Ticket & {
  categoryName: string;
  requesterName?: string;
  assigneeName?: string | null;
  requesterPortalEmail?: string | null;
};

export type TicketCommentRow = TicketComment & { authorName?: string };
export type TicketActivityRow = TicketActivity & { actorName?: string };
export type TicketAttachmentRow = TicketAttachment & { uploadedByName?: string };

export type TicketDetailPayload = {
  ticket: TicketRow;
  comments: TicketCommentRow[];
  attachments: TicketAttachmentRow[];
  activity: TicketActivityRow[];
};

function isTicketAdminRole(role: string | undefined): boolean {
  return role === "admin" || role === "super_admin";
}

function canViewTicket(ticket: Ticket, userId: string, role: string | undefined): boolean {
  if (isTicketAdminRole(role)) return true;
  if (ticket.assigneeUserId === userId) return true;
  if (ticket.requesterUserId && ticket.requesterUserId === userId) return true;
  return false;
}

function canSeeInternalOnTicket(ticket: Ticket, userId: string, role: string | undefined): boolean {
  if (isTicketAdminRole(role)) return true;
  return ticket.assigneeUserId === userId;
}

async function displayName(storage: IStorage, userId: string): Promise<string> {
  const u = await storage.getUserById(userId);
  if (!u) return userId;
  const n = `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim();
  return n || u.email || u.id;
}

export function createTicketsController(storage: IStorage) {
  return {
    async listCategories(
      tenantId: string,
      options?: { includeInactive?: boolean }
    ): Promise<TicketResult<TicketCategory[]>> {
      try {
        const data = await storage.listTicketCategories(tenantId, {
          includeInactive: options?.includeInactive === true,
        });
        return { ok: true, data };
      } catch (err) {
        console.error("tickets listCategories:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load categories",
        };
      }
    },

    async createCategory(
      tenantId: string,
      body: { name: string; slug: string; sortOrder?: number }
    ): Promise<TicketResult<TicketCategory>> {
      try {
        const data = await storage.createTicketCategory(tenantId, body);
        return { ok: true, data };
      } catch (err) {
        console.error("tickets createCategory:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create category",
        };
      }
    },

    async updateCategory(
      id: string,
      tenantId: string,
      body: Partial<{ name: string; slug: string; sortOrder: number; isActive: boolean }>
    ): Promise<TicketResult<TicketCategory> | { ok: false; error: string; code: "NOT_FOUND" }> {
      try {
        const data = await storage.updateTicketCategory(id, tenantId, body);
        if (!data) return { ok: false, error: "Category not found", code: "NOT_FOUND" };
        return { ok: true, data };
      } catch (err) {
        console.error("tickets updateCategory:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update category",
        };
      }
    },

    async deleteCategory(
      id: string,
      tenantId: string
    ): Promise<TicketResult<{ message: string }> | { ok: false; error: string; code: string }> {
      const result = await storage.deleteTicketCategory(id, tenantId);
      if (!result.ok) {
        if (result.reason === "not_found") {
          return { ok: false, error: "Category not found", code: "NOT_FOUND" };
        }
        return {
          ok: false,
          error: "Category is in use by tickets and cannot be deleted",
          code: "IN_USE",
        };
      }
      return { ok: true, data: { message: "Category deleted" } };
    },

    async list(
      tenantId: string,
      userId: string,
      role: string | undefined,
      query: {
        scope?: "mine" | "requested" | "assigned" | "all" | string;
        status?: string;
        categoryId?: string;
        source?: "staff" | "portal" | string;
        limit?: number;
        offset?: number;
      }
    ): Promise<TicketResult<TicketRow[]>> {
      try {
        const isAdmin = isTicketAdminRole(role);
        const allowedScopes = new Set(["mine", "requested", "assigned", "all"]);
        const rawScope = query.scope ?? "requested";
        if (!allowedScopes.has(rawScope)) {
          return { ok: false, error: "Invalid scope", code: "INVALID" };
        }
        let scope: "mine" | "requested" | "assigned" | "all" = rawScope as "mine" | "requested" | "assigned" | "all";
        if (scope === "all" && !isAdmin) {
          return { ok: false, error: "Not allowed to list all tenant tickets", code: "FORBIDDEN" };
        }
        const source =
          query.source === "staff" || query.source === "portal" ? query.source : undefined;
        const rows = await storage.listTickets(tenantId, {
          viewerUserId: userId,
          scope,
          status: query.status,
          categoryId: query.categoryId,
          source,
          limit: query.limit,
          offset: query.offset,
        });
        const userIds = new Set<string>();
        for (const t of rows) {
          if (t.requesterUserId) userIds.add(t.requesterUserId);
          if (t.assigneeUserId) userIds.add(t.assigneeUserId);
        }
        const names = new Map<string, string>();
        await Promise.all(
          Array.from(userIds).map(async (id) => {
            names.set(id, await displayName(storage, id));
          })
        );
        const data: TicketRow[] = rows.map((t) => {
          const portalLabel = t.requesterPortalEmail
            ? `Portal: ${t.requesterPortalEmail}`
            : t.source === "portal"
              ? "Portal user"
              : undefined;
          return {
            ...t,
            requesterName: t.requesterUserId
              ? names.get(t.requesterUserId)
              : portalLabel,
            assigneeName: t.assigneeUserId ? names.get(t.assigneeUserId) ?? null : null,
          };
        });
        return { ok: true, data };
      } catch (err) {
        console.error("tickets list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to list tickets",
        };
      }
    },

    async listActiveInCategory(
      tenantId: string,
      categoryId: string
    ): Promise<
      TicketResult<Array<{ id: string; ticketNumber: string; title: string; status: string; categoryName: string }>>
    > {
      try {
        if (!categoryId?.trim()) {
          return { ok: false, error: "categoryId is required", code: "INVALID" };
        }
        const rows = await storage.listActiveTicketsByCategory(tenantId, categoryId.trim(), 10);
        return {
          ok: true,
          data: rows.map((t) => ({
            id: t.id,
            ticketNumber: t.ticketNumber,
            title: t.title,
            status: t.status,
            categoryName: t.categoryName,
          })),
        };
      } catch (err) {
        console.error("tickets listActiveInCategory:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to check active tickets",
        };
      }
    },

    async create(
      tenantId: string,
      userId: string,
      body: {
        categoryId: string;
        title: string;
        descriptionHtml: string;
        priority?: "low" | "normal" | "high" | "urgent";
        locationId?: string | null;
        relatedIncidentId?: string | null;
        assetId?: string | null;
      }
    ): Promise<TicketResult<Ticket>> {
      try {
        const descriptionHtml = sanitizeTicketHtml(body.descriptionHtml);
        const ticket = await storage.createTicket(tenantId, userId, {
          categoryId: body.categoryId,
          title: body.title.trim(),
          descriptionHtml,
          priority: body.priority,
          locationId: body.locationId,
          relatedIncidentId: body.relatedIncidentId,
          assetId: body.assetId,
        });
        return { ok: true, data: ticket };
      } catch (err) {
        console.error("tickets create:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to create ticket",
        };
      }
    },

    async getDetail(
      id: string,
      tenantId: string,
      userId: string,
      role: string | undefined
    ): Promise<TicketResult<TicketDetailPayload> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" }> {
      try {
        const ticket = await storage.getTicketById(id, tenantId);
        if (!ticket) return { ok: false, error: "Ticket not found", code: "NOT_FOUND" };
        if (!canViewTicket(ticket, userId, role)) {
          return { ok: false, error: "Not allowed to view this ticket", code: "FORBIDDEN" };
        }
        const internalOk = canSeeInternalOnTicket(ticket, userId, role);
        const [commentsRaw, attachmentsRaw, activityRaw, category] = await Promise.all([
          storage.listTicketComments(id, tenantId),
          storage.listTicketAttachments(id, tenantId),
          storage.listTicketActivity(id, tenantId),
          storage.getTicketCategoryById(ticket.categoryId, tenantId),
        ]);
        const comments = internalOk ? commentsRaw : commentsRaw.filter((c) => !c.isInternal);
        const userIds = new Set<string>();
        if (ticket.requesterUserId) userIds.add(ticket.requesterUserId);
        if (ticket.assigneeUserId) userIds.add(ticket.assigneeUserId);
        for (const c of comments) {
          if (c.authorUserId) userIds.add(c.authorUserId);
        }
        for (const a of attachmentsRaw) {
          if (a.uploadedByUserId) userIds.add(a.uploadedByUserId);
        }
        for (const a of activityRaw) {
          if (a.actorUserId) userIds.add(a.actorUserId);
        }
        const names = new Map<string, string>();
        await Promise.all(
          Array.from(userIds).map(async (uid) => {
            names.set(uid, await displayName(storage, uid));
          })
        );

        let portalRequesterEmail: string | null = null;
        if (ticket.requesterPortalUserId) {
          portalRequesterEmail =
            (await storage.getPortalUserEmail(ticket.requesterPortalUserId, tenantId)) ?? null;
        }

        const ticketRow: TicketRow = {
          ...ticket,
          categoryName: category?.name ?? "",
          requesterName: ticket.requesterUserId
            ? names.get(ticket.requesterUserId)
            : portalRequesterEmail
              ? `Portal: ${portalRequesterEmail}`
              : "Portal user",
          assigneeName: ticket.assigneeUserId ? names.get(ticket.assigneeUserId) ?? null : null,
          requesterPortalEmail: portalRequesterEmail,
        };

        const commentsRows: TicketCommentRow[] = [];
        for (const c of comments) {
          let authorName: string | undefined;
          if (c.authorUserId) {
            authorName = names.get(c.authorUserId);
          } else if (c.authorPortalUserId) {
            const email = await storage.getPortalUserEmail(c.authorPortalUserId, tenantId);
            authorName = email ? `Portal: ${email}` : "Portal user";
          }
          commentsRows.push({ ...c, authorName });
        }

        const attachmentRows: TicketAttachmentRow[] = [];
        for (const a of attachmentsRaw) {
          let uploadedByName: string | undefined;
          if (a.uploadedByUserId) {
            uploadedByName = names.get(a.uploadedByUserId);
          } else if (a.uploadedByPortalUserId) {
            const email = await storage.getPortalUserEmail(a.uploadedByPortalUserId, tenantId);
            uploadedByName = email ? `Portal: ${email}` : "Portal user";
          }
          attachmentRows.push({ ...a, uploadedByName });
        }

        const activityRows: TicketActivityRow[] = [];
        for (const a of activityRaw) {
          let actorName: string | undefined;
          if (a.actorUserId) {
            actorName = names.get(a.actorUserId);
          } else if (a.actorPortalUserId) {
            const email = await storage.getPortalUserEmail(a.actorPortalUserId, tenantId);
            actorName = email ? `Portal: ${email}` : "Portal user";
          }
          activityRows.push({ ...a, actorName });
        }

        return {
          ok: true,
          data: {
            ticket: ticketRow,
            comments: commentsRows,
            attachments: attachmentRows,
            activity: activityRows,
          },
        };
      } catch (err) {
        console.error("tickets getDetail:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to load ticket",
        };
      }
    },

    async patch(
      id: string,
      tenantId: string,
      userId: string,
      role: string | undefined,
      body: Partial<{
        title: string;
        descriptionHtml: string;
        categoryId: string;
        priority: "low" | "normal" | "high" | "urgent";
        status: "open" | "triaged" | "in_progress" | "resolved" | "closed" | "cancelled";
        assigneeUserId: string | null;
        locationId: string | null;
        relatedIncidentId: string | null;
        assetTag: string | null;
        assetId: string | null;
      }>
    ): Promise<TicketResult<Ticket> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" | "INVALID" }> {
      try {
        const existing = await storage.getTicketById(id, tenantId);
        if (!existing) return { ok: false, error: "Ticket not found", code: "NOT_FOUND" };
        if (!canViewTicket(existing, userId, role)) {
          return { ok: false, error: "Not allowed to update this ticket", code: "FORBIDDEN" };
        }

        const CONTENT_KEYS = new Set([
          "title",
          "descriptionHtml",
          "locationId",
          "relatedIncidentId",
          "assetTag",
          "assetId",
        ]);
        const TRIAGE_KEYS = new Set([
          "status",
          "priority",
          "categoryId",
          "assigneeUserId",
        ]);

        const keys = (Object.keys(body) as (keyof typeof body)[]).filter(
          (k) => body[k] !== undefined
        );
        if (keys.length === 0) {
          return { ok: false, error: "No fields to update", code: "INVALID" };
        }

        const admin = isTicketAdminRole(role);
        const isAssignee = existing.assigneeUserId === userId;
        const isRequester = !!existing.requesterUserId && existing.requesterUserId === userId;
        const terminal = existing.status === "closed" || existing.status === "cancelled";

        const allContent = keys.every((k) => CONTENT_KEYS.has(k as string));
        const allTriage = keys.every((k) => TRIAGE_KEYS.has(k as string));
        if (!allContent && !allTriage) {
          return {
            ok: false,
            error: "Cannot mix ticket details with triage fields in one request",
            code: "INVALID",
          };
        }

        if (allContent) {
          if (!isRequester) {
            return {
              ok: false,
              error: "Only the requester can edit ticket details",
              code: "FORBIDDEN",
            };
          }
          if (terminal) {
            return {
              ok: false,
              error: "Closed or cancelled tickets cannot be edited",
              code: "INVALID",
            };
          }
        } else {
          if (admin) {
            // full triage (status, priority, category, assignee)
          } else if (keys.length === 1 && body.status === "cancelled") {
            if (!isRequester) {
              return { ok: false, error: "Only the requester can cancel this ticket", code: "FORBIDDEN" };
            }
            if (existing.status !== "open") {
              return {
                ok: false,
                error: "Only open tickets can be cancelled by the requester",
                code: "INVALID",
              };
            }
          } else if (isAssignee) {
            const onlyStatusPriority = keys.every((k) => k === "status" || k === "priority");
            if (!onlyStatusPriority) {
              return {
                ok: false,
                error: "Assignee may only update status and priority",
                code: "FORBIDDEN",
              };
            }
            if (body.status !== undefined) {
              if (terminal) {
                return { ok: false, error: "Ticket is closed; only an admin can reopen", code: "INVALID" };
              }
              if (["resolved", "closed", "cancelled"].includes(existing.status)) {
                return {
                  ok: false,
                  error: "Only an admin can change status after resolution or closure",
                  code: "INVALID",
                };
              }
              const assigneeAllowedTargets = new Set(["in_progress", "resolved"]);
              if (!assigneeAllowedTargets.has(body.status)) {
                return {
                  ok: false,
                  error: "Assignee may only set status to in progress or resolved",
                  code: "INVALID",
                };
              }
            }
          } else {
            return { ok: false, error: "Not allowed to update this ticket", code: "FORBIDDEN" };
          }
        }

        const patch: typeof body = { ...body };
        if (patch.descriptionHtml !== undefined) {
          patch.descriptionHtml = sanitizeTicketHtml(patch.descriptionHtml);
        }

        const updated = await storage.patchTicket(tenantId, id, userId, patch);
        if (!updated) return { ok: false, error: "Ticket not found", code: "NOT_FOUND" };
        return { ok: true, data: updated };
      } catch (err) {
        console.error("tickets patch:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to update ticket",
        };
      }
    },

    async addComment(
      id: string,
      tenantId: string,
      userId: string,
      role: string | undefined,
      body: { bodyHtml: string; isInternal?: boolean }
    ): Promise<TicketResult<TicketComment> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" }> {
      try {
        const ticket = await storage.getTicketById(id, tenantId);
        if (!ticket) return { ok: false, error: "Ticket not found", code: "NOT_FOUND" };
        if (!canViewTicket(ticket, userId, role)) {
          return { ok: false, error: "Not allowed to comment on this ticket", code: "FORBIDDEN" };
        }
        const isInternal = Boolean(body.isInternal);
        if (isInternal && !canSeeInternalOnTicket(ticket, userId, role)) {
          return { ok: false, error: "Only assignees and admins can post internal comments", code: "FORBIDDEN" };
        }
        const bodyHtml = sanitizeTicketHtml(body.bodyHtml);
        if (!bodyHtml.trim()) {
          return { ok: false, error: "Comment cannot be empty", code: "FORBIDDEN" };
        }
        const row = await storage.addTicketComment(id, tenantId, userId, { bodyHtml, isInternal });
        return { ok: true, data: row };
      } catch (err) {
        console.error("tickets addComment:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to add comment",
        };
      }
    },

    async removeTicket(
      id: string,
      tenantId: string,
      role: string | undefined
    ): Promise<TicketResult<{ message: string }> | { ok: false; error: string; code: "NOT_FOUND" | "FORBIDDEN" }> {
      if (!isTicketAdminRole(role)) {
        return { ok: false, error: "Only administrators can delete tickets", code: "FORBIDDEN" };
      }
      try {
        const ok = await storage.deleteTicket(id, tenantId);
        if (!ok) return { ok: false, error: "Ticket not found", code: "NOT_FOUND" };
        return { ok: true, data: { message: "Ticket deleted" } };
      } catch (err) {
        console.error("tickets removeTicket:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to delete ticket",
        };
      }
    },
  };
}
