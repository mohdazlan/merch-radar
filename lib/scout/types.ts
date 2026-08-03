/**
 * Scout — sold-item discovery. Implements the search-builder pipeline:
 *
 *   keyword? (exact | relevance | include everything)
 *     → items sold within N months
 *     → category filter?
 *     → min/max price (validated)?
 *     → item location?
 *     → seller feedback below N? ("find a new seller and copy his item")
 *     → remove high-risk items?
 *     → sort
 *     → display (item, price, which seller sold it)
 *     → export
 *
 * The seller-feedback step is the strategic core: a seller with almost no
 * feedback who is *already selling* proves the product carries itself without
 * reputation — that's a replicable opportunity, not a moat.
 */

export type MatchMode = "exact" | "relevance";

export type ScoutSort =
  | "price_asc"
  | "price_desc"
  | "recent"
  | "feedback_asc";

export type ScoutQuery = {
  /** empty string = "include everything" (requires a category instead) */
  keyword: string;
  matchMode: MatchMode;
  /** the flowchart fixes this at 3 months; exposed so it's visible, not hidden */
  soldWindowDays: 30 | 60 | 90;
  categoryId?: string;
  minPrice?: number;
  maxPrice?: number;
  /** ISO-3166 country code, e.g. "MY" */
  itemLocationCountry?: string;
  /** null = don't filter by feedback; number = keep sellers at/below this score */
  maxSellerFeedback: number | null;
  removeHighRisk: boolean;
  sort: ScoutSort;
  demo?: boolean;
};

export type ScoutSeller = {
  username: string;
  /** total feedback score — low means new seller */
  feedbackScore: number | null;
  /** percentage positive, 0–100 */
  feedbackPct: number | null;
};

export type ScoutItem = {
  itemId: string;
  title: string;
  price: number;
  currency: string;
  seller: ScoutSeller;
  itemLocation: string | null;
  condition: string | null;
  itemWebUrl: string | null;
  /** present only when the result came from sold data */
  soldDate: string | null;
  /** disclosed risk-heuristic hits (§ Rule 3 — never a black box) */
  riskFlags: string[];
};

/** why rows disappeared between fetch and display — the audit trail */
export type FilterStep = {
  step: string;
  removed: number;
  remaining: number;
  /** the rule in plain language, so no filter is a black box */
  rule: string;
};

export type ScoutResult = {
  /**
   * SOLD  = real sold history (needs Marketplace Insights approval)
   * ACTIVE = live listings standing in for sold data, clearly labeled
   */
  mode: "SOLD" | "ACTIVE";
  provenance: "LIVE" | "DEMO";
  /** false when Insights isn't granted — the UI must say so, not fake it */
  soldDataAvailable: boolean;
  items: ScoutItem[];
  /** how many eBay reported before our post-filters */
  totalMatched: number;
  pipeline: FilterStep[];
  fetchedAt: string;
};
