import { logInfo } from "../../logger";
import * as repo from "./messaging.repository";

type AuditActor =
  | { actorType: "staff"; actorStaffUserId: string }
  | { actorType: "portal"; actorPortalUserId: string }
  | { actorType: "system" };

export async function auditMessagingAction(
  params: {
    tenantId: string;
    action: string;
    conversationId?: string | null;
    messageId?: string | null;
    metadata?: Record<string, unknown>;
  } & AuditActor,
): Promise<void> {
  await repo.insertAuditEntry({
    tenantId: params.tenantId,
    actorType: params.actorType,
    actorStaffUserId: params.actorType === "staff" ? params.actorStaffUserId : null,
    actorPortalUserId: params.actorType === "portal" ? params.actorPortalUserId : null,
    action: params.action,
    conversationId: params.conversationId ?? null,
    messageId: params.messageId ?? null,
    metadata: params.metadata ?? {},
  });

  logInfo(`[messaging] ${params.action}`, {
    tenantId: params.tenantId,
    conversationId: params.conversationId ?? undefined,
    messageId: params.messageId ?? undefined,
    actorType: params.actorType,
  });
}
