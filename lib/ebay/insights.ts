import type {
  ActiveComps,
  DemandSource,
  SearchQuery,
  SoldBrowseEstimate,
  SoldComps,
  SoldUnavailable,
} from "@/lib/ebay/DemandSource";
import { EbayBrowseSource } from "@/lib/ebay/browse";
import { ebayFetch } from "@/lib/ebay/auth";

type InsightsSale = {
  lastSoldDate?: string;
  lastSoldPrice?: { value?: string };
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
  ): Promise<SoldComps | SoldBrowseEstimate | SoldUnavailable> {
    if (process.env.EBAY_INSIGHTS_ENABLED !== "true") {
      return this.browse.getSold(q);
    }
    const params = new URLSearchParams({ q: q.q, limit: "100" });
    const res = await ebayFetch(
      `/buy/marketplace_insights/v1_beta/item_sales/search?${params.toString()}`,
    );
    const data = (await res.json()) as { itemSales?: InsightsSale[] };
    const sales = (data.itemSales ?? [])
      .map((s) => ({
        date: s.lastSoldDate ?? "",
        price: Number(s.lastSoldPrice?.value),
      }))
      .filter((s) => s.date && Number.isFinite(s.price) && s.price > 0);
    if (sales.length === 0) return { status: "UNAVAILABLE" };
    return {
      status: "OK",
      provenance: "LIVE",
      soldCount: sales.length,
      prices: sales.map((s) => s.price),
      series: sales.sort((a, b) => a.date.localeCompare(b.date)),
      fetchedAt: new Date().toISOString(),
    };
  }
}
