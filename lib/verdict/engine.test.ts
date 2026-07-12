import { describe, expect, it } from "vitest";
import {
  computeConfidence,
  evaluateVerdict,
  LOW_SAMPLE_CAP,
} from "@/lib/verdict/engine";
import type { RuleInput } from "@/lib/verdict/rules";

const healthy: RuleInput = {
  roi: 0.45,
  netProfit: 56.57,
  sellThroughRate: 0.66,
  daysToFlip: 14,
  decaySlope: 0.01,
};

describe("evaluateVerdict — ordered rules, first match wins", () => {
  it("R1: negative margin beats everything, even great demand", () => {
    const r = evaluateVerdict({ ...healthy, netProfit: -5, roi: -0.03 });
    expect(r.ruleId).toBe("R1_NEGATIVE_MARGIN");
    expect(r.verdict).toBe("PASS — NEGATIVE MARGIN");
  });

  it("R1: zero profit is still a pass", () => {
    const r = evaluateVerdict({ ...healthy, netProfit: 0, roi: 0 });
    expect(r.ruleId).toBe("R1_NEGATIVE_MARGIN");
  });

  it("R2: dead stock — low sell-through and a deep queue", () => {
    const r = evaluateVerdict({
      roi: 0.5,
      netProfit: 10,
      sellThroughRate: 0.1,
      daysToFlip: 100,
      decaySlope: null,
    });
    expect(r.ruleId).toBe("R2_DEAD_STOCK");
    expect(r.verdict).toBe("PASS — DEAD STOCK RISK");
  });

  it("R3: steep price decay with a slow flip is a pass", () => {
    const r = evaluateVerdict({
      roi: 0.3,
      netProfit: 12,
      sellThroughRate: 0.5,
      daysToFlip: 40,
      decaySlope: -0.2,
    });
    expect(r.ruleId).toBe("R3_PRICE_DECAY");
  });

  it("R4: strong buy on high roi + high sell-through + fast flip", () => {
    const r = evaluateVerdict(healthy);
    expect(r.ruleId).toBe("R4_STRONG_BUY");
    expect(r.verdict).toBe("STRONG BUY");
  });

  it("R5: buy when roi and sell-through clear the bar but flip is slower", () => {
    const r = evaluateVerdict({ ...healthy, roi: 0.3, daysToFlip: 35 });
    expect(r.ruleId).toBe("R5_BUY");
  });

  it("R6: short flip — decent roi but decaying price", () => {
    const r = evaluateVerdict({
      roi: 0.22,
      netProfit: 8,
      sellThroughRate: 0.3,
      daysToFlip: 25,
      decaySlope: -0.1,
    });
    expect(r.ruleId).toBe("R6_SHORT_FLIP");
    expect(r.verdict).toBe("CAUTION — SHORT FLIP");
  });

  it("R7: catch-all thin margin", () => {
    const r = evaluateVerdict({
      roi: 0.1,
      netProfit: 3,
      sellThroughRate: 0.3,
      daysToFlip: 50,
      decaySlope: null,
    });
    expect(r.ruleId).toBe("R7_THIN_MARGIN");
  });

  it("never fires demand rules on missing (null) sold data", () => {
    // great roi but STR unknown — R2/R4/R5 must not fire
    const r = evaluateVerdict({
      roi: 0.5,
      netProfit: 40,
      sellThroughRate: null,
      daysToFlip: null,
      decaySlope: null,
    });
    expect(r.ruleId).toBe("R7_THIN_MARGIN");
  });

  it("exposes the exact inputs behind the verdict for the Why? disclosure", () => {
    const r = evaluateVerdict(healthy);
    expect(r.inputs).toEqual(healthy);
    expect(r.reason.length).toBeGreaterThan(0);
  });
});

describe("computeConfidence — data quality, not enthusiasm", () => {
  it("caps confidence at 40% under 5 sold comps and flags LOW SAMPLE", () => {
    const c = computeConfidence({ soldCount: 3, soldPrices: [10, 11, 12] });
    expect(c.lowSample).toBe(true);
    expect(c.confidence).toBeLessThanOrEqual(LOW_SAMPLE_CAP);
  });

  it("scores fresh, deep, tight-priced samples high", () => {
    const c = computeConfidence({
      soldCount: 40,
      soldPrices: Array.from({ length: 40 }, () => 100),
      dataAgeDays: 0,
      titleMatchQuality: 1,
    });
    expect(c.lowSample).toBe(false);
    expect(c.confidence).toBeGreaterThanOrEqual(90);
  });

  it("penalizes wide price variance", () => {
    const tight = computeConfidence({
      soldCount: 30,
      soldPrices: Array.from({ length: 30 }, (_, i) => 100 + (i % 3)),
    });
    const wide = computeConfidence({
      soldCount: 30,
      soldPrices: Array.from({ length: 30 }, (_, i) => 10 + i * 20),
    });
    expect(wide.confidence).toBeLessThan(tight.confidence);
  });

  it("penalizes stale data", () => {
    const fresh = computeConfidence({
      soldCount: 30,
      soldPrices: Array.from({ length: 30 }, () => 100),
      dataAgeDays: 0,
    });
    const stale = computeConfidence({
      soldCount: 30,
      soldPrices: Array.from({ length: 30 }, () => 100),
      dataAgeDays: 7,
    });
    expect(stale.confidence).toBeLessThan(fresh.confidence);
  });

  it("treats missing sold data as the lowest-quality sample", () => {
    const c = computeConfidence({ soldCount: null, soldPrices: null });
    expect(c.lowSample).toBe(true);
    expect(c.confidence).toBeLessThanOrEqual(LOW_SAMPLE_CAP);
  });
});
