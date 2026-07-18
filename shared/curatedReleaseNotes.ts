import { compareSemver, isSemverGreaterThan, isSemverLessOrEqual } from "./semver";

export type ReleaseNoteAudience = "staff" | "portal";

export type CuratedReleaseNote = {
  version: string;
  date: string;
  title: string;
  highlights: string[];
};

/** Curated in-app “What’s New” copy — one entry per shipped release, per audience. */
export const CURATED_RELEASE_NOTES: Record<ReleaseNoteAudience, CuratedReleaseNote[]> = {
  staff: [
    {
      version: "1.0.0",
      date: "2026-07-18",
      title: "Welcome to uventorybiz",
      highlights: [
        "Inventory and POS for multi-location businesses — sell, transfer, and reorder stock in one place.",
        "Product catalog (master items) separate from per-store stock; purchase orders receive or reverse into a chosen store.",
        "Customer and supplier portal with orders and invoices.",
        "Operations tools: appointments, incidents, duties, tickets, ShiftOver, and fleet.",
        "Point-of-care instant tests and employee wellbeing when those features are enabled for your business.",
      ],
    },
  ],
  portal: [
    {
      version: "1.0.0",
      date: "2026-07-18",
      title: "Welcome to the business portal",
      highlights: [
        "Place and track orders, confirm receipt, and message the store from your portal account.",
        "Suppliers can submit invoices linked to purchase orders when enabled.",
        "Manage your profile and notification preferences under Profile.",
      ],
    },
  ],
};

export function getPendingCuratedReleaseNotes(
  audience: ReleaseNoteAudience,
  currentVersion: string,
  lastAcknowledgedVersion: string | null | undefined,
): CuratedReleaseNote[] {
  const baseline = lastAcknowledgedVersion?.trim() || "0.0.0";
  return CURATED_RELEASE_NOTES[audience]
    .filter(
      (note) =>
        isSemverGreaterThan(note.version, baseline) &&
        isSemverLessOrEqual(note.version, currentVersion),
    )
    .sort((a, b) => compareSemver(b.version, a.version));
}
