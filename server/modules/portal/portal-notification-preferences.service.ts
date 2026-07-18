import {
  defaultPortalNotificationPreferences,
  isPortalPreferenceEnabled,
  mergePortalNotificationPreferences,
  PORTAL_NOTIFICATION_PREFERENCE_META,
  type PortalNotificationChannel,
  type PortalNotificationPreferenceKey,
  type PortalNotificationPreferenceRow,
} from "@shared/portalNotificationPreferences";
import * as repo from "./portal-notification-preferences.repository";

export async function getPortalNotificationPreferencesForUser(
  tenantId: string,
  portalUserId: string,
): Promise<PortalNotificationPreferenceRow[]> {
  const stored = await repo.listPortalNotificationPreferenceRows(tenantId, portalUserId);
  return mergePortalNotificationPreferences(stored);
}

export async function updatePortalNotificationPreferencesForUser(
  tenantId: string,
  portalUserId: string,
  updates: PortalNotificationPreferenceRow[],
): Promise<PortalNotificationPreferenceRow[]> {
  for (const row of updates) {
    const meta = PORTAL_NOTIFICATION_PREFERENCE_META[row.key];
    if (!meta.channels.includes(row.channel)) continue;
    await repo.upsertPortalNotificationPreference(
      tenantId,
      portalUserId,
      row.key,
      row.channel,
      row.enabled,
    );
  }
  return getPortalNotificationPreferencesForUser(tenantId, portalUserId);
}

export async function isPortalNotificationEnabledForUser(
  tenantId: string,
  portalUserId: string,
  key: PortalNotificationPreferenceKey,
  channel: PortalNotificationChannel,
): Promise<boolean> {
  const prefs = await getPortalNotificationPreferencesForUser(tenantId, portalUserId);
  return isPortalPreferenceEnabled(prefs, key, channel);
}

export function getDefaultPortalNotificationPreferences(): PortalNotificationPreferenceRow[] {
  return defaultPortalNotificationPreferences();
}
