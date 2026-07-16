import { describe, expect, it } from "vitest";
import {
  cleanMoney,
  dedupeRows,
  mapRows,
  parseManifest,
} from "@/lib/manifest/parse";

describe("cleanMoney", () => {
  it("strips currency symbols and thousands separators", () => {
    expect(cleanMoney("$1,299.99")).toBe(1299.99);
    expect(cleanMoney("£45")).toBe(45);
    expect(cleanMoney(" 12.50 ")).toBe(12.5);
  });
  it("handles European decimal commas", () => {
    expect(cleanMoney("1.299,99")).toBe(1299.99);
    expect(cleanMoney("45,50")).toBe(45.5);
  });
  it("treats a lone comma with 3 digits as thousands", () => {
    expect(cleanMoney("1,299")).toBe(1299);
  });
  it("returns NaN for hopeless input", () => {
    expect(cleanMoney("n/a")).toBeNaN();
    expect(cleanMoney("")).toBeNaN();
  });
});

describe("parseManifest", () => {
  it("detects headers and maps the spec's column names", () => {
    const p = parseManifest(
      "Item Name,Qty,Unit Buy Cost\nWidget A,3,$4.50\nWidget B,1,9.99",
    );
    expect(p.hasHeader).toBe(true);
    expect(p.guess).toEqual({ item: 0, qty: 1, unitCost: 2 });
    expect(p.rows).toHaveLength(2);
  });

  it("detects TSV", () => {
    const p = parseManifest("Title\tCount\tCost\nThing\t2\t5.00");
    expect(p.delimiter).toBe("\t");
    expect(p.guess.item).toBe(0);
  });

  it("handles quoted fields with embedded delimiters", () => {
    const p = parseManifest('Item Name,Qty,Cost\n"Lego Set, 500 pieces",1,25.00');
    expect(p.rows[0][0]).toBe("Lego Set, 500 pieces");
  });

  it("guesses columns on headerless data", () => {
    const p = parseManifest("Nintendo Switch,2,150.00\nAirPods Pro,1,89.99");
    expect(p.hasHeader).toBe(false);
    expect(p.guess.item).toBe(0);
    expect(p.guess.unitCost).toBe(2);
  });
});

describe("mapRows", () => {
  const mapping = { item: 0, qty: 1, unitCost: 2 };
  it("reports malformed rows instead of throwing", () => {
    const rows = mapRows(
      [
        ["Good item", "2", "$5.00"],
        ["", "1", "3.00"],
        ["No cost item", "1", "n/a"],
        ["Bad qty", "zero", "4.00"],
      ],
      mapping,
      true,
    );
    expect(rows[0].error).toBeNull();
    expect(rows[1].error).toBe("missing item name");
    expect(rows[2].error).toBe("invalid unit cost");
    expect(rows[3].error).toBe("invalid quantity");
  });

  it("defaults missing qty to 1", () => {
    const rows = mapRows([["Item", "", "2.00"]], mapping, true);
    expect(rows[0].qty).toBe(1);
    expect(rows[0].error).toBeNull();
  });
});

describe("dedupeRows", () => {
  it("collapses identical titles summing qty with weighted cost", () => {
    const deduped = dedupeRows(
      mapRows(
        [
          ["Widget", "2", "10.00"],
          ["  widget ", "2", "20.00"],
          ["Other", "1", "5.00"],
        ],
        { item: 0, qty: 1, unitCost: 2 },
        true,
      ),
    );
    expect(deduped).toHaveLength(2);
    const widget = deduped.find((d) => d.normalized === "widget")!;
    expect(widget.qty).toBe(4);
    expect(widget.unitCost).toBe(15);
    expect(widget.sourceLines).toEqual([2, 3]);
  });

  it("skips errored rows", () => {
    const deduped = dedupeRows(
      mapRows([["", "1", "1.00"]], { item: 0, qty: 1, unitCost: 2 }, true),
    );
    expect(deduped).toHaveLength(0);
  });
});
