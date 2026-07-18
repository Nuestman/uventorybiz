import type { PortalNotificationDto } from "@shared/messaging";
import { PORTAL_NOTIFICATION_TYPE_MESSAGE } from "@shared/messaging";
import * as repo from "./portal-notifications.repository";
import { isPortalNotificationEnabledForUser } from "./portal-notification-preferences.service";

function toDto(row: {
  id: string;
  notificationType: string;
  title: string;
  message: string;
  readAt: Date | null;
  createdAt: Date;
  metadataJson: unknown;
}): PortalNotificationDto {
  const meta = (row.metadataJson ?? {}) as { deepLink?: string };
  return {
    id: row.id,
    type: row.notificationType,
    title: row.title,
    message: row.message,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    deepLink: meta.deepLink ?? null,
  };
}

export async function notifyPortalUserInApp(params: {
  tenantId: string;
  portalUserId: string;
  conversationId: string;
  tenantAppName: string;
  notificationType?: "secure_messages" | "visit_summaries" | "medication_updates";
}): Promise<void> {
  const prefKey = params.notificationType ?? "secure_messages";
  const enabled = await isPortalNotificationEnabledForUser(
    params.tenantId,
    params.portalUserId,
    prefKey,
    "in_app",
  );
  if (!enabled) return;

  const deepLink = `/portal/messages/${params.conversationId}`;
  await repo.insertPortalNotification({
    tenantId: params.tenantId,
    portalUserId: params.portalUserId,
    notificationType: PORTAL_NOTIFICATION_TYPE_MESSAGE,
    title: "New secure message",
    message: `${params.tenantAppName} sent you a message. Sign in to read it in the portal.`,
    metadata: { conversationId: params.conversationId, deepLink },
  });
}

export async function listPortalNotificationsForUser(
  tenantId: string,
  portalUserId: string,
): Promise<PortalNotificationDto[]> {
  const rows = await repo.listPortalNotifications(tenantId, portalUserId);
  return rows.map(toDto);
}

export async function portalNotificationsUnreadCount(
  tenantId: string,
  portalUserId: string,
): Promise<number> {
  return repo.countUnreadPortalNotifications(tenantId, portalUserId);
}

export async function markPortalNotificationReadForUser(
  tenantId: string,
  portalUserId: string,
  notificationId: string,
): Promise<PortalNotificationDto | null> {
  const row = await repo.markPortalNotificationRead(tenantId, portalUserId, notificationId);
  return row ? toDto(row) : null;
}

export async function markAllPortalNotificationsReadForUser(
  tenantId: string,
  portalUserId: string,
): Promise<void> {
  await repo.markAllPortalNotificationsRead(tenantId, portalUserId);
}
