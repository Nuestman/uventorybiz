import {
  getPendingCuratedReleaseNotes,
  type CuratedReleaseNote,
  type ReleaseNoteAudience,
} from "@shared/curatedReleaseNotes";
import { getAppVersion } from "../../config/appVersion";

export type ReleaseNotesStatusPayload = {
  currentVersion: string;
  lastAcknowledgedVersion: string | null;
  pending: CuratedReleaseNote[];
};

export function buildReleaseNotesStatus(
  audience: ReleaseNoteAudience,
  lastAcknowledgedVersion: string | null | undefined,
): ReleaseNotesStatusPayload {
  const currentVersion = getAppVersion();
  return {
    currentVersion,
    lastAcknowledgedVersion: lastAcknowledgedVersion?.trim() || null,
    pending: getPendingCuratedReleaseNotes(audience, currentVersion, lastAcknowledgedVersion),
  };
}

export function getCurrentAppVersion(): string {
  return getAppVersion();
}
