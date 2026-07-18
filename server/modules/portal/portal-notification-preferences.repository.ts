import { and, eq } from "drizzle-orm";
import { db } from "../../config/db";
import { portalUserNotificationPreferences } from "@shared/schema";
import type {
  PortalNotificationChannel,
  PortalNotificationPreferenceKey,
  PortalNotificationPreferenceRow,
} from "@shared/portalNotificationPreferences";

export async function listPortalNotificationPreferenceRows(
  tenantId: string,
  portalUserId: string,
): Promise<PortalNotificationPreferenceRow[]> {
  const rows = await db
    .select({
      preferenceKey: portalUserNotificationPreferences.preferenceKey,
      channel: portalUserNotificationPreferences.channel,
      enabled: portalUserNotificationPreferences.enabled,
    })
    .from(portalUserNotificationPreferences)
    .where(
      and(
        eq(portalUserNotificationPreferences.tenantId, tenantId),
        eq(portalUserNotificationPreferences.portalUserId, portalUserId),
      ),
    );

  return rows.map((r: { preferenceKey: string; channel: string; enabled: boolean }) => ({
    key: r.preferenceKey as PortalNotificationPreferenceKey,
    channel: r.channel as PortalNotificationChannel,
    enabled: r.enabled,
  }));
}

export async function upsertPortalNotificationPreference(
  tenantId: string,
  portalUserId: string,
  key: PortalNotificationPreferenceKey,
  channel: PortalNotificationChannel,
  enabled: boolean,
): Promise<void> {
  const now = new Date();
  await db
    .insert(portalUserNotificationPreferences)
    .values({
      tenantId,
      portalUserId,
      preferenceKey: key,
      channel,
      enabled,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [
        portalUserNotificationPreferences.portalUserId,
        portalUserNotificationPreferences.preferenceKey,
        portalUserNotificationPreferences.channel,
      ],
      set: { enabled, updatedAt: now },
    });
}
