/** Portal notification preference keys (one row per key + channel in DB). */
export const PORTAL_NOTIFICATION_PREFERENCE_KEYS = [
  "order_updates",
  "appointment_reminders",
  "visit_summaries",
  "secure_messages",
  "medication_updates",
] as const;

export type PortalNotificationPreferenceKey = (typeof PORTAL_NOTIFICATION_PREFERENCE_KEYS)[number];

export const PORTAL_NOTIFICATION_CHANNELS = ["email", "in_app"] as const;

export type PortalNotificationChannel = (typeof PORTAL_NOTIFICATION_CHANNELS)[number];

export type PortalNotificationPreferenceRow = {
  key: PortalNotificationPreferenceKey;
  channel: PortalNotificationChannel;
  enabled: boolean;
};

export type PortalNotificationPreferencesPayload = {
  preferences: PortalNotificationPreferenceRow[];
};

export const PORTAL_NOTIFICATION_PREFERENCE_META: Record<
  PortalNotificationPreferenceKey,
  { label: string; description: string; channels: PortalNotificationChannel[] }
> = {
  order_updates: {
    label: "Order updates",
    description: "When your order is confirmed, ready, out for delivery, or completed",
    channels: ["email", "in_app"],
  },
  appointment_reminders: {
    label: "Appointment reminders",
    description: "24 hours and 1 hour before your visit",
    channels: ["email"],
  },
  visit_summaries: {
    label: "Visit summaries",
    description: "When a new visit summary is posted",
    channels: ["email", "in_app"],
  },
  secure_messages: {
    label: "Secure messages",
    description: "From your organization",
    channels: ["email", "in_app"],
  },
  medication_updates: {
    label: "Medication updates",
    description: "When staff review your medication declarations",
    channels: ["email", "in_app"],
  },
};

/** Default: all portal notifications enabled (opt-out model). */
export function defaultPortalNotificationPreferences(): PortalNotificationPreferenceRow[] {
  const rows: PortalNotificationPreferenceRow[] = [];
  for (const key of PORTAL_NOTIFICATION_PREFERENCE_KEYS) {
    for (const channel of PORTAL_NOTIFICATION_PREFERENCE_META[key].channels) {
      rows.push({ key, channel, enabled: true });
    }
  }
  return rows;
}

export function mergePortalNotificationPreferences(
  stored: PortalNotificationPreferenceRow[],
): PortalNotificationPreferenceRow[] {
  const map = new Map<string, boolean>();
  for (const row of stored) {
    map.set(`${row.key}:${row.channel}`, row.enabled);
  }
  return defaultPortalNotificationPreferences().map((def) => ({
    ...def,
    enabled: map.get(`${def.key}:${def.channel}`) ?? def.enabled,
  }));
}

export function isPortalPreferenceEnabled(
  prefs: PortalNotificationPreferenceRow[],
  key: PortalNotificationPreferenceKey,
  channel: PortalNotificationChannel,
): boolean {
  const row = prefs.find((p) => p.key === key && p.channel === channel);
  return row?.enabled ?? true;
}
