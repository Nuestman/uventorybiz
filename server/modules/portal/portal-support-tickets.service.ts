import type { IStorage } from "../../storage";
import type { Ticket, TicketAttachment, TicketCategory, TicketComment } from "@shared/schema";
import { plainTextToTicketHtml, sanitizeTicketHtml } from "../../shared/ticketHtmlSanitize";
import { createAndSendNotifications } from "../../notificationService";
import { logError } from "../../logger";

export type PortalSupportResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export type PortalSupportTicketRow = Ticket & { categoryName: string };

export type PortalSupportTicketDetail = {
  ticket: PortalSupportTicketRow;
  comments: Array<TicketComment & { authorLabel: string }>;
  attachments: TicketAttachment[];
};

function escapePlain(text: string): string {
  return plainTextToTicketHtml(text);
}

export async function listPortalSupportCategories(
  storage: IStorage,
  tenantId: string
): Promise<PortalSupportResult<TicketCategory[]>> {
  try {
    const data = await storage.listTicketCategories(tenantId);
    return { ok: true, data };
  } catch (err) {
    console.error("portal support categories:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load categories",
    };
  }
}

export async function listPortalSupportTickets(
  storage: IStorage,
  tenantId: string,
  portalUserId: string,
  filters?: { status?: string }
): Promise<PortalSupportResult<PortalSupportTicketRow[]>> {
  try {
    const data = await storage.listPortalSupportTickets(tenantId, portalUserId, {
      status: filters?.status,
    });
    return { ok: true, data };
  } catch (err) {
    console.error("portal support list:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to list support tickets",
    };
  }
}

export async function createPortalSupportTicket(
  storage: IStorage,
  params: {
    tenantId: string;
    portalUserId: string;
    portalEmail: string;
    title: string;
    description: string;
    priority?: "low" | "normal" | "high";
    categoryId: string;
    otherCategoryDetail?: string;
  }
): Promise<PortalSupportResult<Ticket>> {
  try {
    const title = params.title.trim();
    if (title.length < 3) {
      return { ok: false, error: "Title must be at least 3 characters", code: "INVALID" };
    }
    if (title.length > 200) {
      return { ok: false, error: "Title is too long", code: "INVALID" };
    }
    const description = params.description.trim();
    if (description.length < 10) {
      return {
        ok: false,
        error: "Please describe the issue (at least 10 characters)",
        code: "INVALID",
      };
    }
    const priority = params.priority ?? "normal";
    if (!["low", "normal", "high"].includes(priority)) {
      return { ok: false, error: "Invalid priority", code: "INVALID" };
    }
    if (!params.categoryId?.trim()) {
      return { ok: false, error: "Category is required", code: "INVALID" };
    }

    const category = await storage.getTicketCategoryById(params.categoryId, params.tenantId);
    if (!category?.isActive) {
      return { ok: false, error: "Invalid or inactive category", code: "INVALID" };
    }

    let descriptionText = description;
    if (category.slug === "other") {
      const otherDetail = params.otherCategoryDetail?.trim();
      if (!otherDetail) {
        return {
          ok: false,
          error: "Please describe the category when selecting Other",
          code: "INVALID",
        };
      }
      descriptionText = `Category detail: ${otherDetail}\n\n${description}`;
    }

    const ticket = await storage.createPortalSupportTicket(params.tenantId, params.portalUserId, {
      title,
      descriptionHtml: escapePlain(descriptionText),
      priority,
      categoryId: category.id,
    });

    void createAndSendNotifications(storage, {
      tenantId: params.tenantId,
      notificationTypeKey: "portal_system_issue",
      title: `Portal system issue: ${ticket.ticketNumber}`,
      message: `${params.portalEmail} reported: "${title}" (${category.name}). Review it under Staff Tickets.`,
      metadata: {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        portalUserId: params.portalUserId,
        categoryId: category.id,
      },
    }).catch((err) => logError("portal system issue staff notification failed", err));

    return { ok: true, data: ticket };
  } catch (err) {
    console.error("portal support create:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to create support ticket",
    };
  }
}

