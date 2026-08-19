import type { ActiveComps, SoldBrowseEstimate, SoldComps } from "@/lib/ebay/DemandSource";

/**
 * Deterministic synthetic comps for Demo Mode. Every surface rendering these
 * must show the DEMO DATA badge (Rule 2). No randomness — fixtures must be
 * stable across runs so demo numbers are reproducible.
 */

const FIXTURE_FETCHED_AT = "2026-07-10T12:00:00.000Z";
const DAY_MS = 86_400_000;

/** deterministic sold-price series: base price, per-day drift, fixed jitter */
function series(
  n: number,
  base: number,
  driftPerDay: number,
  jitter: number,
): { date: string; price: number }[] {
  const start = new Date("2026-04-11T00:00:00.000Z").getTime();
  const out: { date: string; price: number }[] = [];
  for (let i = 0; i < n; i++) {
    const day = Math.round((i * 89) / Math.max(n - 1, 1));
    // fixed pseudo-jitter from a sine — deterministic, not random
    const wobble = Math.sin(i * 2.399) * jitter;
    const price =
      Math.round((base + driftPerDay * day + wobble) * 100) / 100;
    out.push({
      date: new Date(start + day * DAY_MS).toISOString(),
      price: Math.max(price, 1),
    });
  }
  return out;
}

export type FixtureProduct = {
  /** normalized query key */
  key: string;
  title: string;
  active: ActiveComps;
  sold: SoldComps | SoldBrowseEstimate | { status: "UNAVAILABLE" };
};

function active(prices: number[]): ActiveComps {
  return {
    status: "OK",
    provenance: "DEMO",
    activeCount: prices.length,
    prices,
    fetchedAt: FIXTURE_FETCHED_AT,
  };
}

function sold(s: { date: string; price: number }[]): SoldComps {
  return {
    status: "OK",
    provenance: "DEMO",
    soldCount: s.length,
    prices: s.map((p) => p.price),
    series: s,
    fetchedAt: FIXTURE_FETCHED_AT,
  };
}

/** healthy flip: high STR, stable price */
const switchOled: FixtureProduct = {
  key: "nintendo switch oled console",
  title: "Nintendo Switch OLED Console",
  active: active(
    Array.from({ length: 38 }, (_, i) => 248 + Math.sin(i * 1.7) * 14),
  ),
  sold: sold(series(74, 244, 0.02, 9)),
};

/** saturating market: price decaying, active supply deep */
const stanleyQuencher: FixtureProduct = {
  key: "stanley quencher 40oz tumbler",
  title: "Stanley Quencher 40oz Tumbler",
  active: active(
    Array.from({ length: 120 }, (_, i) => 27 + Math.sin(i * 1.3) * 4),
  ),
  sold: sold(series(41, 34, -0.07, 2.2)),
};

/** dead stock risk: low sell-through, deep queue */
const funkoGrogu: FixtureProduct = {
  key: "funko pop grogu 1105",
  title: "Funko Pop! Grogu #1105",
  active: active(
    Array.from({ length: 64 }, (_, i) => 11 + Math.sin(i * 2.1) * 2),
  ),
  sold: sold(series(9, 12.5, -0.01, 1.1)),
};

/** thin data: n=4 sold — must trigger the forecast refusal state */
const pyrexBowl: FixtureProduct = {
  key: "vintage pyrex butterfly gold bowl",
  title: "Vintage Pyrex Butterfly Gold Bowl",
  active: active([28.5, 32, 24.99, 39.95, 27, 31.5]),
  sold: sold(series(4, 30, 0.03, 3)),
};

/** insights-not-granted shape: active only, sold UNAVAILABLE */
const airpodsPro: FixtureProduct = {
  key: "apple airpods pro 2nd gen",
  title: "Apple AirPods Pro (2nd Gen)",
  active: active(
    Array.from({ length: 52 }, (_, i) => 168 + Math.sin(i * 1.9) * 18),
  ),
  sold: { status: "UNAVAILABLE" },
};

export const FIXTURE_PRODUCTS: FixtureProduct[] = [
  switchOled,
  stanleyQuencher,
  funkoGrogu,
  pyrexBowl,
  airpodsPro,
];

export function findFixture(q: string): FixtureProduct | undefined {
  const norm = q.trim().toLowerCase();
  return FIXTURE_PRODUCTS.find(
    (p) => p.key === norm || p.title.toLowerCase().includes(norm),
  );
}

/** default fixture when a demo query has no match — never an error in Demo Mode */
export const DEFAULT_FIXTURE = switchOled;
