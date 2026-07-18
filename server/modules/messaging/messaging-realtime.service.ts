import type { Response } from "express";
import type { MessagingStreamEvent } from "@shared/messaging";
import { MESSAGING_SSE_HEARTBEAT_MS } from "@shared/messaging";

type Audience = "staff" | "portal";

type Connection = {
  res: Response;
  heartbeat: ReturnType<typeof setInterval>;
};

function staffKey(tenantId: string, userId: string) {
  return `staff:${tenantId}:${userId}`;
}

function portalKey(tenantId: string, portalUserId: string) {
  return `portal:${tenantId}:${portalUserId}`;
}

const connections = new Map<string, Set<Connection>>();

function writeEvent(res: Response, event: MessagingStreamEvent) {
  res.write(`event: ${event.type}\n`);
  res.write(`data: ${JSON.stringify(event)}\n\n`);
}

function fanOut(keys: string[], event: MessagingStreamEvent) {
  for (const key of keys) {
    const set = connections.get(key);
    if (!set?.size) continue;
    for (const conn of set) {
      try {
        writeEvent(conn.res, event);
      } catch {
        /* connection may have closed */
      }
    }
  }
}

function attach(audience: Audience, tenantId: string, userId: string, res: Response): () => void {
  const key = audience === "staff" ? staffKey(tenantId, userId) : portalKey(tenantId, userId);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache, no-transform");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders?.();

  const heartbeat = setInterval(() => {
    try {
      res.write(`: heartbeat ${Date.now()}\n\n`);
    } catch {
      /* ignore */
    }
  }, MESSAGING_SSE_HEARTBEAT_MS);

  const conn: Connection = { res, heartbeat };
  let set = connections.get(key);
  if (!set) {
    set = new Set();
    connections.set(key, set);
  }
  set.add(conn);

  return () => {
    clearInterval(heartbeat);
    set!.delete(conn);
    if (set!.size === 0) connections.delete(key);
  };
}

export function subscribeStaffStream(tenantId: string, staffUserId: string, res: Response) {
  return attach("staff", tenantId, staffUserId, res);
}

export function subscribePortalStream(tenantId: string, portalUserId: string, res: Response) {
  return attach("portal", tenantId, portalUserId, res);
}

export function publishStaffInboxChanged(tenantId: string, staffUserIds: string[]) {
  const at = new Date().toISOString();
  const event: MessagingStreamEvent = { type: "inbox.changed", at };
  fanOut(staffUserIds.map((id) => staffKey(tenantId, id)), event);
}

export function publishStaffTenantInboxChanged(tenantId: string, staffUserIds: string[]) {
  publishStaffInboxChanged(tenantId, staffUserIds);
}

export function publishPortalInboxChanged(tenantId: string, portalUserId: string) {
  const at = new Date().toISOString();
  fanOut([portalKey(tenantId, portalUserId)], { type: "inbox.changed", at });
}

export function publishMessageNew(params: {
  tenantId: string;
  conversationId: string;
  messageId: string;
  staffUserIds: string[];
  portalUserId?: string | null;
}) {
  const at = new Date().toISOString();
  const event: MessagingStreamEvent = {
    type: "message.new",
    conversationId: params.conversationId,
    messageId: params.messageId,
    at,
  };
  fanOut(params.staffUserIds.map((id) => staffKey(params.tenantId, id)), event);
  if (params.portalUserId) {
    fanOut([portalKey(params.tenantId, params.portalUserId)], event);
  }
}

export function publishMessageRead(params: {
  tenantId: string;
  conversationId: string;
  staffUserIds: string[];
  portalUserId?: string | null;
}) {
  const at = new Date().toISOString();
  const event: MessagingStreamEvent = {
    type: "message.read",
    conversationId: params.conversationId,
    at,
  };
  fanOut(params.staffUserIds.map((id) => staffKey(params.tenantId, id)), event);
  if (params.portalUserId) {
    fanOut([portalKey(params.tenantId, params.portalUserId)], event);
  }
}

export function publishConversationUpdated(params: {
  tenantId: string;
  conversationId: string;
  staffUserIds: string[];
  portalUserId?: string | null;
}) {
  const at = new Date().toISOString();
  const event: MessagingStreamEvent = {
    type: "conversation.updated",
    conversationId: params.conversationId,
    at,
  };
  fanOut(params.staffUserIds.map((id) => staffKey(params.tenantId, id)), event);
  if (params.portalUserId) {
    fanOut([portalKey(params.tenantId, params.portalUserId)], event);
  }
}
