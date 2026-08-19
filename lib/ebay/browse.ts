import type {
  ActiveComps,
  Condition,
  DemandSource,
  SearchQuery,
  SoldBrowseEstimate,
  SoldComps,
  SoldUnavailable,
} from "@/lib/ebay/DemandSource";
import { ebayFetch } from "@/lib/ebay/auth";

/** Browse API condition ids: 1000 new, 2750/3000 used tiers, 7000 parts */
const CONDITION_IDS: Record<Condition, string> = {
  NEW: "1000",
  USED_LIKE_NEW: "2750",
  USED_GOOD: "3000",
  FOR_PARTS: "7000",
};

type EstimatedAvailability = {
  estimatedSoldQuantity?: number;
  estimatedAvailableQuantity?: number;
};

type BrowseItem = {
  price?: { value?: string; currency?: string };
  shippingOptions?: { shippingCost?: { value?: string } }[];
  estimatedAvailabilities?: EstimatedAvailability[];
};

type BrowseSearchResult = {
  total?: number;
  itemSummaries?: BrowseItem[];
};

/**
 * Always-available live source: active supply + per-listing sold counts
 * from the Browse API. When Insights isn't granted, the sold count from
 * estimatedAvailabilities is the best demand signal available — it's the
 * same "N sold" the user sees on every eBay listing page.
 *
 * A single API call serves both getActive() and getSold() via a shared
 * promise so parallel callers don't double-fetch.
 */
export class EbayBrowseSource implements DemandSource {
  private pending = new Map<string, Promise<BrowseSearchResult>>();

  private cacheKey(q: SearchQuery): string {
    return `${q.q}|${q.condition ?? ""}`;
  }

  private fetchSearch(q: SearchQuery): Promise<BrowseSearchResult> {
    const key = this.cacheKey(q);
    let p = this.pending.get(key);
    if (!p) {
      p = this.doSearch(q);
      this.pending.set(key, p);
    }
    return p;
  }

  private async doSearch(q: SearchQuery): Promise<BrowseSearchResult> {
    const params = new URLSearchParams({
      q: q.q,
      limit: "200",
      fieldgroups: "EXTENDED",
    });
    if (q.condition) {
      params.set("filter", `conditionIds:{${CONDITION_IDS[q.condition]}}`);
    }
    const res = await ebayFetch(
      `/buy/browse/v1/item_summary/search?${params.toString()}`,
    );
    return (await res.json()) as BrowseSearchResult;
  }

  async getActive(q: SearchQuery): Promise<ActiveComps> {
    const data = await this.fetchSearch(q);
    const prices = (data.itemSummaries ?? [])
      .map((i) => Number(i.price?.value))
      .filter((p) => Number.isFinite(p) && p > 0);
    return {
      status: "OK",
      provenance: "LIVE",
      activeCount: data.total ?? prices.length,
      prices,
      fetchedAt: new Date().toISOString(),
    };
  }

  async getSold(
    q: SearchQuery,
  ): Promise<SoldComps | SoldBrowseEstimate | SoldUnavailable> {
    const data = await this.fetchSearch(q);
    const items = data.itemSummaries ?? [];
    let totalSold = 0;
    for (const item of items) {
      for (const ea of item.estimatedAvailabilities ?? []) {
        const qty = ea.estimatedSoldQuantity;
        if (typeof qty === "number" && qty > 0) {
          totalSold += qty;
        }
      }
    }
    if (totalSold === 0) return { status: "UNAVAILABLE" };
    return {
      status: "BROWSE_ESTIMATE",
      provenance: "LIVE",
      soldCount: totalSold,
      fetchedAt: new Date().toISOString(),
    };
  }
}
