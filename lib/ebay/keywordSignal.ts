import { ebayConfigured, ebayFetch } from "@/lib/ebay/auth";
import type { AspectValue } from "@/lib/trends/types";
import { buildKeywordSignal, type RawKeywordData } from "@/lib/trends/analyze";
import type { KeywordSignal } from "@/lib/trends/types";

/**
 * Live market composition for one keyword. Two separate Browse API calls,
 * each using a request shape with *direct production evidence* it returns
 * the field it's asked for — after two guesses about eBay's `fieldgroups`
 * semantics both silently came back empty in production (the param appears
 * to replace rather than add to the default field group, and no combination
 * tried recovered itemSummaries), this stopped guessing a third time:
 *
 *   1. Plain search, no fieldgroups param — proven live in lib/ebay/search.ts
 *      (Scout) to return itemSummaries with price + seller.feedbackScore.
 *   2. fieldgroups=ASPECT_REFINEMENTS, limit=1 — proven live on the very
 *      first Trends deploy to return refinement.aspectDistributions with
 *      real counts. limit=1 keeps this call cheap since only the aggregate
 *      refinement container is used, not its itemSummaries.
 * https://developer.ebay.com/api-docs/buy/browse/types/gct:AspectDistribution
 *
 * This is NOT search-volume data — eBay has no public API for that. See the
 * header comment in lib/trends/types.ts for why this is the honest
 * alternative rather than a fabricated "trend score".
 */

/** feedback score at/below this counts as a "new seller" — matches Scout */
const NEW_SELLER_FEEDBACK_CAP = 100;
/** how many attribute values to keep per aspect, most-listed first */
const TOP_ASPECT_VALUES = 5;
/** how many aspect groups (Brand, Style, ...) to surface */
const TOP_ASPECTS = 3;

type BrowseItem = {
  price?: { value?: string };
  seller?: { feedbackScore?: number };
};

type AspectValueDistribution = {
  localizedAspectValue?: string;
  matchCount?: number;
};

type AspectDistribution = {
  localizedAspectName?: string;
  aspectValueDistributions?: AspectValueDistribution[];
};

type ItemsResponse = {
  total?: number;
  itemSummaries?: BrowseItem[];
};

type RefinementResponse = {
  refinement?: {
    aspectDistributions?: AspectDistribution[];
  };
};

function parseTopAspects(
  distributions: AspectDistribution[] | undefined,
): AspectValue[] {
  if (!distributions) return [];
  const flattened: AspectValue[] = [];
  for (const group of distributions.slice(0, TOP_ASPECTS)) {
    const name = group.localizedAspectName;
    if (!name) continue;
    const values = (group.aspectValueDistributions ?? [])
      .filter((v) => v.localizedAspectValue && typeof v.matchCount === "number")
      .sort((a, b) => (b.matchCount ?? 0) - (a.matchCount ?? 0))
      .slice(0, TOP_ASPECT_VALUES);
    for (const v of values) {
      flattened.push({
        name,
        value: v.localizedAspectValue!,
        matchCount: v.matchCount!,
      });
    }
  }
  return flattened;
}

async function fetchItems(keyword: string): Promise<ItemsResponse> {
  const params = new URLSearchParams({ q: keyword, limit: "200" });
  const res = await ebayFetch(`/buy/browse/v1/item_summary/search?${params}`);
  return (await res.json()) as ItemsResponse;
}

async function fetchAspects(keyword: string): Promise<RefinementResponse> {
  const params = new URLSearchParams({
    q: keyword,
    limit: "1",
    fieldgroups: "ASPECT_REFINEMENTS",
  });
  const res = await ebayFetch(`/buy/browse/v1/item_summary/search?${params}`);
  return (await res.json()) as RefinementResponse;
}

export async function fetchKeywordSignal(keyword: string): Promise<KeywordSignal> {
  if (!ebayConfigured()) throw new Error("eBay credentials not configured");

  const [itemsData, aspectsData] = await Promise.all([
    fetchItems(keyword),
    // aspect refinements are best-effort — a failure here shouldn't sink
    // the price/seller data the items call already secured
    fetchAspects(keyword).catch(() => ({ refinement: undefined }) as RefinementResponse),
  ]);

  const items = itemsData.itemSummaries ?? [];
  const prices = items
    .map((i) => Number(i.price?.value))
    .filter((p) => Number.isFinite(p) && p > 0);

  const sellersWithFeedback = items.filter(
    (i) => typeof i.seller?.feedbackScore === "number",
  );
  const newSellerCount = sellersWithFeedback.filter(
    (i) => (i.seller!.feedbackScore as number) <= NEW_SELLER_FEEDBACK_CAP,
  ).length;

  const raw: RawKeywordData = {
    keyword,
    provenance: "LIVE",
    activeCount: itemsData.total ?? items.length,
    prices,
    topAspects: parseTopAspects(aspectsData.refinement?.aspectDistributions),
    newSellerCount,
    sampledSellerCount: sellersWithFeedback.length,
    fetchedAt: new Date().toISOString(),
  };
  return buildKeywordSignal(raw);
}
