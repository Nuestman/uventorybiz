/** POS tender methods (must match `pos_payment_method` PG enum). */
export const POS_PAYMENT_METHODS = [
  "cash",
  "card",
  "mobile_money",
  "credit",
  "other",
] as const;

export type PosPaymentMethod = (typeof POS_PAYMENT_METHODS)[number];

export const POS_PAYMENT_METHOD_LABELS: Record<PosPaymentMethod, string> = {
  cash: "Cash",
  card: "Card",
  mobile_money: "Mobile Money",
  credit: "Credit (Pay Later)",
  other: "Other",
};

export function formatPosPaymentMethod(method: string): string {
  if (method in POS_PAYMENT_METHOD_LABELS) {
    return POS_PAYMENT_METHOD_LABELS[method as PosPaymentMethod];
  }
  return method.replace(/_/g, " ");
}
