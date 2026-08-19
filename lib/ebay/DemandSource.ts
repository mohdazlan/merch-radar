/**
 * The seam that keeps the app honest about eBay data availability (spec §8).
 * Implementations: EbayBrowseSource (always), EbayInsightsSource (when
 * approved), FixtureSource (Demo Mode). When sold data is UNAVAILABLE the
 * UI degrades honestly — sold data is never fabricated.
 */

export type Condition = "NEW" | "USED_LIKE_NEW" | "USED_GOOD" | "FOR_PARTS";

export type SearchQuery = {
  q: string;
  condition?: Condition;
  marketplaceId?: string;
};

export type ActiveComps = {
  status: "OK";
  provenance: "LIVE" | "DEMO";
  activeCount: number;
  /** outlier-trimmed active listing prices, USD */
  prices: number[];
  fetchedAt: string;
};

export type SoldComps = {
  status: "OK";
  provenance: "LIVE" | "DEMO";
  soldCount: number;
  /** outlier-trimmed sold prices, USD */
  prices: number[];
  /** 90-day sold series for the decay model */
  series: { date: string; price: number }[];
  fetchedAt: string;
};

export type SoldBrowseEstimate = {
  status: "BROWSE_ESTIMATE";
  provenance: "LIVE" | "DEMO";
  soldCount: number;
  fetchedAt: string;
};

export type SoldUnavailable = { status: "UNAVAILABLE" };

export interface DemandSource {
  getActive(q: SearchQuery): Promise<ActiveComps>;
  getSold(
    q: SearchQuery,
  ): Promise<SoldComps | SoldBrowseEstimate | SoldUnavailable>;
}
