import { cents } from "@/lib/stats";
import type { FeePreset } from "@/lib/fees/presets";

/**
 * Fee engine — pure and deterministic (Rule 1). The line-item waterfall is
 * the audit trail for netProfit: every dollar subtracted is visible, and the
 * sum of lineItems always equals totalFees exactly.
 */

export type FeeLineItem = {
  id: string;
  label: string;
  /** USD subtracted from the sell price (always ≥ 0) */
  amount: number;
};

export type FeeBreakdown = {
  presetId: string;
  sellPrice: number;
  lineItems: FeeLineItem[];
  totalFees: number;
};

export type FeeOptions = {
  /** key into preset.categoryOverrides */
  category?: string;
  /** overrides preset.promotedListingPct when set */
  promotedListingPct?: number;
  /** amortizes storeSubscriptionMonthly when both are set */
  monthlyVolume?: number;
  international?: boolean;
};

export function computeFees(
  sellPrice: number,
  preset: FeePreset,
  opts: FeeOptions = {},
): FeeBreakdown {
  const items: FeeLineItem[] = [];
  const price = Math.max(sellPrice, 0);

  const fvfPct =
    (opts.category !== undefined
      ? preset.categoryOverrides?.[opts.category]
      : undefined) ?? preset.finalValuePct;
  items.push({
    id: "final-value",
    label: `Final value fee (${(fvfPct * 100).toFixed(2)}%)`,
    amount: cents(price * fvfPct),
  });

  if (preset.perOrderFixed > 0) {
    items.push({
      id: "per-order",
      label: "Per-order fixed fee",
      amount: cents(preset.perOrderFixed),
    });
  }

  if (preset.paymentProcessingPct || preset.paymentProcessingFixed) {
    items.push({
      id: "payment",
      label: "Payment processing",
      amount: cents(
        price * (preset.paymentProcessingPct ?? 0) +
          (preset.paymentProcessingFixed ?? 0),
      ),
    });
  }

  const adPct = opts.promotedListingPct ?? preset.promotedListingPct ?? 0;
  if (adPct > 0) {
    items.push({
      id: "promoted",
      label: `Promoted listing (${(adPct * 100).toFixed(1)}%)`,
      amount: cents(price * adPct),
    });
  }

  if (preset.fulfillmentTiers && preset.fulfillmentTiers.length > 0) {
    const tier = preset.fulfillmentTiers.find((t) => price <= t.maxPrice);
    items.push({
      id: "fulfillment",
      label: "Fulfillment fee",
      amount: cents(
        tier?.fee ??
          preset.fulfillmentTiers[preset.fulfillmentTiers.length - 1].fee,
      ),
    });
  }

  if (opts.international && preset.internationalPct) {
    items.push({
      id: "international",
      label: `International fee (${(preset.internationalPct * 100).toFixed(1)}%)`,
      amount: cents(price * preset.internationalPct),
    });
  }

  if (preset.storeSubscriptionMonthly && opts.monthlyVolume) {
    items.push({
      id: "store",
      label: "Store subscription (amortized)",
      amount: cents(preset.storeSubscriptionMonthly / opts.monthlyVolume),
    });
  }

  const totalFees = cents(items.reduce((a, i) => a + i.amount, 0));
  return { presetId: preset.id, sellPrice: price, lineItems: items, totalFees };
}
