/**
 * §7 sentiment seam. The MVP hype panel is synthetic (DEMO, unmistakably
 * badged). Real providers drop in behind this interface later:
 * Reddit public JSON (mention velocity), a licensed trends provider, and a
 * licensed BSR provider (Keepa/Rainforest — never scraped). TikTok has no
 * usable public API and stays a paid-provider/manual slot, not a fake gauge.
 */

export type SentimentSignal = {
  id: "tiktok" | "reddit" | "bsr";
  label: string;
  /** 0–100 gauge value */
  value: number;
  trend: "up" | "down" | "flat";
  provenance: "LIVE" | "DEMO";
  note: string;
};

export interface SentimentSource {
  getSignals(q: string): Promise<SentimentSignal[]>;
}

/** deterministic synthetic gauges — value derives from the query hash */
export class DemoSentimentSource implements SentimentSource {
  async getSignals(q: string): Promise<SentimentSignal[]> {
    let h = 0;
    for (const c of q.toLowerCase()) h = (h * 31 + c.charCodeAt(0)) % 1000;
    const v = (offset: number) => ((h + offset * 137) % 70) + 15;
    const t = (n: number): "up" | "down" | "flat" =>
      n % 3 === 0 ? "up" : n % 3 === 1 ? "down" : "flat";
    return [
      {
        id: "tiktok",
        label: "TikTok Hype Score",
        value: v(1),
        trend: t(h),
        provenance: "DEMO",
        note: "No usable public TikTok API — will be a paid-provider or manual signal, never scraped.",
      },
      {
        id: "reddit",
        label: "Reddit mention velocity",
        value: v(2),
        trend: t(h + 1),
        provenance: "DEMO",
        note: "Real path: Reddit public JSON API (free, legitimate).",
      },
      {
        id: "bsr",
        label: "Amazon BSR trend",
        value: v(3),
        trend: t(h + 2),
        provenance: "DEMO",
        note: "Real path: licensed data provider (Keepa/Rainforest) — never scraped.",
      },
    ];
  }
}
