import type {
  ActiveComps,
  Condition,
  DemandSource,
  SearchQuery,
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

type BrowseItem = {
  price?: { value?: string; currency?: string };
  shippingOptions?: { shippingCost?: { value?: string } }[];
};

/**
 * Always-available live source: active supply from the Browse API.
 * Sold data is UNAVAILABLE here — that honesty is the point (§8): the
 * Insights adapter provides it only when eBay has granted access.
 */
export class EbayBrowseSource implements DemandSource {
  async getActive(q: SearchQuery): Promise<ActiveComps> {
    const params = new URLSearchParams({ q: q.q, limit: "200" });
    if (q.condition) {
      params.set("filter", `conditionIds:{${CONDITION_IDS[q.condition]}}`);
    }
    const res = await ebayFetch(
      `/buy/browse/v1/item_summary/search?${params.toString()}`,
    );
    const data = (await res.json()) as {
      total?: number;
      itemSummaries?: BrowseItem[];
    };
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

  async getSold(): Promise<SoldComps | SoldUnavailable> {
    return { status: "UNAVAILABLE" };
  }
}
