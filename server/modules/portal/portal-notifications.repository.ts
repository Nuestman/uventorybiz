import { and, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "../../config/db";
import { portalNotifications } from "@shared/schema";
import type { PortalNotification } from "@shared/schema";

export async function insertPortalNotification(params: {
  tenantId: string;
  portalUserId: string;
  notificationType: string;
  title: string;
  message: string;
  metadata?: Record<string, unknown>;
}): Promise<PortalNotification> {
  const [row] = await db
    .insert(portalNotifications)
    .values({
      tenantId: params.tenantId,
      portalUserId: params.portalUserId,
      notificationType: params.notificationType,
      title: params.title,
      message: params.message,
      metadataJson: params.metadata ?? {},
    })
    .returning();
  return row;
}

export async function listPortalNotifications(
  tenantId: string,
  portalUserId: string,
  limit = 50,
) {
  return db
    .select()
    .from(portalNotifications)
    .where(
      and(eq(portalNotifications.tenantId, tenantId), eq(portalNotifications.portalUserId, portalUserId)),
    )
    .orderBy(desc(portalNotifications.createdAt))
    .limit(limit);
}

export async function countUnreadPortalNotifications(
  tenantId: string,
  portalUserId: string,
): Promise<number> {
  const [row] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(portalNotifications)
    .where(
      and(
        eq(portalNotifications.tenantId, tenantId),
        eq(portalNotifications.portalUserId, portalUserId),
        isNull(portalNotifications.readAt),
      ),
    );
  return row?.count ?? 0;
}

export async function markPortalNotificationRead(
  tenantId: string,
  portalUserId: string,
  notificationId: string,
) {
  const [row] = await db
    .update(portalNotifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(portalNotifications.id, notificationId),
        eq(portalNotifications.tenantId, tenantId),
        eq(portalNotifications.portalUserId, portalUserId),
      ),
    )
    .returning();
  return row;
}

export async function markAllPortalNotificationsRead(tenantId: string, portalUserId: string) {
  await db
    .update(portalNotifications)
    .set({ readAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(portalNotifications.tenantId, tenantId),
        eq(portalNotifications.portalUserId, portalUserId),
        isNull(portalNotifications.readAt),
      ),
    );
}