export async function getPortalSupportTicketDetail(
  storage: IStorage,
  tenantId: string,
  portalUserId: string,
  ticketId: string
): Promise<PortalSupportResult<PortalSupportTicketDetail>> {
  try {
    const ticket = await storage.getTicketById(ticketId, tenantId);
    if (
      !ticket ||
      ticket.source !== "portal" ||
      ticket.requesterPortalUserId !== portalUserId
    ) {
      return { ok: false, error: "Ticket not found", code: "NOT_FOUND" };
    }
    const category = await storage.getTicketCategoryById(ticket.categoryId, tenantId);
    const [commentsRaw, attachments] = await Promise.all([
      storage.listTicketComments(ticketId, tenantId),
      storage.listTicketAttachments(ticketId, tenantId),
    ]);
    const publicComments = commentsRaw.filter((c) => !c.isInternal);

    const comments: PortalSupportTicketDetail["comments"] = [];
    for (const c of publicComments) {
      let authorLabel = "Staff";
      if (c.authorPortalUserId) {
        const email = await storage.getPortalUserEmail(c.authorPortalUserId, tenantId);
        authorLabel = c.authorPortalUserId === portalUserId ? "You" : email ?? "You";
      } else if (c.authorUserId) {
        const u = await storage.getUserById(c.authorUserId);
        const n = u ? `${u.firstName ?? ""} ${u.lastName ?? ""}`.trim() : "";
        authorLabel = n || u?.email || "Staff";
      }
      comments.push({ ...c, authorLabel });
    }

    return {
      ok: true,
      data: {
        ticket: { ...ticket, categoryName: category?.name ?? "Support" },
        comments,
        attachments,
      },
    };
  } catch (err) {
    console.error("portal support detail:", err);
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Failed to load support ticket",
    };
  }
}

export async function addPortalSupportComment(
  storage: IStorage,
  params: {
    tenantId: string;
    portalUserId: string;
    ticketId: string;
    body: string;
  }
): Promise<PortalSupportResult<TicketComment>> {
  try {
    const body = params.body.trim();
    if (body.length < 1) {
      return { ok: false, error: "Comment cannot be empty", code: "INVALID" };
    }
    const bodyHtml = sanitizeTicketHtml(escapePlain(body));
    if (!bodyHtml.trim()) {
      return { ok: false, error: "Comment cannot be empty", code: "INVALID" };
    }
    const row = await storage.addPortalTicketComment(
      params.ticketId,
      params.tenantId,
      params.portalUserId,
      { bodyHtml }
    );
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add comment";
    const code =
      message.includes("Not allowed") || message.includes("not found")
        ? "FORBIDDEN"
        : message.includes("Closed")
          ? "INVALID"
          : undefined;
    console.error("portal support comment:", err);
    return { ok: false, error: message, code };
  }
}

export async function addPortalSupportAttachment(
  storage: IStorage,
  params: {
    tenantId: string;
    portalUserId: string;
    ticketId: string;
    fileUrl: string;
    originalName: string;
    mimeType?: string | null;
    sizeBytes?: number | null;
  }
): Promise<PortalSupportResult<TicketAttachment>> {
  try {
    const row = await storage.addPortalTicketAttachment(
      params.ticketId,
      params.tenantId,
      params.portalUserId,
      {
        fileUrl: params.fileUrl,
        originalName: params.originalName,
        mimeType: params.mimeType,
        sizeBytes: params.sizeBytes,
      }
    );
    return { ok: true, data: row };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to add attachment";
    const code =
      message.includes("Not allowed") || message.includes("not found")
        ? "FORBIDDEN"
        : message.includes("Closed")
          ? "INVALID"
          : undefined;
    console.error("portal support attachment:", err);
    return { ok: false, error: message, code };
  }
}
