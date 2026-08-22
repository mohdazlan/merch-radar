import type { Condition } from "@/lib/ebay/DemandSource";
import type { SoldReference } from "@/lib/ebay/DemandSource";

/**
 * Wire shape of /api/comps. The server fetches and trims comps; every
 * downstream number (metrics, verdict, forecast) is computed client-side by
 * the pure engines so a fee-preset change recomputes live (Rule 1).
 */

export type CompsRequest = {
  q: string;
  condition?: Condition;
  /** client Demo Mode toggle — server also forces demo when keys are absent */
  demo?: boolean;
};

export type CompsResult = {
  query: string;
  provenance: "LIVE" | "DEMO";
  /** true when live data was requested but the circuit breaker fell back */
  degraded: boolean;
  fetchedAt: string;
  active: {
    count: number;
    prices: number[];
    median: number;
    p25: number;
    p75: number;
  };
  sold:
    | {
        status: "OK";
        count: number;
        prices: number[];
        median: number;
        p25: number;
        p75: number;
        series: { date: string; price: number }[];
        references: SoldReference[];
      }
    | {
        status: "BROWSE_HISTORY";
        count: number;
        prices: number[];
        median: number;
        p25: number;
        p75: number;
        references: SoldReference[];
        scannedListingCount: number;
      }
    | { status: "UNAVAILABLE" };
};
