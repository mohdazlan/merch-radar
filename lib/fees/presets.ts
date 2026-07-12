/**
 * Fee presets are versioned, dated, and configurable (spec §5.7).
 * All *Pct fields are fractions (0.1325 = 13.25%), never hardcoded as
 * universal truth — each preset carries its effectiveDate and source.
 */

export type FeePreset = {
  id: string;
  label: string;
  effectiveDate: string;
  sourceUrl: string;
  /** category-dependent final value / referral fee, fraction of sell price */
  finalValuePct: number;
  /** per-order fixed fee, USD */
  perOrderFixed: number;
  categoryOverrides?: Record<string, number>;
  /** optional ad rate, user-set (default 0) */
  promotedListingPct?: number;
  /** amortized across monthly volume when provided */
  storeSubscriptionMonthly?: number;
  internationalPct?: number;
  /** separate payment processing where the marketplace bills it separately */
  paymentProcessingPct?: number;
  paymentProcessingFixed?: number;
  /** FBA-style fulfillment fee tiers, matched by sell price ascending */
  fulfillmentTiers?: { maxPrice: number; fee: number }[];
};

export const FEE_PRESETS: Record<string, FeePreset> = {
  ebay: {
    id: "ebay",
    label: "eBay (most categories)",
    effectiveDate: "2025-02-14",
    sourceUrl: "https://www.ebay.com/help/selling/fees-credits-invoices/selling-fees",
    finalValuePct: 0.1325,
    perOrderFixed: 0.3,
    categoryOverrides: {
      "sneakers-over-150": 0.08,
      "guitars-basses": 0.0635,
      "heavy-equipment": 0.03,
    },
  },
  "amazon-fbm": {
    id: "amazon-fbm",
    label: "Amazon FBM",
    effectiveDate: "2025-01-15",
    sourceUrl: "https://sellercentral.amazon.com/help/hub/reference/external/200336920",
    finalValuePct: 0.15,
    perOrderFixed: 0,
  },
  "amazon-fba": {
    id: "amazon-fba",
    label: "Amazon FBA",
    effectiveDate: "2025-01-15",
    sourceUrl: "https://sellercentral.amazon.com/help/hub/reference/external/GPDC3KPYAGDTVDJP",
    finalValuePct: 0.15,
    perOrderFixed: 0,
    // simplified standard-size tiers; real FBA fees also vary by weight
    fulfillmentTiers: [
      { maxPrice: 10, fee: 2.5 },
      { maxPrice: 25, fee: 3.5 },
      { maxPrice: 100, fee: 5.0 },
      { maxPrice: Infinity, fee: 6.5 },
    ],
  },
  walmart: {
    id: "walmart",
    label: "Walmart Marketplace",
    effectiveDate: "2025-01-01",
    sourceUrl: "https://marketplace.walmart.com/referral-fees/",
    finalValuePct: 0.15,
    perOrderFixed: 0,
  },
  mercari: {
    id: "mercari",
    label: "Mercari",
    effectiveDate: "2025-03-01",
    sourceUrl: "https://www.mercari.com/us/help_center/article/916/",
    finalValuePct: 0.1,
    perOrderFixed: 0,
    paymentProcessingPct: 0.029,
    paymentProcessingFixed: 0.5,
  },
  custom: {
    id: "custom",
    label: "Custom",
    effectiveDate: "2026-01-01",
    sourceUrl: "",
    finalValuePct: 0.1,
    perOrderFixed: 0,
  },
};

export const DEFAULT_PRESET = FEE_PRESETS.ebay;
