import { describe, expect, it } from "vitest";
import {
  annotateRisk,
  applyPipeline,
  riskFlagsFor,
  sortItems,
  toCsv,
} from "@/lib/scout/filters";
import type { ScoutItem, ScoutQuery } from "@/lib/scout/types";

function item(over: Partial<ScoutItem> & { itemId: string }): ScoutItem {
  return {
    title: "Generic Item",
    price: 20,
    currency: "USD",
    seller: { username: "seller1", feedbackScore: 500, feedbackPct: 99 },
    itemLocation: "US",
    condition: "NEW",
    itemWebUrl: "https://ebay.com/itm/1",
    soldDate: null,
    riskFlags: [],
    ...over,
  };
}

const baseQuery: ScoutQuery = {
  keyword: "oven glove",
  matchMode: "relevance",
  soldWindowDays: 90,
  maxSellerFeedback: null,
  removeHighRisk: false,
  sort: "price_asc",
};

describe("riskFlagsFor — disclosed heuristic", () => {
  it("flags items priced far below the set median", () => {
    const flags = riskFlagsFor(item({ itemId: "a", price: 2 }), 20);
    expect(flags.some((f) => f.includes("below the result median"))).toBe(true);
  });

  it("does not flag a normally-priced item", () => {
    expect(riskFlagsFor(item({ itemId: "a", price: 19 }), 20)).toEqual([]);
  });

  it("flags sellers under 90% positive feedback", () => {
    const flags = riskFlagsFor(
      item({
        itemId: "a",
        seller: { username: "s", feedbackScore: 100, feedbackPct: 82 },
      }),
      20,
    );
    expect(flags).toContain("seller feedback 82% positive");
  });

  it("flags replica / fake / broken / box-only titles", () => {
    const cases: [string, string][] = [
      ["Rolex REPLICA watch", "title says replica"],
      ["Nike shoes fake sample", "title says fake/knock-off"],
      ["iPhone for parts not working", "sold as broken/for parts"],
      ["PS5 empty box only", "box/photo only — not the item"],
    ];
    for (const [title, expected] of cases) {
      expect(riskFlagsFor(item({ itemId: "a", title }), 20)).toContain(expected);
    }
  });

  it("returns no flags when the median is unknown (zero)", () => {
    expect(riskFlagsFor(item({ itemId: "a", price: 1 }), 0)).toEqual([]);
  });
});

describe("annotateRisk", () => {
  it("computes the median from the set itself", () => {
    const annotated = annotateRisk([
      item({ itemId: "a", price: 100 }),
      item({ itemId: "b", price: 100 }),
      item({ itemId: "c", price: 100 }),
      item({ itemId: "d", price: 5 }), // way below median 100
    ]);
    expect(annotated.find((i) => i.itemId === "d")!.riskFlags.length).toBe(1);
    expect(annotated.find((i) => i.itemId === "a")!.riskFlags).toEqual([]);
  });
});

describe("sortItems", () => {
  const items = [
    item({ itemId: "a", price: 30, soldDate: "2026-01-01", seller: { username: "a", feedbackScore: 900, feedbackPct: 99 } }),
    item({ itemId: "b", price: 10, soldDate: "2026-03-01", seller: { username: "b", feedbackScore: 12, feedbackPct: 100 } }),
    item({ itemId: "c", price: 20, soldDate: "2026-02-01", seller: { username: "c", feedbackScore: 300, feedbackPct: 98 } }),
  ];

  it("sorts price ascending and descending", () => {
    expect(sortItems(items, "price_asc").map((i) => i.itemId)).toEqual(["b", "c", "a"]);
    expect(sortItems(items, "price_desc").map((i) => i.itemId)).toEqual(["a", "c", "b"]);
  });

  it("sorts most recently sold first", () => {
    expect(sortItems(items, "recent").map((i) => i.itemId)).toEqual(["b", "c", "a"]);
  });

  it("sorts lowest seller feedback first — the new-seller strategy", () => {
    expect(sortItems(items, "feedback_asc").map((i) => i.itemId)).toEqual(["b", "c", "a"]);
  });

  it("sinks items with no sold date to the bottom of a recency sort", () => {
    const mixed = [...items, item({ itemId: "z", soldDate: null })];
    expect(sortItems(mixed, "recent").at(-1)!.itemId).toBe("z");
  });
});

