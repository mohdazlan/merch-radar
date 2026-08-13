import { describe, expect, it } from "vitest";
import { evaluateHdlr } from "@/lib/hdlr/evaluate";
import type { ScoutResult } from "@/lib/scout/types";

const sold: ScoutResult = {
  mode: "SOLD",
  provenance: "DEMO",
  soldDataAvailable: true,
  totalMatched: 8,
  fetchedAt: "2026-08-13T00:00:00.000Z",
  pipeline: [],
  items: [
    { itemId: "1", title: "Generic glove", price: 12, currency: "USD", seller: { username: "new-a", feedbackScore: 12, feedbackPct: 100 }, itemLocation: "MY", condition: "NEW", itemWebUrl: null, soldDate: "2026-08-12", riskFlags: [] },
    { itemId: "2", title: "Generic glove", price: 14, currency: "USD", seller: { username: "new-b", feedbackScore: 20, feedbackPct: 99 }, itemLocation: "MY", condition: "NEW", itemWebUrl: null, soldDate: "2026-08-11", riskFlags: [] },
    { itemId: "3", title: "Generic glove", price: 16, currency: "USD", seller: { username: "seller-c", feedbackScore: 500, feedbackPct: 99 }, itemLocation: "US", condition: "NEW", itemWebUrl: null, soldDate: "2026-08-10", riskFlags: [] },
  ],
};

describe("evaluateHdlr", () => {
  it("qualifies only when every disclosed gate has evidence", () => {
    const out = evaluateHdlr(sold, {
      soldWindowDays: 30,
      veroReviewed: true,
      supplierName: "Local wholesaler",
      supplierUnitCost: 3.5,
    });
    expect(out.verdict).toBe("QUALIFIED");
    expect(out.monthlySales).toBe(8);
    expect(out.gates.every((gate) => gate.status === "PASS")).toBe(true);
  });

  it("refuses to treat active listings as demand evidence", () => {
    const out = evaluateHdlr(
      { ...sold, mode: "ACTIVE", soldDataAvailable: false },
      { soldWindowDays: 30, veroReviewed: true, supplierName: "Supplier", supplierUnitCost: 2 },
    );
    expect(out.verdict).toBe("NEEDS EVIDENCE");
    expect(out.gates.find((gate) => gate.id === "demand")?.status).toBe("UNVERIFIED");
  });

  it("rejects evidence below the academy's demand threshold", () => {
    const out = evaluateHdlr(
      { ...sold, totalMatched: 3 },
      { soldWindowDays: 30, veroReviewed: true, supplierName: "Supplier", supplierUnitCost: 2 },
    );
    expect(out.verdict).toBe("REJECT");
  });
});
