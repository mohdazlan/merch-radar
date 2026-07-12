import { describe, expect, it } from "vitest";
import { fitDecay, MIN_POINTS, type SoldPoint } from "@/lib/forecast/decay";

const DAY_MS = 86_400_000;
const T0 = Date.parse("2026-04-01T00:00:00.000Z");

function point(day: number, price: number): SoldPoint {
  return { date: new Date(T0 + day * DAY_MS).toISOString(), price };
}

/** noiseless exponential series: price = base · e^(rate·day) */
function expSeries(n: number, base: number, ratePerDay: number): SoldPoint[] {
  return Array.from({ length: n }, (_, i) => {
    const day = Math.round((i * 89) / (n - 1));
    return point(day, base * Math.exp(ratePerDay * day));
  });
}

describe("fitDecay — refuses before it guesses", () => {
  it(`refuses to forecast under ${MIN_POINTS} points (the n<12 guardrail)`, () => {
    const f = fitDecay(expSeries(4, 30, 0));
    expect(f.status).toBe("INSUFFICIENT_DATA");
    if (f.status === "INSUFFICIENT_DATA") expect(f.n).toBe(4);
  });

  it("refuses at exactly n = 11 and forecasts at n = 12", () => {
    expect(fitDecay(expSeries(11, 100, 0)).status).toBe("INSUFFICIENT_DATA");
    expect(fitDecay(expSeries(12, 100, 0)).status).toBe("OK");
  });

  it("refuses a single-point series", () => {
    const f = fitDecay([point(0, 50)]);
    expect(f.status).toBe("INSUFFICIENT_DATA");
  });

  it("refuses when all observations share one day (no time axis)", () => {
    const f = fitDecay(Array.from({ length: 15 }, () => point(10, 40)));
    expect(f.status).toBe("INSUFFICIENT_DATA");
  });

  it("excludes non-positive prices and bad dates from n", () => {
    const series = [
      ...expSeries(10, 100, 0),
      point(5, 0),
      point(6, -3),
      { date: "not-a-date", price: 50 },
    ];
    const f = fitDecay(series);
    expect(f.status).toBe("INSUFFICIENT_DATA");
    if (f.status === "INSUFFICIENT_DATA") expect(f.n).toBe(10);
  });
});

describe("fitDecay — recovers known dynamics", () => {
  it("finds ~zero slope on a flat series", () => {
    const f = fitDecay(expSeries(20, 100, 0));
    if (f.status !== "OK") throw new Error("expected OK");
    expect(f.slopePer90d).toBeCloseTo(0, 6);
    expect(f.sigma).toBeCloseTo(0, 6);
  });

  it("recovers a known decay rate", () => {
    // rate −0.002/day → slopePer90d = e^(−0.18) − 1 ≈ −0.1647
    const f = fitDecay(expSeries(20, 100, -0.002));
    if (f.status !== "OK") throw new Error("expected OK");
    expect(f.slopePer90d).toBeCloseTo(Math.exp(-0.18) - 1, 3);
  });

  it("recovers growth as a positive slope", () => {
    const f = fitDecay(expSeries(20, 100, 0.001));
    if (f.status !== "OK") throw new Error("expected OK");
    expect(f.slopePer90d).toBeGreaterThan(0);
  });

  it("projects 30/60/90 days out with a band around the line", () => {
    const f = fitDecay(expSeries(24, 50, -0.001));
    if (f.status !== "OK") throw new Error("expected OK");
    expect(f.projections).toHaveLength(3);
    const [p30, p60, p90] = f.projections;
    expect(p30.day).toBe(89 + 30);
    expect(p60.day).toBe(89 + 60);
    expect(p90.day).toBe(89 + 90);
    for (const p of f.projections) {
      expect(p.lower).toBeLessThanOrEqual(p.price);
      expect(p.upper).toBeGreaterThanOrEqual(p.price);
    }
    // decaying: later projections are cheaper
    expect(p90.price).toBeLessThan(p30.price);
  });

  it("widens the band when the data is noisier", () => {
    const clean = fitDecay(expSeries(20, 100, -0.001));
    const noisy = fitDecay(
      expSeries(20, 100, -0.001).map((p, i) => ({
        ...p,
        price: p.price + (i % 2 === 0 ? 15 : -15),
      })),
    );
    if (clean.status !== "OK" || noisy.status !== "OK") throw new Error();
    expect(noisy.sigma).toBeGreaterThan(clean.sigma);
  });
});
