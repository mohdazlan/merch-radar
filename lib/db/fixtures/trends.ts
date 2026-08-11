import { buildKeywordSignal, type RawKeywordData } from "@/lib/trends/analyze";
import type { AspectValue, KeywordSignal } from "@/lib/trends/types";

/**
 * Deterministic demo keyword signals — value derives from a hash of the
 * keyword itself (same pattern as lib/sentiment/SentimentSource.ts), so a
 * given keyword always demos the same way, and different keywords span the
 * full range of reads (thin/healthy/saturated) rather than all looking alike.
 */

const ASPECT_POOL: { name: string; values: string[] }[] = [
  { name: "Brand", values: ["Tupperware", "OXO", "Generic", "Rubbermaid", "IKEA"] },
  { name: "Color", values: ["Black", "White", "Red", "Blue", "Clear"] },
  { name: "Material", values: ["Silicone", "Stainless Steel", "Plastic", "Bamboo", "Glass"] },
];

function hashKeyword(keyword: string): number {
  let h = 0;
  for (const c of keyword.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 100_000;
  return h;
}

export function fixtureKeywordSignal(keyword: string): KeywordSignal {
  const h = hashKeyword(keyword);

  // spread active counts across NONE/THIN/HEALTHY/SATURATED bands
  const band = h % 4;
  const activeCount =
    band === 0 ? 0 : band === 1 ? 2 + (h % 3) : band === 2 ? 8 + (h % 30) : 45 + (h % 200);

  const basePrice = 8 + (h % 60);
  const spread = 3 + (h % 12);
  const prices = Array.from({ length: Math.min(Math.max(activeCount, 3), 40) }, (_, i) =>
    Math.max(1, Math.round((basePrice + Math.sin(i * 1.7 + h) * spread) * 100) / 100),
  );

  const sampledSellerCount = Math.min(activeCount, 40);
  // saturated niches skew toward established sellers; healthy/thin skew newer
  const newSellerRatio = band === 3 ? 0.05 + ((h % 30) / 100) : 0.15 + ((h % 40) / 100);
  const newSellerCount = Math.round(sampledSellerCount * Math.min(newSellerRatio, 0.9));

  const topAspects: AspectValue[] = activeCount > 0
    ? ASPECT_POOL.flatMap((group, gi) =>
        group.values
          .map((value, vi) => ({
            name: group.name,
            value,
            matchCount: Math.max(
              1,
              Math.round((activeCount / (vi + 1)) * (0.9 - gi * 0.15)),
            ),
          }))
          .sort((a, b) => b.matchCount - a.matchCount)
          .slice(0, 3),
      )
    : [];

  const raw: RawKeywordData = {
    keyword,
    provenance: "DEMO",
    activeCount,
    prices,
    topAspects,
    newSellerCount,
    sampledSellerCount,
    fetchedAt: new Date().toISOString(),
  };
  return buildKeywordSignal(raw);
}