describe("applyPipeline — audit trail", () => {
  const raw = [
    item({ itemId: "new-seller", price: 25, seller: { username: "fresh", feedbackScore: 8, feedbackPct: 100 } }),
    item({ itemId: "big-seller", price: 26, seller: { username: "power", feedbackScore: 5000, feedbackPct: 99 } }),
    item({ itemId: "risky", price: 2, seller: { username: "sketch", feedbackScore: 4, feedbackPct: 70 } }),
    item({ itemId: "unknown-fb", price: 24, seller: { username: "ghost", feedbackScore: null, feedbackPct: null } }),
  ];

  it("keeps only low-feedback sellers when the cap is set", () => {
    const { items, pipeline } = applyPipeline(raw, {
      ...baseQuery,
      maxSellerFeedback: 100,
    });
    const ids = items.map((i) => i.itemId);
    expect(ids).toContain("new-seller");
    expect(ids).toContain("risky");
    expect(ids).not.toContain("big-seller");
    // unknown feedback is dropped rather than assumed — stated in the rule
    expect(ids).not.toContain("unknown-fb");
    const step = pipeline.find((p) => p.step === "New-seller filter")!;
    expect(step.removed).toBe(2);
    expect(step.rule).toContain("≤ 100");
  });

  it("removes high-risk items only when asked", () => {
    const off = applyPipeline(raw, { ...baseQuery, removeHighRisk: false });
    expect(off.items.map((i) => i.itemId)).toContain("risky");

    const on = applyPipeline(raw, { ...baseQuery, removeHighRisk: true });
    expect(on.items.map((i) => i.itemId)).not.toContain("risky");
    const step = on.pipeline.find((p) => p.step === "High-risk removal")!;
    expect(step.removed).toBeGreaterThan(0);
    expect(step.rule).toContain("replica");
  });

  it("applies the price range and records it", () => {
    const { items, pipeline } = applyPipeline(raw, {
      ...baseQuery,
      minPrice: 20,
      maxPrice: 30,
    });
    expect(items.every((i) => i.price >= 20 && i.price <= 30)).toBe(true);
    expect(pipeline.find((p) => p.step === "Price range")!.removed).toBe(1);
  });

  it("records remaining counts so the UI can show the funnel", () => {
    const { items, pipeline } = applyPipeline(raw, {
      ...baseQuery,
      maxSellerFeedback: 100,
      removeHighRisk: true,
    });
    expect(pipeline.at(-1)!.remaining).toBe(items.length);
    for (const step of pipeline) {
      expect(step.rule.length).toBeGreaterThan(10);
    }
  });

  it("produces an empty pipeline when no optional filters are on", () => {
    const { items, pipeline } = applyPipeline(raw, baseQuery);
    expect(items).toHaveLength(raw.length);
    expect(pipeline).toHaveLength(0);
  });

  it("enforces exact-phrase matching on titles when asked", () => {
    const titled = [
      item({ itemId: "hit", title: "Tupperware Silicone Oven Glove 1pc" }),
      item({ itemId: "miss", title: "Generic Kitchen Mitt" }),
    ];
    const relevance = applyPipeline(titled, {
      ...baseQuery,
      keyword: "silicone oven glove",
      matchMode: "relevance",
    });
    expect(relevance.items).toHaveLength(2);

    const exact = applyPipeline(titled, {
      ...baseQuery,
      keyword: "silicone oven glove",
      matchMode: "exact",
    });
    expect(exact.items.map((i) => i.itemId)).toEqual(["hit"]);
    expect(exact.pipeline[0].rule).toContain("no native exact-phrase");
  });
});

describe("toCsv", () => {
  it("emits a header and one row per item", () => {
    const csv = toCsv([item({ itemId: "a", title: "Thing", price: 12.5 })]);
    const lines = csv.split("\n");
    expect(lines[0]).toContain("Item,Price USD,Seller");
    expect(lines).toHaveLength(2);
    expect(lines[1]).toContain("12.50");
  });

  it("escapes quotes and commas in titles", () => {
    const csv = toCsv([item({ itemId: "a", title: 'Lego "Set", 500pc' })]);
    expect(csv).toContain('"Lego ""Set"", 500pc"');
  });

  it("joins multiple risk flags into one cell", () => {
    const csv = toCsv([
      item({ itemId: "a", riskFlags: ["flag one", "flag two"] }),
    ]);
    expect(csv).toContain('"flag one; flag two"');
  });
});
