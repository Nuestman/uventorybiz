import { eq } from "drizzle-orm";
import { db } from "../../config/db";
import { platformFeatureFlags } from "@shared/schema";

/**
 * Registry of platform feature flags. Adding a new toggleable feature only
 * requires a new entry here — rows are upserted on first toggle and missing
 * rows fall back to defaultEnabled.
 */
export const PLATFORM_FEATURES = {
  appointments: {
    key: "appointments",
    displayName: "Appointments",
    description:
      "Operations appointment scheduling — staff appointments page, portal appointment requests, and related APIs.",
    defaultEnabled: true,
  },
  poc_testing: {
    key: "poc_testing",
    displayName: "POC Laboratory",
    description:
      "Point-of-care instant testing (HB, pregnancy, malaria, typhoid) for pharmacies and laboratories. Individual businesses also opt in via Settings (pharmacy/lab categories only).",
    defaultEnabled: true,
  },
  fleet: {
    key: "fleet",
    displayName: "Business Assets",
    description:
      "Business assets register — equipment, vehicles/fleet, IT and tools with auto tags; linked vehicle stock locations.",
    defaultEnabled: true,
  },
  wellbeing: {
    key: "wellbeing",
    displayName: "Employee Wellbeing",
    description: "Employee wellbeing hub — follow-ups, work fitness, EAP, and feedback.",
    defaultEnabled: true,
  },
  incidents: {
    key: "incidents",
    displayName: "Incident Management",
    description: "Workplace and business incident reporting and investigation.",
    defaultEnabled: true,
  },
  shiftover: {
    key: "shiftover",
    displayName: "ShiftOver",
    description: "Shift handover, end-of-shift reports, and open items continuity.",
    defaultEnabled: true,
  },
  tickets: {
    key: "tickets",
    displayName: "Staff Tickets",
    description:
      "Site issues, repairs, staff request tickets, and portal system-issue reports from customers/suppliers.",
    defaultEnabled: true,
  },
  messaging: {
    key: "messaging",
    displayName: "Secure Messaging",
    description:
      "Staff and portal secure messaging — inbox, threads, SSE realtime stream, and unread badges. Off by default to avoid idle stream/poll load.",
    defaultEnabled: false,
  },
  portal: {
    key: "portal",
    displayName: "Customer & Supplier Portal",
    description: "External customer/supplier portal — ordering, POs, invoicing, and portal accounts.",
    defaultEnabled: true,
  },
} as const;

export type PlatformFeatureKey = keyof typeof PLATFORM_FEATURES;

export interface FeatureFlagView {
  key: string;
  displayName: string;
  description: string;
  enabled: boolean;
  updatedAt: string | null;
}

// Flags are read on hot request paths (gating middleware), so cache briefly.
let cache: { flags: Record<string, boolean>; loadedAt: number } | null = null;
const CACHE_TTL_MS = 30_000;

async function loadFlagsFromDb(): Promise<Record<string, boolean>> {
  const flags: Record<string, boolean> = {};
  for (const def of Object.values(PLATFORM_FEATURES)) {
    flags[def.key] = def.defaultEnabled;
  }
  const rows = await db.select().from(platformFeatureFlags);
  for (const row of rows) {
    if (row.flagKey in flags) flags[row.flagKey] = row.enabled;
  }
  return flags;
}

/** Enabled/disabled map for every registered feature. Cached for 30s. */
export async function getFeatureFlags(): Promise<Record<string, boolean>> {
  if (cache && Date.now() - cache.loadedAt < CACHE_TTL_MS) return cache.flags;
  try {
    const flags = await loadFlagsFromDb();
    cache = { flags, loadedAt: Date.now() };
    return flags;
  } catch (err) {
    // Fail open to code defaults so a transient DB issue never bricks the API surface.
    // Cache defaults briefly so a cold/unreachable Neon does not stampede reconnect timeouts.
    console.error("Feature flags: failed to load from DB, using defaults:", err);
    const defaults: Record<string, boolean> = {};
    for (const def of Object.values(PLATFORM_FEATURES)) defaults[def.key] = def.defaultEnabled;
    cache = { flags: defaults, loadedAt: Date.now() };
    return defaults;
  }
}

export async function isFeatureEnabled(key: PlatformFeatureKey): Promise<boolean> {
  const flags = await getFeatureFlags();
  return flags[key] ?? PLATFORM_FEATURES[key].defaultEnabled;
}

/** Detailed list (registry metadata + persisted state) for the super-admin console. */
export async function listFeatureFlags(): Promise<FeatureFlagView[]> {
  const rows = await db.select().from(platformFeatureFlags);
  const byKey = new Map(rows.map((r) => [r.flagKey, r]));
  return Object.values(PLATFORM_FEATURES).map((def) => {
    const row = byKey.get(def.key);
    return {
      key: def.key,
      displayName: def.displayName,
      description: def.description,
      enabled: row?.enabled ?? def.defaultEnabled,
      updatedAt: row?.updatedAt ? row.updatedAt.toISOString() : null,
    };
  });
}

export async function setFeatureFlag(
  key: PlatformFeatureKey,
  enabled: boolean,
  updatedBy: string,
): Promise<FeatureFlagView> {
  const def = PLATFORM_FEATURES[key];
  const now = new Date();
  const [row] = await db
    .insert(platformFeatureFlags)
    .values({ flagKey: def.key, enabled, updatedBy, updatedAt: now })
    .onConflictDoUpdate({
      target: platformFeatureFlags.flagKey,
      set: { enabled, updatedBy, updatedAt: now },
    })
    .returning();
  cache = null;
  return {
    key: def.key,
    displayName: def.displayName,
    description: def.description,
    enabled: row.enabled,
    updatedAt: row.updatedAt ? row.updatedAt.toISOString() : null,
  };
}

export function isKnownFeatureKey(key: string): key is PlatformFeatureKey {
  return key in PLATFORM_FEATURES;
}
