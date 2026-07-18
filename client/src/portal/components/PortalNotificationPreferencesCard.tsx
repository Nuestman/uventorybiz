import { Loader2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { usePortalSession } from "../usePortalSession";
import {
  isPreferenceKeyEnabled,
  PORTAL_NOTIFICATION_PREFERENCE_KEYS,
  PORTAL_NOTIFICATION_PREFERENCE_META,
  setPreferenceKeyEnabled,
  usePortalNotificationPreferences,
} from "../usePortalNotificationPreferences";
import type { PortalNotificationPreferenceKey } from "@shared/portalNotificationPreferences";

function visiblePreferenceKeys(features: {
  appointments?: boolean;
  visits?: boolean;
  messaging?: boolean;
  medications?: boolean;
}): PortalNotificationPreferenceKey[] {
  return PORTAL_NOTIFICATION_PREFERENCE_KEYS.filter((key) => {
    if (key === "appointment_reminders") return features.appointments !== false;
    if (key === "visit_summaries") return features.visits !== false;
    if (key === "secure_messages") return features.messaging !== false;
    if (key === "medication_updates") return features.medications !== false;
    return true;
  });
}

export function PortalNotificationPreferencesCard() {
  const { session } = usePortalSession();
  const { data, isLoading, save } = usePortalNotificationPreferences();

  if (!session) return null;

  const keys = visiblePreferenceKeys(session.features);
  if (keys.length === 0) return null;

  const preferences = data?.preferences ?? [];

  const handleToggle = (key: PortalNotificationPreferenceKey, checked: boolean) => {
    if (!data?.preferences) return;
    const next = setPreferenceKeyEnabled(data.preferences, key, checked);
    save.mutate(next);
  };

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg font-semibold normal-case tracking-normal text-gray-900">
          Notifications
        </CardTitle>
      </CardHeader>
      <CardContent className="divide-y divide-gray-100 px-0 pb-0">
        {isLoading ? (
          <div className="flex items-center justify-center py-8 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            Loading preferences…
          </div>
        ) : (
          keys.map((key) => {
            const meta = PORTAL_NOTIFICATION_PREFERENCE_META[key];
            const enabled = isPreferenceKeyEnabled(preferences, key);
            return (
              <div
                key={key}
                className="flex items-center justify-between gap-4 px-6 py-4 first:pt-0 last:pb-6"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{meta.label}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">{meta.description}</p>
                </div>
                <Switch
                  checked={enabled}
                  disabled={save.isPending}
                  onCheckedChange={(checked) => handleToggle(key, checked)}
                  className="portal-pref-switch shrink-0"
                  aria-label={`${meta.label} notifications`}
                />
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}
