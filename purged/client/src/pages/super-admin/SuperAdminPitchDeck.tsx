import { PitchDeckShell } from "./PitchDeckShell";
import { PITCH_SLIDES } from "./pitchDeckData";

/** Version 1 — feature-centered narrative. */
export default function SuperAdminPitchDeck() {
  return (
    <PitchDeckShell
      slides={PITCH_SLIDES}
      pageTitle="Enterprise pitch deck"
      pageSubtitle="Version 1 · Feature-centered · ← → Space Home End · fullscreen recommended"
    />
  );
}
