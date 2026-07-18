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
      version: "4.35.1",
      date: "2026-07-14",
      title: "Telecare expiry & database idle time",
      highlights: [
        "Telehealth session expiry now uses in-app timers, with an hourly database backup instead of a 5-minute poll.",
        "This lets the managed Postgres compute sleep when the clinic is idle (Neon Free scale-to-zero).",
      ],
    },
    {
      version: "4.35.0",
      date: "2026-07-06",
      title: "Patient-reported symptoms (OPQRST)",
      highlights: [
        "Review patient symptom logs on the patient record (read-only, last 30 days).",
        "Logs use OPQRST structure: onset, provocation/palliation, quality, region/radiation, severity, duration.",
        "Severe or high-risk portal symptoms can trigger symptom_alert notifications when enabled.",
        "Manage tenant symptom catalog under Settings → Symptom types.",
      ],
    },
    {
      version: "4.34.0",
      date: "2026-07-01",
      title: "Database migrations & portal marketing",
      highlights: [
        "Fresh databases use Drizzle-tracked schema migrations (see DRIZZLE_MIGRATIONS.md).",
        "Notification reference data seeds via npm run db:seed.",
        "Portal marketing page shows Go to dashboard when you are already signed in.",
      ],
    },
    {
      version: "4.33.0",
      date: "2026-06-20",
      title: "What's New announcements",
      highlights: [
        "Sign in to see a What's New summary when a release ships.",
        "Portal patients get a mobile menu for the full sidebar on phones.",
        "Portal page titles use larger display typography.",
      ],
    },
    {
      version: "4.32.0",
      date: "2026-06-20",
      title: "Portal polish, dashboard greeting & security",
      highlights: [
        "Shared date + time-of-day greeting on the staff dashboard.",
        "Patients can manage notification preferences in the portal (appointments, secure messages).",
        "Public marketing header simplified (Features nav, fewer duplicate links).",
        "Feedback tab is now a vertical strip fixed to the right edge of the screen.",
        "Dependency security updates (@vercel/blob, undici).",
      ],
    },
    {
      version: "4.31.1",
      date: "2026-06-19",
      title: "Portal access requests & messaging defaults",
      highlights: [
        "Review portal access requests under Settings → Patient portal.",
        "Approve or reject requests; suspend or reactivate portal accounts.",
        "Magic-link and access-request emails now return clearer feedback.",
        "Portal messaging is enabled by default for active portal tenants.",
      ],
    },
  ],
  portal: [
    {
      version: "4.35.0",
      date: "2026-07-06",
      title: "Symptoms tracker (OPQRST)",
      highlights: [
        "Log how you feel at Symptoms in the portal using the OPQRST format clinicians recognize.",
        "Select multiple symptoms at once; add a custom name when you choose Other.",
        "Works offline — entries sync when you reconnect.",
        "View trends per symptom and see a summary on your dashboard.",
      ],
    },
    {
      version: "4.34.0",
      date: "2026-07-01",
      title: "Portal landing improvements",
      highlights: [
        "When already signed in, the portal home page offers Go to dashboard instead of opening sign-in again.",
        "Marketing headings use the portal accent color for clearer branding.",
      ],
    },
    {
      version: "4.33.0",
      date: "2026-06-20",
      title: "Mobile menu & What's New",
      highlights: [
        "Tap the menu icon on mobile to open the full sidebar (Profile, all sections, Sign out).",
        "See What's New when we ship portal updates — tap Got it when you're done.",
        "Page titles are larger and easier to read.",
      ],
    },
    {
      version: "4.32.0",
      date: "2026-06-20",
      title: "Notification settings & home improvements",
      highlights: [
        "Choose which emails and in-app alerts you receive under Profile → Notification preferences.",
        "Refreshed home screen with quick-access cards and a care contact footer.",
        "Updated greeting on your dashboard when you sign in.",
        "Teal buttons and clearer navigation across the portal.",
      ],
    },
    {
      version: "4.31.1",
      date: "2026-06-19",
      title: "Easier access & messaging",
      highlights: [
        "Request portal access with your employee email if you do not have an account yet.",
        "Clearer sign-in messages when using a magic link.",
        "Messages in the portal sidebar when messaging is enabled for your site.",
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
