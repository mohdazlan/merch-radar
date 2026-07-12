import { describe, expect, it } from "vitest";
import { computeFees } from "@/lib/fees/engine";
import { FEE_PRESETS } from "@/lib/fees/presets";

describe("computeFees", () => {
  it("computes the eBay waterfall reproducibly by hand", () => {
    // $100 sale: 13.25% FVF = $13.25, per-order fixed $0.30 → $13.55
    const fees = computeFees(100, FEE_PRESETS.ebay);
    expect(fees.lineItems.find((i) => i.id === "final-value")?.amount).toBe(
      13.25,
    );
    expect(fees.lineItems.find((i) => i.id === "per-order")?.amount).toBe(0.3);
    expect(fees.totalFees).toBe(13.55);
  });

  it("line items always sum exactly to totalFees", () => {
    for (const preset of Object.values(FEE_PRESETS)) {
      const fees = computeFees(87.64, preset, { promotedListingPct: 0.03 });
      const sum =
        Math.round(fees.lineItems.reduce((a, i) => a + i.amount, 0) * 100) /
        100;
      expect(fees.totalFees).toBe(sum);
    }
  });

  it("applies category overrides over the default FVF", () => {
    const fees = computeFees(200, FEE_PRESETS.ebay, {
      category: "sneakers-over-150",
    });
    // 8% of 200 = $16, not 13.25% = $26.50
    expect(fees.lineItems.find((i) => i.id === "final-value")?.amount).toBe(16);
  });

  it("falls back to the default FVF for unknown categories", () => {
    const fees = computeFees(100, FEE_PRESETS.ebay, { category: "nonsense" });
    expect(fees.lineItems.find((i) => i.id === "final-value")?.amount).toBe(
      13.25,
    );
  });

  it("adds promoted listing fees only when a rate is set", () => {
    const withoutAds = computeFees(100, FEE_PRESETS.ebay);
    const withAds = computeFees(100, FEE_PRESETS.ebay, {
      promotedListingPct: 0.05,
    });
    expect(withoutAds.lineItems.find((i) => i.id === "promoted")).toBeUndefined();
    expect(withAds.lineItems.find((i) => i.id === "promoted")?.amount).toBe(5);
    expect(withAds.totalFees).toBe(18.55);
  });

  it("computes Mercari's separate payment processing fee", () => {
    // $100: 10% selling = $10, payment 2.9% + $0.50 = $3.40 → $13.40
    const fees = computeFees(100, FEE_PRESETS.mercari);
    expect(fees.totalFees).toBe(13.4);
  });

  it("picks the FBA fulfillment tier by sell price", () => {
    const cheap = computeFees(8, FEE_PRESETS["amazon-fba"]);
    const mid = computeFees(20, FEE_PRESETS["amazon-fba"]);
    const high = computeFees(500, FEE_PRESETS["amazon-fba"]);
    expect(cheap.lineItems.find((i) => i.id === "fulfillment")?.amount).toBe(2.5);
    expect(mid.lineItems.find((i) => i.id === "fulfillment")?.amount).toBe(3.5);
    expect(high.lineItems.find((i) => i.id === "fulfillment")?.amount).toBe(6.5);
  });

  it("switching presets changes the total (downstream recompute)", () => {
    const ebay = computeFees(100, FEE_PRESETS.ebay);
    const fbm = computeFees(100, FEE_PRESETS["amazon-fbm"]);
    expect(ebay.totalFees).not.toBe(fbm.totalFees);
  });

  it("handles a zero sell price without producing negative fees", () => {
    const fees = computeFees(0, FEE_PRESETS.ebay);
    expect(fees.lineItems.every((i) => i.amount >= 0)).toBe(true);
    expect(fees.totalFees).toBe(0.3); // fixed fee still applies
  });

  it("clamps negative sell prices to zero", () => {
    const fees = computeFees(-50, FEE_PRESETS.ebay);
    expect(fees.sellPrice).toBe(0);
    expect(fees.lineItems.every((i) => i.amount >= 0)).toBe(true);
  });

  it("amortizes store subscription across monthly volume", () => {
    const preset = {
      ...FEE_PRESETS.custom,
      storeSubscriptionMonthly: 27.95,
    };
    const fees = computeFees(100, preset, { monthlyVolume: 100 });
    expect(fees.lineItems.find((i) => i.id === "store")?.amount).toBe(0.28);
  });
});
