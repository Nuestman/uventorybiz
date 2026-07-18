import { PitchDeckShell } from "./PitchDeckShell";
import { PITCH_SLIDES_AGA_OBUASI } from "./pitchDeckAgaObuasiData";

/** Personalized deck for AngloGold Ashanti — Obuasi Mine. */
export default function SuperAdminPitchDeckAgaObuasi() {
  return (
    <PitchDeckShell
      slides={PITCH_SLIDES_AGA_OBUASI}
      pageTitle="Pitch: AGA Obuasi mine"
      pageSubtitle="MineAid HMS · confidential stakeholder deck · ← → Space Home End · fullscreen"
    />
  );
}
