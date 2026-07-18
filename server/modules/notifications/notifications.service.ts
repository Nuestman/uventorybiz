import type { IStorage } from "../../storage";
import type { Notification, NotificationType } from "@shared/schema";
import type { GetPreferencesResponse, PreferenceUpdateItem } from "./notifications.types";

const PREFERENCE_CHANNELS = ["email", "in_app", "sms", "whatsapp"] as const;

/**
 * Notifications service: business logic for listing, grouping preferences, and updating.
 * No HTTP; calls storage only. Throws on errors (controller wraps in result).
 */
export function createNotificationsService(storage: IStorage) {
  return {
    async list(
      userId: string,
      tenantId: string | undefined,
      filters: { channel?: string; status?: string; limit?: number; unreadOnly?: boolean }
    ): Promise<Notification[]> {
      const notifications = await storage.getNotifications(userId, tenantId);
      let filtered = notifications;
      if (filters.channel) filtered = filtered.filter((n) => n.channel === filters.channel);
      if (filters.status) filtered = filtered.filter((n) => n.status === filters.status);
      if (filters.unreadOnly) {
        filtered = filtered.filter((n) => !n.readAt && n.status !== "read");
      }
      const cap =
        typeof filters.limit === "number" && filters.limit > 0
          ? Math.min(filters.limit, 500)
          : undefined;
      if (cap !== undefined) filtered = filtered.slice(0, cap);
      return filtered;
    },

    async unreadCount(
      userId: string,
      tenantId: string | undefined,
      filters?: { channel?: string }
    ): Promise<{ count: number }> {
      let list = await storage.getNotifications(userId, tenantId);
      if (filters?.channel) list = list.filter((n) => n.channel === filters.channel);
      const count = list.filter((n) => !n.readAt && n.status !== "read").length;
      return { count };
    },

    async markRead(id: string, userId: string): Promise<void> {
      await storage.markNotificationRead(id, userId);
    },

    async markAllRead(
      userId: string,
      tenantId: string | undefined,
      filters?: { channel?: string }
    ): Promise<void> {
      await storage.markAllNotificationsRead(userId, tenantId, filters);
    },

    async getTypes(category?: string): Promise<NotificationType[]> {
      return storage.getNotificationTypes(category);
    },

    async getPreferences(userId: string, tenantId: string): Promise<GetPreferencesResponse> {
      const [preferences, types] = await Promise.all([
        storage.getNotificationPreferences(userId, tenantId),
        storage.getNotificationTypes(),
      ]);
      const grouped = types.map((type) => {
        const typePrefs = preferences.filter((p) => p.notificationTypeId === type.id);
        const channels = PREFERENCE_CHANNELS.map((channel) => {
          const pref = typePrefs.find((p) => p.channel === channel);
          return {
            channel,
            enabled: pref?.enabled ?? false,
            minSeverity: pref?.minSeverity ?? null,
            adminManaged: pref?.adminManaged ?? false,
          };
        });
        return {
          notificationType: {
            id: type.id,
            key: type.key,
            displayName: type.displayName,
            category: type.category,
            severitySupported: type.severitySupported ?? false,
          },
          channels,
        };
      });
      return { userId, tenantId, preferences: grouped };
    },

    async updatePreferences(
      userId: string,
      tenantId: string,
      preferences: PreferenceUpdateItem[]
    ): Promise<{ updatedCount: number }> {
      if (!Array.isArray(preferences)) {
        throw new Error("Preferences must be an array");
      }
      const existingPrefs = await storage.getNotificationPreferences(userId, tenantId);
      const validPrefs = preferences
        .filter((pref) => {
          const existing = existingPrefs.find(
            (p) => p.notificationTypeId === pref.notificationTypeId && p.channel === pref.channel
          );
          return !existing || !existing.adminManaged;
        })
        .map((pref) => ({
          notificationTypeId: pref.notificationTypeId,
          channel: pref.channel,
          enabled: pref.enabled ?? true,
          minSeverity: pref.minSeverity ?? null,
        }));
      await storage.updateNotificationPreferences(userId, tenantId, validPrefs);
      return { updatedCount: validPrefs.length };
    },
  };
}

export type NotificationsService = ReturnType<typeof createNotificationsService>;
