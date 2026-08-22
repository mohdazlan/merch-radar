import { cents, clamp, median, trimOutliers } from "@/lib/stats";
import { computeFees, type FeeBreakdown, type FeeOptions } from "@/lib/fees/engine";
import type { FeePreset } from "@/lib/fees/presets";

/**
 * §5.3 computed metrics — pure functions, recomputed from inputs so a
 * fee-preset change is instantly reflected. Derived, never stored.
 *
 * Sold data may be UNAVAILABLE (Insights not granted): sell-through,
 * days-to-flip, and profit/day become null and the UI must degrade honestly.
 * They are never guessed.
 */

export type MetricsInput = {
  buyCost: number;
  shippingCost: number;
  activeCount: number;
  activePrices: number[];
  /** null = sold data UNAVAILABLE */
  soldCount: number | null;
  /** completed-sale prices from Marketplace Insights */
  soldPrices: number[] | null;
  /** current prices, restricted to Browse listings with reported sales */
  soldListingPrices?: number[] | null;
  /** fractional price change over 90d from the forecast engine; null = unknown */
  decaySlope: number | null;
  preset: FeePreset;
  feeOptions?: FeeOptions;
  /** queue-depth adjustment, default 1 */
  competitionFactor?: number;
};

export type Metrics = {
  status: "OK";
  estSellPrice: number;
  /** MODELED provenance detail: which comps produced the estimate */
  estSellPriceSource:
    | "SOLD_MEDIAN"
    | "SOLD_LISTING_MEDIAN"
    | "ACTIVE_DISCOUNTED";
  sellThroughRate: number | null;
  daysToFlip: number | null;
  netProceeds: number;
  netProfit: number;
  roi: number;
  margin: number;
  capitalPerDay: number | null;
  decaySlope: number | null;
  fees: FeeBreakdown;
};

export type NoComps = { status: "NO_COMPS" };

/** fallback discount applied to active-listing median when no sold comps */
export const ACTIVE_FALLBACK_DISCOUNT = 0.88;

export function computeMetrics(input: MetricsInput): Metrics | NoComps {
  const soldPrices = trimOutliers(input.soldPrices ?? []);
  const soldListingPrices = trimOutliers(input.soldListingPrices ?? []);
  const activePrices = trimOutliers(input.activePrices);

  let estSellPrice: number;
  let estSellPriceSource: Metrics["estSellPriceSource"];
  if (soldPrices.length > 0) {
    estSellPrice = cents(median(soldPrices));
    estSellPriceSource = "SOLD_MEDIAN";
  } else if (soldListingPrices.length > 0) {
    estSellPrice = cents(median(soldListingPrices));
    estSellPriceSource = "SOLD_LISTING_MEDIAN";
  } else if (activePrices.length > 0) {
    estSellPrice = cents(median(activePrices) * ACTIVE_FALLBACK_DISCOUNT);
    estSellPriceSource = "ACTIVE_DISCOUNTED";
  } else {
    return { status: "NO_COMPS" };
  }

  const hasSold = input.soldCount !== null;
  const soldCount = input.soldCount ?? 0;
  const competitionFactor = input.competitionFactor ?? 1;

  const sellThroughRate = hasSold
    ? soldCount + input.activeCount > 0
      ? soldCount / (soldCount + input.activeCount)
      : 0
    : null;

  // how deep the queue is ahead of you at current sell velocity
  const daysToFlip = hasSold
    ? clamp(
        ((90 / Math.max(soldCount, 1)) * input.activeCount) / competitionFactor,
        1,
        365,
      )
    : null;

  const fees = computeFees(estSellPrice, input.preset, input.feeOptions);
  const netProceeds = cents(estSellPrice - fees.totalFees - input.shippingCost);
  const netProfit = cents(netProceeds - input.buyCost);
  const capitalDeployed = input.buyCost + input.shippingCost;
  const roi = capitalDeployed > 0 ? netProfit / capitalDeployed : 0;
  const margin = estSellPrice > 0 ? netProfit / estSellPrice : 0;
  const capitalPerDay =
    daysToFlip !== null ? cents(netProfit / daysToFlip) : null;

  return {
    status: "OK",
    estSellPrice,
    estSellPriceSource,
    sellThroughRate,
    daysToFlip,
    netProceeds,
    netProfit,
    roi,
    margin,
    capitalPerDay,
    decaySlope: input.decaySlope,
    fees,
  };
}
