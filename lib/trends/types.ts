import type { CompetitionPressure } from "@/lib/shared/competition";

/**
 * Trends — live keyword comparison, deliberately NOT a "most searched
 * keywords" panel. eBay has no public search-volume API (Merchandising API
 * is deprecated; Marketing API's "trending" field is ad-bid rate on your own
 * listings, not buyer search interest), and Google Trends has no free
 * official API either — the free options are unofficial scrapers, which
 * this app's own spec already bans for the same reason (§8: "do NOT scrape
 * Amazon"). Faking a trend score here would be exactly the hype-tool failure
 * mode Rule 2 exists to prevent.
 *
 * What IS real and live: the Browse API's ASPECT_REFINEMENTS fieldgroup,
 * which returns counts of how many active listings carry each attribute
 * value (Brand, Style, ...) within a keyword's dominant category. Combined
 * with active-listing count, price spread, and Scout's new-seller-density
 * signal, this lets a seller compare candidate product ideas on real,
 * disclosed market composition — not a black-box "trend score".
 */

export type AspectValue = {
  /** e.g. "Brand" */
  name: string;
  /** e.g. "Tupperware" */
  value: string;
  matchCount: number;
};

export type PriceStats = {
  median: number;
  p25: number;
  p75: number;
};

export type KeywordSignal = {
  keyword: string;
  provenance: "LIVE" | "DEMO";
  /** true when a live lookup was attempted for this keyword but failed */
  degraded: boolean;
  activeCount: number;
  competitionPressure: CompetitionPressure;
  priceStats: PriceStats | null;
  /** top attribute values by listing count within the dominant category */
  topAspects: AspectValue[];
  /** sellers with feedback ≤ NEW_SELLER_FEEDBACK_CAP among the sampled listings */
  newSellerCount: number;
  sampledSellerCount: number;
  newSellerPct: number | null;
  fetchedAt: string;
};

export type TrendsRequest = {
  keywords: string[];
  demo?: boolean;
};

export type TrendsResult = {
  signals: KeywordSignal[];
};
