/**
 * Middleman-radar analysis engine. Pure functions, unit-tested — Rule 1.
 *
 * The middleman flow's question is different from the buy-a-liquidation-unit
 * question that /sourcing answers. Here the operator's supplier is a friend
 * with elastic capacity, so:
 *   - dead-stock risk is not the concern (they can re-source on demand);
 *   - the fight is margin thickness after fees + international shipping,
 *     and whether the competitor floor lets them undercut and still profit;
 *   - "undercut price" is the tactical output, not just "verdict word".
 */

import { cents, median, percentile, trimOutliers } from "@/lib/stats";
import { computeFees, type FeeBreakdown } from "@/lib/fees/engine";
import { FEE_PRESETS, type FeePreset } from "@/lib/fees/presets";
import { classifyCompetitionPressure } from "@/lib/shared/competition";

export type MiddlemanInput = {
  /** wholesale price your supplier friend quoted, in supplierCurrency units */
  supplierPrice: number;
  /** fx rate: units of supplierCurrency per 1 USD */
  fxRatePerUsd: number;
  /** international shipping USD you'll pay to get it to the buyer */
  shippingCostUsd: number;
  /** eBay preset id — usually "ebay", but Amazon/Walmart also valid */
  presetId: string;
  /** ad rate you'll run on eBay (0 = no promoted listing) */
  promotedListingPct: number;
  /** how much to undercut the cheapest competitor, e.g. 0.05 = 5% below floor */
  undercutPct: number;
  /** the eBay competitor prices you're pricing against, in USD */
  competitorPrices: number[];
  competitorCount: number;
};

export type MiddlemanAnalysis = {
  status: "OK";
  supplierCostUsd: number;
  /** competitor price ladder (USD, outlier-trimmed) */
  competitors: {
    min: number;
    p25: number;
    median: number;
    p75: number;
    count: number;
  } | null;
  /** the price to list at — undercut × cheapest competitor */
  suggestedListPrice: number;
  fees: FeeBreakdown;
  /** how much you keep after fees + shipping + supplier cost, per unit */
  netProfitPerUnit: number;
  /** net / list price — the true margin */
  marginPct: number;
  /** net / (supplier cost + shipping) — cash-on-cash return */
  roiPct: number;
  /**
   * competitor pressure signal — how many sellers you'd be undercutting.
   * A high number means many sellers to displace; a low number means either
   * thin market or you're first-mover (both need judgement calls).
   */
  competitorPressure: "NONE" | "THIN" | "HEALTHY" | "SATURATED";
  /**
   * "spread" = suggestedList − supplierCost. A wide spread is not the same
   * as high profit (fees eat it), so we also expose spreadMinusFees.
   */
  spreadUsd: number;
  spreadAfterFeesUsd: number;
  /** floor supplier price would still profit at, given current competitor floor */
  breakEvenSupplierUsd: number;
};

export type MiddlemanNoCompetitors = { status: "NO_COMPETITORS" };
export type MiddlemanVerdict = {
  verdict:
    | "LIST IT"
    | "LIST — SLIM MARGIN"
    | "REPRICE OR RENEGOTIATE"
    | "SKIP — CAN'T UNDERCUT PROFITABLY"
    | "SKIP — NO MARKET";
  reason: string;
  /** action-oriented tips specific to this rule */
  tips: string[];
};

/** classify competitor pressure by count — shared with Trends (lib/shared/competition.ts) */
const pressure = classifyCompetitionPressure;

/**
 * Given the competitor floor and every other cost, solve for the highest
 * supplier price that still nets ≥ $0 at the suggested list price. This is
 * the number the operator negotiates against.
 */
function computeBreakEvenSupplierUsd(
  suggestedListPrice: number,
  fees: FeeBreakdown,
  shippingCostUsd: number,
): number {
  return cents(suggestedListPrice - fees.totalFees - shippingCostUsd);
}

