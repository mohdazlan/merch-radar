import { describe, expect, it } from "vitest";
import { computeMetrics, type MetricsInput } from "@/lib/verdict/metrics";
import { FEE_PRESETS } from "@/lib/fees/presets";

const base: MetricsInput = {
  buyCost: 150,
  shippingCost: 10,
  activeCount: 38,
  activePrices: [240, 250, 255],
  soldCount: 74,
  soldPrices: [240, 250, 260],
  decaySlope: null,
  preset: FEE_PRESETS.ebay,
};

describe("computeMetrics", () => {
  it("reproduces the margin math by hand from the waterfall", () => {
    const m = computeMetrics(base);
    if (m.status !== "OK") throw new Error("expected OK");
    // median sold = 250 → fees 13.25% = 33.13 + 0.30 = 33.43
    expect(m.estSellPrice).toBe(250);
    expect(m.estSellPriceSource).toBe("SOLD_MEDIAN");
    expect(m.fees.totalFees).toBe(33.43);
    // 250 − 33.43 − 10 = 206.57; − 150 buy = 56.57
    expect(m.netProceeds).toBe(206.57);
    expect(m.netProfit).toBe(56.57);
    // roi = 56.57 / 160
    expect(m.roi).toBeCloseTo(0.3536, 3);
    expect(m.margin).toBeCloseTo(56.57 / 250, 6);
  });

  it("computes the real Terapeak sell-through rate", () => {
    const m = computeMetrics(base);
    if (m.status !== "OK") throw new Error("expected OK");
    expect(m.sellThroughRate).toBeCloseTo(74 / 112, 6);
  });

  it("computes daysToFlip as queue depth over velocity, and profit/day", () => {
    const m = computeMetrics(base);
    if (m.status !== "OK") throw new Error("expected OK");
    const expected = (90 / 74) * 38; // ≈ 46.2
    expect(m.daysToFlip).toBeCloseTo(expected, 4);
    expect(m.capitalPerDay).toBeCloseTo(56.57 / expected, 1);
  });

  it("clamps daysToFlip to [1, 365]", () => {
    const slow = computeMetrics({ ...base, soldCount: 1, activeCount: 500 });
    const fast = computeMetrics({ ...base, soldCount: 90, activeCount: 1 });
    if (slow.status !== "OK" || fast.status !== "OK") throw new Error();
    expect(slow.daysToFlip).toBe(365);
    expect(fast.daysToFlip).toBe(1);
  });

  it("degrades honestly when sold data is UNAVAILABLE — nulls, never guesses", () => {
    const m = computeMetrics({
      ...base,
      soldCount: null,
      soldPrices: null,
    });
    if (m.status !== "OK") throw new Error("expected OK");
    expect(m.sellThroughRate).toBeNull();
    expect(m.daysToFlip).toBeNull();
    expect(m.capitalPerDay).toBeNull();
    // estSellPrice falls back to active median × 0.88: 250 × 0.88 = 220
    expect(m.estSellPrice).toBe(220);
    expect(m.estSellPriceSource).toBe("ACTIVE_DISCOUNTED");
  });

  it("returns NO_COMPS when there is nothing to price against", () => {
    const m = computeMetrics({
      ...base,
      soldCount: null,
      soldPrices: null,
      activePrices: [],
      activeCount: 0,
    });
    expect(m.status).toBe("NO_COMPS");
  });

  it("handles a single data point without crashing", () => {
    const m = computeMetrics({
      ...base,
      soldCount: 1,
      soldPrices: [42],
    });
    if (m.status !== "OK") throw new Error("expected OK");
    expect(m.estSellPrice).toBe(42);
  });

  it("recomputes everything when the fee preset switches", () => {
    const ebay = computeMetrics(base);
    const fbm = computeMetrics({ ...base, preset: FEE_PRESETS["amazon-fbm"] });
    if (ebay.status !== "OK" || fbm.status !== "OK") throw new Error();
    // FBM: 15% of 250 = 37.50, no fixed → net 250 − 37.50 − 10 − 150 = 52.50
    expect(fbm.netProfit).toBe(52.5);
    expect(fbm.netProfit).not.toBe(ebay.netProfit);
    expect(fbm.roi).not.toBe(ebay.roi);
  });

  it("produces a negative-margin result the verdict engine can catch", () => {
    const m = computeMetrics({ ...base, buyCost: 250 });
    if (m.status !== "OK") throw new Error("expected OK");
    expect(m.netProfit).toBeLessThan(0);
    expect(m.roi).toBeLessThan(0);
  });

  it("trims outliers before taking the median", () => {
    // 21 values: one absurd $10,000 outlier must not shift the median
    const prices = [...Array.from({ length: 20 }, (_, i) => 100 + i), 10000];
    const m = computeMetrics({ ...base, soldPrices: prices, soldCount: 21 });
    if (m.status !== "OK") throw new Error("expected OK");
    expect(m.estSellPrice).toBeLessThan(200);
  });
});
