import { ebayConfigured, ebayFetch } from "@/lib/ebay/auth";
import type { ScoutItem, ScoutQuery } from "@/lib/scout/types";

/**
 * Item-level eBay search for Scout. Distinct from DemandSource (which only
 * needs price arrays) — here we need per-item detail: who sold it, their
 * feedback, and the listing URL.
 *
 * Sold history requires the Marketplace Insights API, which eBay grants
 * separately from Browse. When it isn't granted we return
 * soldDataAvailable:false and fall back to active listings, clearly labeled.
 * Sold data is never fabricated (§8).
 */

type BrowseSeller = {
  username?: string;
  feedbackScore?: number;
  feedbackPercentage?: string;
};

type BrowseItem = {
  itemId?: string;
  title?: string;
  price?: { value?: string; currency?: string };
  seller?: BrowseSeller;
  itemLocation?: { country?: string };
  condition?: string;
  itemWebUrl?: string;
  lastSoldDate?: string;
  lastSoldPrice?: { value?: string; currency?: string };
};

const SORT_PARAM: Record<string, string | undefined> = {
  price_asc: "price",
  price_desc: "-price",
  recent: "newlyListed",
  // no eBay equivalent for feedback sort — handled post-fetch in the pipeline
  feedback_asc: undefined,
};

function buildFilters(q: ScoutQuery, soldWindow: boolean): string[] {
  const filters: string[] = [];
  if (q.minPrice !== undefined || q.maxPrice !== undefined) {
    const lo = q.minPrice ?? "";
    const hi = q.maxPrice ?? "";
    filters.push(`price:[${lo}..${hi}]`, "priceCurrency:USD");
  }
  if (q.itemLocationCountry) {
    filters.push(`itemLocationCountry:${q.itemLocationCountry}`);
  }
  if (soldWindow) {
    const from = new Date(
      Date.now() - q.soldWindowDays * 86_400_000,
    ).toISOString();
    filters.push(`lastSoldDate:[${from}..]`);
  }
  return filters;
}

function toScoutItem(raw: BrowseItem, sold: boolean): ScoutItem | null {
  const priceRaw = sold
    ? (raw.lastSoldPrice?.value ?? raw.price?.value)
    : raw.price?.value;
  const price = Number(priceRaw);
  if (!Number.isFinite(price) || price <= 0) return null;

  const fbPct = raw.seller?.feedbackPercentage
    ? Number(raw.seller.feedbackPercentage)
    : null;

  return {
    itemId: raw.itemId ?? crypto.randomUUID(),
    title: raw.title ?? "(untitled listing)",
    price,
    currency:
      (sold ? raw.lastSoldPrice?.currency : raw.price?.currency) ?? "USD",
    seller: {
      username: raw.seller?.username ?? "(unknown)",
      feedbackScore:
        typeof raw.seller?.feedbackScore === "number"
          ? raw.seller.feedbackScore
          : null,
      feedbackPct: Number.isFinite(fbPct) ? fbPct : null,
    },
    itemLocation: raw.itemLocation?.country ?? null,
    condition: raw.condition ?? null,
    itemWebUrl: raw.itemWebUrl ?? null,
    soldDate: sold ? (raw.lastSoldDate ?? null) : null,
    riskFlags: [],
  };
}

export type RawSearchResult = {
  items: ScoutItem[];
  totalMatched: number;
  soldDataAvailable: boolean;
  mode: "SOLD" | "ACTIVE";
};

/** Marketplace Insights — real sold history. Requires eBay approval. */
async function searchSold(q: ScoutQuery): Promise<RawSearchResult | null> {
  if (process.env.EBAY_INSIGHTS_ENABLED !== "true") return null;

  const params = new URLSearchParams({ limit: "200" });
  if (q.keyword.trim()) params.set("q", q.keyword.trim());
  if (q.categoryId) params.set("category_ids", q.categoryId);
  const filters = buildFilters(q, true);
  if (filters.length) params.set("filter", filters.join(","));

  const res = await ebayFetch(
    `/buy/marketplace_insights/v1_beta/item_sales/search?${params}`,
  );
  const data = (await res.json()) as {
    total?: number;
    itemSales?: BrowseItem[];
  };
  const items = (data.itemSales ?? [])
    .map((i) => toScoutItem(i, true))
    .filter((i): i is ScoutItem => i !== null);
  return {
    items,
    totalMatched: data.total ?? items.length,
    soldDataAvailable: true,
    mode: "SOLD",
  };
}

/** Browse — active listings. Always available once keys are live. */
async function searchActive(q: ScoutQuery): Promise<RawSearchResult> {
  const params = new URLSearchParams({ limit: "200" });
  if (q.keyword.trim()) params.set("q", q.keyword.trim());
  if (q.categoryId) params.set("category_ids", q.categoryId);
  const filters = buildFilters(q, false);
  if (filters.length) params.set("filter", filters.join(","));
  const sort = SORT_PARAM[q.sort];
  if (sort) params.set("sort", sort);

  const res = await ebayFetch(`/buy/browse/v1/item_summary/search?${params}`);
  const data = (await res.json()) as {
    total?: number;
    itemSummaries?: BrowseItem[];
  };
  const items = (data.itemSummaries ?? [])
    .map((i) => toScoutItem(i, false))
    .filter((i): i is ScoutItem => i !== null);
  return {
    items,
    totalMatched: data.total ?? items.length,
    soldDataAvailable: false,
    mode: "ACTIVE",
  };
}

/**
 * Prefers real sold data; falls back to active listings when Insights isn't
 * granted. The caller must surface which mode came back — an active listing
 * is not proof of a sale, and the UI has to say so.
 */
export async function searchScout(q: ScoutQuery): Promise<RawSearchResult> {
  if (!ebayConfigured()) {
    throw new Error("eBay credentials not configured");
  }
  const sold = await searchSold(q).catch(() => null);
  if (sold && sold.items.length > 0) return sold;
  return searchActive(q);
}