export function analyzeMiddleman(
  input: MiddlemanInput,
): MiddlemanAnalysis | MiddlemanNoCompetitors {
  const trimmed = trimOutliers(input.competitorPrices);
  const preset: FeePreset = FEE_PRESETS[input.presetId] ?? FEE_PRESETS.ebay;

  const supplierCostUsd =
    input.fxRatePerUsd > 0 ? cents(input.supplierPrice / input.fxRatePerUsd) : 0;

  if (trimmed.length === 0 && input.competitorCount === 0) {
    return { status: "NO_COMPETITORS" };
  }

  const competitorsFloor =
    trimmed.length > 0 ? Math.min(...trimmed) : supplierCostUsd * 2;
  const suggestedListPrice = cents(
    competitorsFloor * Math.max(1 - input.undercutPct, 0.1),
  );

  const fees = computeFees(suggestedListPrice, preset, {
    promotedListingPct: input.promotedListingPct || undefined,
  });
  const netProfitPerUnit = cents(
    suggestedListPrice - fees.totalFees - input.shippingCostUsd - supplierCostUsd,
  );
  const marginPct =
    suggestedListPrice > 0 ? netProfitPerUnit / suggestedListPrice : 0;
  const capital = supplierCostUsd + input.shippingCostUsd;
  const roiPct = capital > 0 ? netProfitPerUnit / capital : 0;

  const competitors =
    trimmed.length > 0
      ? {
          min: cents(Math.min(...trimmed)),
          p25: cents(percentile(trimmed, 0.25)),
          median: cents(median(trimmed)),
          p75: cents(percentile(trimmed, 0.75)),
          count: input.competitorCount,
        }
      : null;

  const spreadUsd = cents(suggestedListPrice - supplierCostUsd);
  const spreadAfterFeesUsd = cents(spreadUsd - fees.totalFees - input.shippingCostUsd);
  const breakEvenSupplierUsd = computeBreakEvenSupplierUsd(
    suggestedListPrice,
    fees,
    input.shippingCostUsd,
  );

  return {
    status: "OK",
    supplierCostUsd,
    competitors,
    suggestedListPrice,
    fees,
    netProfitPerUnit,
    marginPct,
    roiPct,
    competitorPressure: pressure(input.competitorCount),
    spreadUsd,
    spreadAfterFeesUsd,
    breakEvenSupplierUsd,
  };
}

const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Verdict rules tuned for the reseller-with-elastic-supply workflow.
 * Ordered; first match wins. No inputs → no verdict fires (§3 Rule 3).
 */
export function verdictForMiddleman(
  a: MiddlemanAnalysis,
): MiddlemanVerdict {
  if (a.netProfitPerUnit <= 0) {
    // can't undercut and still profit
    return {
      verdict: "SKIP — CAN'T UNDERCUT PROFITABLY",
      reason: `Undercutting the ${a.competitors ? `$${a.competitors.min}` : "competitor"} floor leaves you at ${a.netProfitPerUnit < 0 ? `-$${Math.abs(a.netProfitPerUnit).toFixed(2)}` : "$0"} per unit after fees and shipping.`,
      tips: [
        `Ask your supplier to drop the price to ≤ $${a.breakEvenSupplierUsd.toFixed(2)} to break even at the current floor.`,
        a.competitorPressure === "SATURATED"
          ? "This category is crowded — expect the floor to drop further."
          : "Consider a bundle/kit angle so you're not price-matched 1:1.",
      ],
    };
  }
  if (a.competitorPressure === "NONE") {
    return {
      verdict: "SKIP — NO MARKET",
      reason:
        "No eBay competitors were found for this query. Either no one buys it, or the search terms are too specific — try broader keywords or verify demand elsewhere first.",
      tips: [
        "Try a shorter query (product noun + brand only).",
        "If demand really is zero, this isn't a middleman opportunity — it's product development.",
      ],
    };
  }
  if (a.marginPct >= 0.25 && a.roiPct >= 0.4) {
    return {
      verdict: "LIST IT",
      reason: `${pct(a.marginPct)} margin, ${pct(a.roiPct)} ROI at the undercut price — a healthy spread even after eBay fees.`,
      tips: [
        `List at $${a.suggestedListPrice.toFixed(2)} to sit just under the competitor floor.`,
        a.competitorPressure === "THIN"
          ? "Thin competition — you can probably hold this price without a race to the bottom."
          : "Watch for competitors matching or undercutting within days; be ready to reprice.",
      ],
    };
  }
  if (a.marginPct >= 0.15) {
    return {
      verdict: "LIST — SLIM MARGIN",
      reason: `${pct(a.marginPct)} margin is real but thin. A single fee change or an ad-rate bump could wipe it out.`,
      tips: [
        `Break-even supplier price is $${a.breakEvenSupplierUsd.toFixed(2)} — anything you can shave off cost goes straight to profit.`,
        "Consider skipping promoted listings until you've validated the flip is durable.",
        a.competitorPressure === "SATURATED"
          ? "Saturated market — one more undercut and you're at break-even."
          : "Small volume is fine here; don't over-order stock.",
      ],
    };
  }
  return {
    verdict: "REPRICE OR RENEGOTIATE",
    reason: `Margin of ${pct(a.marginPct)} isn't enough to absorb returns, chargebacks, or a competitor undercut.`,
    tips: [
      `Renegotiate the supplier price down toward $${a.breakEvenSupplierUsd.toFixed(2)} to give yourself headroom.`,
      "Try a different undercut % — larger undercut wins the buy button but shrinks margin further.",
      "Or reprice above the floor if you have a differentiator (faster ship, better condition, bundle).",
    ],
  };
}
