import { PitchDeckShell } from "./PitchDeckShell";
import { PITCH_SLIDES_UMA_OBUASI } from "./pitchDeckUmaObuasiData";

/** Personalized deck for UMA (Underground Mining Alliance) — Obuasi. */
export default function SuperAdminPitchDeckUmaObuasi() {
  return (
    <PitchDeckShell
      slides={PITCH_SLIDES_UMA_OBUASI}
      pageTitle="Pitch: UMA Obuasi"
      pageSubtitle="MineAid HMS · UMA / First Aider focus · confidential · ← → Space Home End · fullscreen"
    />
  );
}
