import { ebayConfigured, ebayFetch } from "@/lib/ebay/auth";
import type { AspectValue } from "@/lib/trends/types";
import { buildKeywordSignal, type RawKeywordData } from "@/lib/trends/analyze";
import type { KeywordSignal } from "@/lib/trends/types";

/**
 * Live market composition for one keyword, via the Browse API's
 * ASPECT_REFINEMENTS fieldgroup — a standard, already-approved part of the
 * Browse access this app has (no extra approval, unlike Marketplace
 * Insights). Returns real counts of how many active listings carry each
 * attribute value within the keyword's dominant category.
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

type SearchResponse = {
  total?: number;
  itemSummaries?: BrowseItem[];
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

export async function fetchKeywordSignal(keyword: string): Promise<KeywordSignal> {
  if (!ebayConfigured()) throw new Error("eBay credentials not configured");

  const params = new URLSearchParams({
    q: keyword,
    limit: "200",
    // eBay's fieldgroups param REPLACES the default rather than adding to
    // it — MATCHING_ITEMS must be listed explicitly or itemSummaries (and
    // therefore price/seller data) comes back empty even though aspect
    // refinements still populate. Caught in production: priceStats and
    // newSellerPct were silently null on every live query until this fix.
    fieldgroups: "ASPECT_REFINEMENTS,MATCHING_ITEMS",
  });
  const res = await ebayFetch(`/buy/browse/v1/item_summary/search?${params}`);
  const data = (await res.json()) as SearchResponse;

  const items = data.itemSummaries ?? [];
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
    activeCount: data.total ?? items.length,
    prices,
    topAspects: parseTopAspects(data.refinement?.aspectDistributions),
    newSellerCount,
    sampledSellerCount: sellersWithFeedback.length,
    fetchedAt: new Date().toISOString(),
  };
  return buildKeywordSignal(raw);
}
