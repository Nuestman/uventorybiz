import { PitchDeckShell } from "./PitchDeckShell";
import { PITCH_SLIDES_WHY } from "./pitchDeckV2Data";

/** Version 2 — Start With Why (Golden Circle); WHAT mirrors the Features page. */
export default function SuperAdminPitchDeckWhy() {
  return (
    <PitchDeckShell
      slides={PITCH_SLIDES_WHY}
      pageTitle="Enterprise pitch deck"
      pageSubtitle="Version 2 · Start With Why · ← → Space Home End · fullscreen recommended"
    />
  );
}
