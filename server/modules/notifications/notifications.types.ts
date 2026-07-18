/**
 * Shared types for the notifications module (controller/service/API).
 */

/** Grouped preference row for GET /notification-preferences */
export interface NotificationPreferenceGroup {
  notificationType: {
    id: string;
    key: string;
    displayName: string;
    category: string | null;
    severitySupported: boolean;
  };
  channels: Array<{
    channel: string;
    enabled: boolean;
    minSeverity: string | null;
    adminManaged: boolean;
  }>;
}

export interface GetPreferencesResponse {
  userId: string;
  tenantId: string;
  preferences: NotificationPreferenceGroup[];
}

/** Input item for PUT /notification-preferences */
export interface PreferenceUpdateItem {
  notificationTypeId: string;
  channel: string;
  enabled?: boolean;
  minSeverity?: string | null;
}
