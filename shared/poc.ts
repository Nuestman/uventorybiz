/** Business categories eligible for the Point-of-Care Laboratory module. */
export const POC_ELIGIBLE_CATEGORIES = ["pharmacy", "laboratory"] as const;

export type PocEligibleCategory = (typeof POC_ELIGIBLE_CATEGORIES)[number];

export function isPocEligibleCategory(key: string | null | undefined): boolean {
  return (
    key === "pharmacy" ||
    key === "laboratory"
  );
}
