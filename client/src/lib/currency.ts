/**
 * Currency symbols for tenant-configured ISO 4217 codes.
 * Used for UI and inventory display (prices, totals).
 */
const CURRENCY_SYMBOLS: Record<string, string> = {
  GHS: "₵",
  USD: "$",
  EUR: "€",
  GBP: "£",
  ZAR: "R",
  XAF: "FCFA",
  XOF: "CFA",
};

const DEFAULT_CURRENCY = "GHS";

/**
 * Returns the symbol for an ISO 4217 currency code (e.g. GHS → ₵, USD → $).
 * Falls back to the code itself if unknown.
 */
export function getCurrencySymbol(currencyCode: string | null | undefined): string {
  if (!currencyCode) return CURRENCY_SYMBOLS[DEFAULT_CURRENCY] ?? DEFAULT_CURRENCY;
  return CURRENCY_SYMBOLS[currencyCode.toUpperCase()] ?? currencyCode;
}

/**
 * Formats a numeric amount with the tenant's currency symbol and locale-aware number.
 * Uses 2 decimal places. Example: formatCurrency(1234.5, "GHS") → "₵1,234.50"
 */
export function formatCurrency(
  amount: number | string,
  currencyCode: string | null | undefined
): string {
  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (Number.isNaN(num)) return "—";
  const symbol = getCurrencySymbol(currencyCode ?? DEFAULT_CURRENCY);
  const formatted = num.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol}${formatted}`;
}
