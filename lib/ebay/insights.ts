import type {
  ActiveComps,
  DemandSource,
  SearchQuery,
  SoldBrowseHistory,
  SoldComps,
  SoldReference,
  SoldUnavailable,
} from "@/lib/ebay/DemandSource";
import { CONDITION_IDS, EbayBrowseSource } from "@/lib/ebay/browse";
import { ebayFetch } from "@/lib/ebay/auth";

type InsightsSale = {
  itemId?: string;
  title?: string;
  condition?: string;
  itemWebUrl?: string;
  seller?: { username?: string };
  lastSoldDate?: string;
  lastSoldPrice?: { value?: string; currency?: string };
  totalSoldQuantity?: number;
};

/**
 * Marketplace Insights API (90-day sold). Requires eBay approval — gated by
 * EBAY_INSIGHTS_ENABLED=true. When not granted, the composite source falls
 * back to the Browse API's estimatedSoldQuantity (listing-level sold counts)
 * which gives a demand signal without individual sold prices or dates.
 */
export class EbayInsightsSource implements DemandSource {
  private browse = new EbayBrowseSource();

  async getActive(q: SearchQuery): Promise<ActiveComps> {
    return this.browse.getActive(q);
  }

  async getSold(
    q: SearchQuery,
  ): Promise<SoldComps | SoldBrowseHistory | SoldUnavailable> {
    if (process.env.EBAY_INSIGHTS_ENABLED !== "true") {
      return this.browse.getSold(q);
    }
    try {
      const params = new URLSearchParams({ q: q.q, limit: "100" });
      if (q.condition) {
        params.set("filter", `conditionIds:{${CONDITION_IDS[q.condition]}}`);
      }
      const res = await ebayFetch(
        `/buy/marketplace_insights/v1_beta/item_sales/search?${params.toString()}`,
      );
      const data = (await res.json()) as { itemSales?: InsightsSale[] };
      const references = (data.itemSales ?? [])
        .map((sale): SoldReference | null => {
          const price = Number(sale.lastSoldPrice?.value);
          if (!sale.lastSoldDate || !Number.isFinite(price) || price <= 0) {
            return null;
          }
          return {
            itemId: sale.itemId ?? crypto.randomUUID(),
            title: sale.title ?? "(untitled completed sale)",
            price,
            currency: sale.lastSoldPrice?.currency ?? "USD",
            soldQuantity:
              typeof sale.totalSoldQuantity === "number" &&
              sale.totalSoldQuantity > 0
                ? Math.floor(sale.totalSoldQuantity)
                : 1,
            soldDate: sale.lastSoldDate,
            itemWebUrl: sale.itemWebUrl ?? null,
            sellerName: sale.seller?.username ?? null,
            condition: sale.condition ?? null,
            priceBasis: "COMPLETED_SALE",
          };
        })
        .filter((reference): reference is SoldReference => reference !== null)
        .sort((a, b) =>
          (a.soldDate ?? "").localeCompare(b.soldDate ?? ""),
        );
      const sales = references.map((reference) => ({
        date: reference.soldDate as string,
        price: reference.price,
      }));
      if (sales.length === 0) return this.browse.getSold(q);
      return {
        status: "OK",
        provenance: "LIVE",
        soldCount: references.reduce(
          (total, reference) => total + reference.soldQuantity,
          0,
        ),
        prices: sales.map((s) => s.price),
        series: sales.sort((a, b) => a.date.localeCompare(b.date)),
        references,
        fetchedAt: new Date().toISOString(),
      };
    } catch {
      // Insights is restricted and can be revoked or unavailable separately
      // from Browse. Preserve live active data and fall back to sold-backed
      // listing history instead of switching the whole analysis to fixtures.
      return this.browse.getSold(q);
    }
  }
}
