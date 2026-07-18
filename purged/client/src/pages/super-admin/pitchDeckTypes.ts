export type PitchSlideKind = "hero" | "statement" | "pillars" | "grid" | "split" | "closing";

export interface PitchSlide {
  id: string;
  kind: PitchSlideKind;
  /** Short label for progress UI */
  label: string;
  title: string;
  /** Hero / closing tagline, or intro line under grid titles */
  subtitle?: string;
  lines?: string[];
  blocks?: { title: string; body: string }[];
  footnote?: string;
}
