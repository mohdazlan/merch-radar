import { median } from "@/lib/stats";
import type {
  FilterStep,
  ScoutItem,
  ScoutQuery,
  ScoutSort,
} from "@/lib/scout/types";

/**
 * Post-fetch filters, pure and unit-tested (Rule 1).
 *
 * These run *after* the eBay call because the Browse API has no native
 * seller-feedback filter — feedback only arrives on each item summary. Every
 * filter reports what it removed so the UI can show an audit trail instead of
 * silently shrinking the result set (Rule 3).
 */

/** price this far below the set median reads as counterfeit/scam bait */
export const RISK_PRICE_FLOOR_RATIO = 0.3;
/** below this positive-feedback percentage, the seller is a buyer risk */
export const RISK_FEEDBACK_PCT_FLOOR = 90;

const RISK_TITLE_PATTERNS: { pattern: RegExp; flag: string }[] = [
  { pattern: /\b(replica|repro|reproduction)\b/i, flag: "title says replica" },
  { pattern: /\b(fake|knock[- ]?off)\b/i, flag: "title says fake/knock-off" },
  { pattern: /\b(not authentic|unauthentic)\b/i, flag: "title says not authentic" },
  { pattern: /\b(for parts|not working|broken)\b/i, flag: "sold as broken/for parts" },
  { pattern: /\b(empty box|box only|photo only|picture only)\b/i, flag: "box/photo only — not the item" },
];

/**
 * Disclosed high-risk heuristic. Returns the flags for one item; an empty
 * array means nothing tripped. The thresholds are exported so the UI can
 * state them verbatim rather than describing them vaguely.
 */
export function riskFlagsFor(
  item: ScoutItem,
  setMedianPrice: number,
): string[] {
  const flags: string[] = [];

  if (
    setMedianPrice > 0 &&
    item.price > 0 &&
    item.price < setMedianPrice * RISK_PRICE_FLOOR_RATIO
  ) {
    flags.push(
      `priced ${Math.round((1 - item.price / setMedianPrice) * 100)}% below the result median`,
    );
  }
  if (
    item.seller.feedbackPct !== null &&
    item.seller.feedbackPct < RISK_FEEDBACK_PCT_FLOOR
  ) {
    flags.push(`seller feedback ${item.seller.feedbackPct}% positive`);
  }
  for (const { pattern, flag } of RISK_TITLE_PATTERNS) {
    if (pattern.test(item.title)) flags.push(flag);
  }
  return flags;
}

/** annotate every item with its risk flags, using the set's own median */
export function annotateRisk(items: ScoutItem[]): ScoutItem[] {
  const prices = items.map((i) => i.price).filter((p) => p > 0);
  const setMedian = prices.length > 0 ? median(prices) : 0;
  return items.map((i) => ({ ...i, riskFlags: riskFlagsFor(i, setMedian) }));
}

export function sortItems(items: ScoutItem[], sort: ScoutSort): ScoutItem[] {
  const out = [...items];
  switch (sort) {
    case "price_asc":
      return out.sort((a, b) => a.price - b.price);
    case "price_desc":
      return out.sort((a, b) => b.price - a.price);
    case "recent":
      // newest sold first; items without a date sink to the bottom
      return out.sort((a, b) => {
        if (!a.soldDate && !b.soldDate) return 0;
        if (!a.soldDate) return 1;
        if (!b.soldDate) return -1;
        return b.soldDate.localeCompare(a.soldDate);
      });
    case "feedback_asc":
      // newest sellers first — the whole point of the strategy
      return out.sort((a, b) => {
        const av = a.seller.feedbackScore ?? Number.POSITIVE_INFINITY;
        const bv = b.seller.feedbackScore ?? Number.POSITIVE_INFINITY;
        return av - bv;
      });
    default:
      return out;
  }
}

/**
 * Run the post-fetch half of the pipeline. Returns the surviving items plus
 * a step-by-step record of what each filter removed.
 */
export function applyPipeline(
  raw: ScoutItem[],
  query: ScoutQuery,
): { items: ScoutItem[]; pipeline: FilterStep[] } {
  const pipeline: FilterStep[] = [];
  let items = annotateRisk(raw);

  const record = (step: string, rule: string, before: number) => {
    pipeline.push({
      step,
      rule,
      removed: before - items.length,
      remaining: items.length,
    });
  };

  // eBay's Browse API has no exact-phrase operator, so "exact match" is
  // enforced here on the title — disclosed rather than implied
  if (query.matchMode === "exact" && query.keyword.trim()) {
    const before = items.length;
    const phrase = query.keyword.trim().toLowerCase();
    items = items.filter((i) => i.title.toLowerCase().includes(phrase));
    record(
      "Exact match",
      `keep titles containing the exact phrase “${query.keyword.trim()}” (eBay has no native exact-phrase search, so this is applied to results)`,
      before,
    );
  }

  // price range — eBay filters server-side too, but re-check defensively
  // because currency conversion can let edge values slip through
  if (query.minPrice !== undefined || query.maxPrice !== undefined) {
    const before = items.length;
    const lo = query.minPrice ?? Number.NEGATIVE_INFINITY;
    const hi = query.maxPrice ?? Number.POSITIVE_INFINITY;
    items = items.filter((i) => i.price >= lo && i.price <= hi);
    record(
      "Price range",
      `keep ${query.minPrice ?? "any"}–${query.maxPrice ?? "any"} USD`,
      before,
    );
  }

  if (query.maxSellerFeedback !== null) {
    const before = items.length;
    const cap = query.maxSellerFeedback;
    items = items.filter(
      (i) => i.seller.feedbackScore !== null && i.seller.feedbackScore <= cap,
    );
    record(
      "New-seller filter",
      `keep sellers with feedback score ≤ ${cap} (sellers with unknown feedback are dropped)`,
      before,
    );
  }

  if (query.removeHighRisk) {
    const before = items.length;
    items = items.filter((i) => i.riskFlags.length === 0);
    record(
      "High-risk removal",
      `drop items priced under ${Math.round(RISK_PRICE_FLOOR_RATIO * 100)}% of the result median, sellers under ${RISK_FEEDBACK_PCT_FLOOR}% positive, or titles naming replica/fake/broken/box-only`,
      before,
    );
  }

  items = sortItems(items, query.sort);
  return { items, pipeline };
}

/** CSV export — the flowchart's "want print/pdf?" branch, in a usable format */
export function toCsv(items: ScoutItem[]): string {
  const header = [
    "Item",
    "Price USD",
    "Seller",
    "Seller feedback",
    "Feedback %",
    "Location",
    "Condition",
    "Sold date",
    "Risk flags",
    "URL",
  ].join(",");
  const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
  const rows = items.map((i) =>
    [
      esc(i.title),
      i.price.toFixed(2),
      esc(i.seller.username),
      i.seller.feedbackScore ?? "",
      i.seller.feedbackPct ?? "",
      esc(i.itemLocation ?? ""),
      esc(i.condition ?? ""),
      i.soldDate ? i.soldDate.slice(0, 10) : "",
      esc(i.riskFlags.join("; ")),
      esc(i.itemWebUrl ?? ""),
    ].join(","),
  );
  return [header, ...rows].join("\n");
}
