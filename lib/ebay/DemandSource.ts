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

/**
 * A human-auditable listing or completed sale that supports the sold signal.
 * Browse can prove that a currently active multi-quantity listing has sold
 * units, but its price is the current listing price - not a historic checkout
 * price. Keep that distinction on every row so the UI never overstates it.
 */
export type SoldReference = {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  soldQuantity: number;
  soldDate: string | null;
  itemWebUrl: string | null;
  sellerName: string | null;
  condition: string | null;
  priceBasis: "COMPLETED_SALE" | "CURRENT_LISTING_WITH_SALES";
};

export type SoldComps = {
  status: "OK";
  provenance: "LIVE" | "DEMO";
  soldCount: number;
  /** outlier-trimmed sold prices, USD */
  prices: number[];
  /** 90-day sold series for the decay model */
  series: { date: string; price: number }[];
  /** item-level evidence displayed for merchant verification */
  references: SoldReference[];
  fetchedAt: string;
};

export type SoldBrowseHistory = {
  status: "BROWSE_HISTORY";
  provenance: "LIVE" | "DEMO";
  /** lifetime units sold across the scanned, currently active listings */
  soldCount: number;
  /** current prices from only those listings with eBay-reported sales */
  prices: number[];
  references: SoldReference[];
  scannedListingCount: number;
  fetchedAt: string;
};

export type SoldUnavailable = { status: "UNAVAILABLE" };

export interface DemandSource {
  getActive(q: SearchQuery): Promise<ActiveComps>;
  getSold(
    q: SearchQuery,
  ): Promise<SoldComps | SoldBrowseHistory | SoldUnavailable>;
}
