/**
 * Currency options for the middleman flow. FX rates are seeded from a recent
 * snapshot (September 2026) so the app works with no network — but every
 * currency exposes the rate as an editable input so the operator can lock in
 * whatever wholesale/PayPal/bank rate they actually get.
 *
 * These are *not* live rates — treating them as such would violate Rule 2.
 * The seed is a starting point the user must confirm.
 */

export type SupplierCurrency = {
  code: string;
  label: string;
  /** approximate units per 1 USD as of the snapshot date */
  seededRatePerUsd: number;
  symbol: string;
};

export const SUPPLIER_CURRENCIES: SupplierCurrency[] = [
  { code: "USD", label: "US Dollar (USD)", seededRatePerUsd: 1, symbol: "$" },
  { code: "MYR", label: "Malaysian Ringgit (MYR / RM)", seededRatePerUsd: 4.2, symbol: "RM" },
  { code: "SGD", label: "Singapore Dollar (SGD)", seededRatePerUsd: 1.32, symbol: "S$" },
  { code: "IDR", label: "Indonesian Rupiah (IDR)", seededRatePerUsd: 15900, symbol: "Rp" },
  { code: "THB", label: "Thai Baht (THB)", seededRatePerUsd: 33.5, symbol: "฿" },
  { code: "PHP", label: "Philippine Peso (PHP)", seededRatePerUsd: 56, symbol: "₱" },
  { code: "VND", label: "Vietnamese Dong (VND)", seededRatePerUsd: 25400, symbol: "₫" },
  { code: "CNY", label: "Chinese Yuan (CNY)", seededRatePerUsd: 7.15, symbol: "¥" },
  { code: "INR", label: "Indian Rupee (INR)", seededRatePerUsd: 84, symbol: "₹" },
  { code: "EUR", label: "Euro (EUR)", seededRatePerUsd: 0.92, symbol: "€" },
  { code: "GBP", label: "British Pound (GBP)", seededRatePerUsd: 0.78, symbol: "£" },
];

export const DEFAULT_SUPPLIER_CURRENCY = "MYR";
/** date the seeded rates were captured — surface this so users know staleness */
export const FX_SEED_DATE = "2026-09-01";

export function findCurrency(code: string): SupplierCurrency {
  return (
    SUPPLIER_CURRENCIES.find((c) => c.code === code) ??
    SUPPLIER_CURRENCIES[0]
  );
}
