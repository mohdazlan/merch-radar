import { classifyCompetitionPressure } from "@/lib/shared/competition";
import { median, percentile, trimOutliers } from "@/lib/stats";
import type { AspectValue, KeywordSignal, PriceStats } from "@/lib/trends/types";

/**
 * Trends engine — pure, unit-tested (Rule 1). Turns raw counts (from either
 * the live Browse fetcher or demo fixtures) into a KeywordSignal, and turns
 * a KeywordSignal into a disclosed, rule-based read. No score is invented —
 * every read names the exact counts behind it (Rule 3).
 */

export type RawKeywordData = {
  keyword: string;
  provenance: "LIVE" | "DEMO";
  activeCount: number;
  /** untrimmed active listing prices in USD */
  prices: number[];
  topAspects: AspectValue[];
  newSellerCount: number;
  sampledSellerCount: number;
  fetchedAt: string;
};

const round2 = (n: number) => Math.round(n * 100) / 100;

export function buildKeywordSignal(raw: RawKeywordData): KeywordSignal {
  const trimmed = trimOutliers(raw.prices);
  const priceStats: PriceStats | null =
    trimmed.length > 0
      ? {
          median: round2(median(trimmed)),
          p25: round2(percentile(trimmed, 0.25)),
          p75: round2(percentile(trimmed, 0.75)),
        }
      : null;

  const newSellerPct =
    raw.sampledSellerCount > 0
      ? Math.round((raw.newSellerCount / raw.sampledSellerCount) * 100)
      : null;

  return {
    keyword: raw.keyword,
    provenance: raw.provenance,
    degraded: false,
    activeCount: raw.activeCount,
    competitionPressure: classifyCompetitionPressure(raw.activeCount),
    priceStats,
    topAspects: raw.topAspects,
    newSellerCount: raw.newSellerCount,
    sampledSellerCount: raw.sampledSellerCount,
    newSellerPct,
    fetchedAt: raw.fetchedAt,
  };
}

export type KeywordRead = {
  headline: string;
  detail: string;
};

/** feedback share at/above which a saturated niche still reads as "enterable" */
export const NEWCOMER_BREAKTHROUGH_PCT = 20;

/** disclosed, rule-based read — never a mystery score (Rule 3) */
export function readKeywordSignal(s: KeywordSignal): KeywordRead {
  const activeStr = `${s.activeCount} active listing${s.activeCount === 1 ? "" : "s"}`;
  const sellerStr =
    s.newSellerPct === null
      ? "seller feedback unavailable in the sample"
      : `${s.newSellerPct}% of sampled sellers are low-feedback newcomers`;

  switch (s.competitionPressure) {
    case "NONE":
      return {
        headline: "No active listings found",
        detail:
          "Either there's no demand for this term on eBay, or the keyword is too narrow — try a broader phrase before ruling it out.",
      };
    case "THIN":
      return {
        headline: "Thin market — unproven demand",
        detail: `${activeStr}. Too few listings to tell low competition from low demand — treat as unvalidated.`,
      };
    case "SATURATED":
      if (s.newSellerPct !== null && s.newSellerPct >= NEWCOMER_BREAKTHROUGH_PCT) {
        return {
          headline: "Saturated, but newcomers are still getting in",
          detail: `${activeStr}, and ${sellerStr} — high competition, but the door isn't closed to a new seller.`,
        };
      }
      return {
        headline: "Saturated — dominated by established sellers",
        detail: `${activeStr}, and ${sellerStr} — expect to compete on price against sellers with an established footprint.`,
      };
    case "HEALTHY":
    default:
      return {
        headline: "Healthy market — validated demand, room to enter",
        detail: `${activeStr}, and ${sellerStr}.`,
      };
  }
}
