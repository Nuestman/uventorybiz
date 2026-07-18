import type { IStorage } from "../../storage";
import type { Notification, NotificationType } from "@shared/schema";
import { createNotificationsService } from "./notifications.service";
import type {
  GetPreferencesResponse,
  NotificationPreferenceGroup,
  PreferenceUpdateItem,
} from "./notifications.types";

export type NotificationResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: string; code?: string };

export type { GetPreferencesResponse, NotificationPreferenceGroup, PreferenceUpdateItem };

/**
 * Notifications controller: thin layer that calls the service and wraps results.
 * No req/res; returns result objects for the routes to map to HTTP.
 */
export function createNotificationsController(storage: IStorage) {
  const service = createNotificationsService(storage);

  return {
    async list(
      userId: string,
      tenantId: string | undefined,
      filters: { channel?: string; status?: string; limit?: number; unreadOnly?: boolean }
    ): Promise<NotificationResult<Notification[]>> {
      try {
        const data = await service.list(userId, tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Notifications controller list:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch notifications",
        };
      }
    },

    async unreadCount(
      userId: string,
      tenantId: string | undefined,
      filters?: { channel?: string }
    ): Promise<NotificationResult<{ count: number }>> {
      try {
        const data = await service.unreadCount(userId, tenantId, filters);
        return { ok: true, data };
      } catch (err) {
        console.error("Notifications controller unreadCount:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch unread count",
        };
      }
    },

    async markRead(id: string, userId: string): Promise<NotificationResult<{ success: true }>> {
      try {
        await service.markRead(id, userId);
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Notifications controller markRead:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to mark notification as read",
        };
      }
    },

    async markAllRead(
      userId: string,
      tenantId: string | undefined,
      filters?: { channel?: string }
    ): Promise<NotificationResult<{ success: true }>> {
      try {
        await service.markAllRead(userId, tenantId, filters);
        return { ok: true, data: { success: true } };
      } catch (err) {
        console.error("Notifications controller markAllRead:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to mark notifications as read",
        };
      }
    },

    async getTypes(category?: string): Promise<NotificationResult<NotificationType[]>> {
      try {
        const data = await service.getTypes(category);
        return { ok: true, data };
      } catch (err) {
        console.error("Notifications controller getTypes:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch notification types",
        };
      }
    },

    async getPreferences(
      userId: string,
      tenantId: string
    ): Promise<NotificationResult<GetPreferencesResponse>> {
      try {
        const data = await service.getPreferences(userId, tenantId);
        return { ok: true, data };
      } catch (err) {
        console.error("Notifications controller getPreferences:", err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : "Failed to fetch notification preferences",
        };
      }
    },

    async updatePreferences(
      userId: string,
      tenantId: string,
      preferences: PreferenceUpdateItem[]
    ): Promise<NotificationResult<{ updatedCount: number }>> {
      try {
        const data = await service.updatePreferences(userId, tenantId, preferences);
        return { ok: true, data };
      } catch (err) {
        console.error("Notifications controller updatePreferences:", err);
        const message = err instanceof Error ? err.message : "Failed to update notification preferences";
        if (message === "Preferences must be an array") {
          return { ok: false, error: message };
        }
        return { ok: false, error: message };
      }
    },
  };
}

export type NotificationsController = ReturnType<typeof createNotificationsController>;
