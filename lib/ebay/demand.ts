import crypto from "node:crypto";
import { prisma } from "@/lib/db/client";
import { ebayConfigured } from "@/lib/ebay/auth";
import { EbayInsightsSource } from "@/lib/ebay/insights";
import { FixtureSource } from "@/lib/ebay/FixtureSource";
import type { DemandSource, SearchQuery } from "@/lib/ebay/DemandSource";
import type { CompsResult } from "@/lib/analysis/types";
import { median, percentile, trimOutliers } from "@/lib/stats";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6h (§8)
const CACHE_SCHEMA_VERSION = "sold-evidence-v2";

function queryHash(q: SearchQuery): string {
  const norm = `${CACHE_SCHEMA_VERSION}|${q.q.trim().toLowerCase()}|${q.condition ?? ""}|${
    process.env.EBAY_MARKETPLACE_ID ?? "EBAY_US"
  }`;
  return crypto.createHash("sha256").update(norm).digest("hex");
}

function summarize(prices: number[]) {
  const trimmed = trimOutliers(prices);
  return {
    prices: trimmed,
    median: trimmed.length ? median(trimmed) : 0,
    p25: trimmed.length ? percentile(trimmed, 0.25) : 0,
    p75: trimmed.length ? percentile(trimmed, 0.75) : 0,
  };
}

async function fromSource(
  source: DemandSource,
  q: SearchQuery,
  provenance: "LIVE" | "DEMO",
  degraded: boolean,
): Promise<CompsResult> {
  const [active, sold] = await Promise.all([
    source.getActive(q),
    source.getSold(q),
  ]);

  let soldResult: CompsResult["sold"];
  if (sold.status === "OK") {
    soldResult = {
      status: "OK",
      count: sold.soldCount,
      ...summarize(sold.prices),
      series: sold.series,
      references: sold.references,
    };
  } else if (sold.status === "BROWSE_HISTORY") {
    soldResult = {
      status: "BROWSE_HISTORY",
      count: sold.soldCount,
      ...summarize(sold.prices),
      references: sold.references,
      scannedListingCount: sold.scannedListingCount,
    };
  } else {
    soldResult = { status: "UNAVAILABLE" };
  }

  return {
    query: q.q,
    provenance,
    degraded,
    fetchedAt: new Date().toISOString(),
    active: { count: active.activeCount, ...summarize(active.prices) },
    sold: soldResult,
  };
}

/**
 * The single entry point for comps (§8). Demo Mode or missing credentials →
 * fixtures. Live path caches per normalized query for 6h and circuit-breaks
 * to fixtures (degraded=true, visible banner) when eBay is down. Sold data is
 * never fabricated on any path.
 */
export async function getComps(
  q: SearchQuery,
  demo: boolean,
): Promise<CompsResult> {
  if (demo || !ebayConfigured()) {
    return fromSource(new FixtureSource(), q, "DEMO", false);
  }

  const hash = queryHash(q);
  try {
    const hit = await prisma.compsCache.findUnique({ where: { queryHash: hash } });
    if (hit && Date.now() - hit.fetchedAt.getTime() < CACHE_TTL_MS) {
      return hit.payload as unknown as CompsResult;
    }
  } catch {
    // cache read failure is non-fatal — fall through to live fetch
  }

  try {
    const result = await fromSource(new EbayInsightsSource(), q, "LIVE", false);
    try {
      await prisma.compsCache.upsert({
        where: { queryHash: hash },
        create: { queryHash: hash, payload: result as object, fetchedAt: new Date() },
        update: { payload: result as object, fetchedAt: new Date() },
      });
    } catch {
      // cache write failure is non-fatal
    }
    return result;
  } catch {
    // circuit breaker: eBay unreachable → demo fixtures, visibly degraded
    return fromSource(new FixtureSource(), q, "DEMO", true);
  }
}
