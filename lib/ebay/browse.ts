import type {
  ActiveComps,
  Condition,
  DemandSource,
  SearchQuery,
  SoldBrowseHistory,
  SoldComps,
  SoldReference,
  SoldUnavailable,
} from "@/lib/ebay/DemandSource";
import { ebayFetch } from "@/lib/ebay/auth";

/** Browse API condition ids: 1000 new, 2750/3000 used tiers, 7000 parts */
export const CONDITION_IDS: Record<Condition, string> = {
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
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  itemWebUrl?: string;
  condition?: string;
  seller?: { username?: string };
  estimatedAvailabilities?: EstimatedAvailability[];
};

type BrowseSearchResult = {
  total?: number;
  itemSummaries?: BrowseItem[];
};

type BrowseItemsResult = {
  items?: BrowseItem[];
};

/** getItems accepts at most 20 REST item IDs per call. */
export const BROWSE_DETAIL_SAMPLE_LIMIT = 20;

function soldQuantity(item: BrowseItem): number {
  // Availability can have more than one delivery container. Use the largest
  // reported value so the same inventory is not double-counted.
  return Math.max(
    0,
    ...(item.estimatedAvailabilities ?? []).map((availability) => {
      const quantity = availability.estimatedSoldQuantity;
      return typeof quantity === "number" && Number.isFinite(quantity)
        ? Math.max(Math.floor(quantity), 0)
        : 0;
    }),
  );
}

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
    });
    if (q.condition) {
      params.set("filter", `conditionIds:{${CONDITION_IDS[q.condition]}}`);
    }
    const res = await ebayFetch(
      `/buy/browse/v1/item_summary/search?${params.toString()}`,
    );
    return (await res.json()) as BrowseSearchResult;
  }

  private async fetchDetails(items: BrowseItem[]): Promise<BrowseItem[]> {
    const itemIds = items
      .map((item) => item.itemId)
      .filter((itemId): itemId is string => Boolean(itemId))
      .slice(0, BROWSE_DETAIL_SAMPLE_LIMIT);
    if (itemIds.length === 0) return [];

    const params = new URLSearchParams({
      item_ids: itemIds.join(","),
      fieldgroups: "COMPACT",
    });
    const res = await ebayFetch(`/buy/browse/v1/item?${params.toString()}`);
    const data = (await res.json()) as BrowseItemsResult;
    return data.items ?? [];
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
  ): Promise<SoldComps | SoldBrowseHistory | SoldUnavailable> {
    const data = await this.fetchSearch(q);
    const summaries = (data.itemSummaries ?? []).slice(
      0,
      BROWSE_DETAIL_SAMPLE_LIMIT,
    );

    // Search returns ItemSummary, which does not include sold availability.
    // Hydrate the best-match sample through the bulk Item endpoint, where
    // estimatedSoldQuantity is actually defined.
    const details = await this.fetchDetails(summaries).catch(() => []);
    const summaryById = new Map(
      summaries
        .filter((item) => item.itemId)
        .map((item) => [item.itemId as string, item]),
    );

    const references: SoldReference[] = details
      .map((detail): SoldReference | null => {
        const quantity = soldQuantity(detail);
        const summary = detail.itemId
          ? summaryById.get(detail.itemId)
          : undefined;
        const price = Number(detail.price?.value ?? summary?.price?.value);
        if (quantity <= 0 || !Number.isFinite(price) || price <= 0) {
          return null;
        }
        return {
          itemId: detail.itemId ?? summary?.itemId ?? crypto.randomUUID(),
          title: summary?.title ?? detail.title ?? "(untitled eBay listing)",
          price,
          currency:
            detail.price?.currency ?? summary?.price?.currency ?? "USD",
          soldQuantity: quantity,
          soldDate: null,
          itemWebUrl: summary?.itemWebUrl ?? detail.itemWebUrl ?? null,
          sellerName: summary?.seller?.username ?? detail.seller?.username ?? null,
          condition: summary?.condition ?? detail.condition ?? null,
          priceBasis: "CURRENT_LISTING_WITH_SALES",
        };
      })
      .filter((reference): reference is SoldReference => reference !== null)
      .sort((a, b) => b.soldQuantity - a.soldQuantity);

    if (references.length === 0) return { status: "UNAVAILABLE" };
    return {
      status: "BROWSE_HISTORY",
      provenance: "LIVE",
      soldCount: references.reduce(
        (total, reference) => total + reference.soldQuantity,
        0,
      ),
      prices: references.map((reference) => reference.price),
      references,
      scannedListingCount: details.length,
      fetchedAt: new Date().toISOString(),
    };
  }
}
