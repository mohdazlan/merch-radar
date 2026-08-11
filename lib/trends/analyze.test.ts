import { describe, expect, it } from "vitest";
import {
  buildKeywordSignal,
  NEWCOMER_BREAKTHROUGH_PCT,
  readKeywordSignal,
  type RawKeywordData,
} from "@/lib/trends/analyze";

function raw(over: Partial<RawKeywordData> = {}): RawKeywordData {
  return {
    keyword: "silicone oven glove",
    provenance: "LIVE",
    activeCount: 12,
    prices: [10, 12, 14, 11, 13],
    topAspects: [{ name: "Brand", value: "Tupperware", matchCount: 5 }],
    newSellerCount: 3,
    sampledSellerCount: 10,
    fetchedAt: "2026-09-01T00:00:00.000Z",
    ...over,
  };
}

describe("buildKeywordSignal", () => {
  it("computes price stats from the trimmed price array", () => {
    const s = buildKeywordSignal(raw({ prices: [10, 11, 12, 13, 14] }));
    expect(s.priceStats).not.toBeNull();
    expect(s.priceStats!.median).toBe(12);
  });

  it("returns null price stats when there are no prices", () => {
    const s = buildKeywordSignal(raw({ prices: [] }));
    expect(s.priceStats).toBeNull();
  });

  it("classifies competition pressure from active count", () => {
    expect(buildKeywordSignal(raw({ activeCount: 0 })).competitionPressure).toBe("NONE");
    expect(buildKeywordSignal(raw({ activeCount: 2 })).competitionPressure).toBe("THIN");
    expect(buildKeywordSignal(raw({ activeCount: 20 })).competitionPressure).toBe("HEALTHY");
    expect(buildKeywordSignal(raw({ activeCount: 100 })).competitionPressure).toBe("SATURATED");
  });

  it("computes new-seller percentage from the sampled sellers", () => {
    const s = buildKeywordSignal(raw({ newSellerCount: 5, sampledSellerCount: 20 }));
    expect(s.newSellerPct).toBe(25);
  });

  it("returns null new-seller percentage when no sellers were sampled", () => {
    const s = buildKeywordSignal(raw({ newSellerCount: 0, sampledSellerCount: 0 }));
    expect(s.newSellerPct).toBeNull();
  });

  it("defaults degraded to false — the route sets it explicitly on fallback", () => {
    expect(buildKeywordSignal(raw()).degraded).toBe(false);
  });

  it("passes topAspects through unchanged — never invents an aspect", () => {
    const aspects = [{ name: "Color", value: "Red", matchCount: 9 }];
    expect(buildKeywordSignal(raw({ topAspects: aspects })).topAspects).toEqual(aspects);
  });
});

describe("readKeywordSignal — disclosed, rule-based, never a mystery score", () => {
  it("flags zero active listings honestly", () => {
    const r = readKeywordSignal(buildKeywordSignal(raw({ activeCount: 0, prices: [] })));
    expect(r.headline).toMatch(/no active listings/i);
  });

  it("labels a thin market as unvalidated, not 'good' or 'bad'", () => {
    const r = readKeywordSignal(buildKeywordSignal(raw({ activeCount: 2 })));
    expect(r.headline).toMatch(/thin market/i);
    expect(r.detail).toMatch(/unvalidated/i);
  });

  it("labels a healthy market as validated demand with room to enter", () => {
    const r = readKeywordSignal(buildKeywordSignal(raw({ activeCount: 20 })));
    expect(r.headline).toMatch(/healthy market/i);
  });

  it("a saturated market with high newcomer share reads as still enterable", () => {
    const s = buildKeywordSignal(
      raw({ activeCount: 100, newSellerCount: 25, sampledSellerCount: 100 }),
    );
    expect(s.newSellerPct).toBeGreaterThanOrEqual(NEWCOMER_BREAKTHROUGH_PCT);
    const r = readKeywordSignal(s);
    expect(r.headline).toMatch(/newcomers are still getting in/i);
  });

  it("a saturated market with low newcomer share reads as dominated by incumbents", () => {
    const s = buildKeywordSignal(
      raw({ activeCount: 100, newSellerCount: 2, sampledSellerCount: 100 }),
    );
    expect(s.newSellerPct).toBeLessThan(NEWCOMER_BREAKTHROUGH_PCT);
    const r = readKeywordSignal(s);
    expect(r.headline).toMatch(/dominated by established sellers/i);
  });

  it("degrades honestly when seller feedback wasn't sampled", () => {
    const s = buildKeywordSignal(
      raw({ activeCount: 20, newSellerCount: 0, sampledSellerCount: 0 }),
    );
    const r = readKeywordSignal(s);
    expect(r.detail).toMatch(/feedback unavailable/i);
  });

  it("every read names a concrete number, not a vague adjective alone", () => {
    for (const count of [0, 3, 15, 80]) {
      const r = readKeywordSignal(buildKeywordSignal(raw({ activeCount: count })));
      expect(r.detail.length).toBeGreaterThan(15);
    }
  });
});
