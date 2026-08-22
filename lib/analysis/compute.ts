import type { CompsResult } from "@/lib/analysis/types";
import { FEE_PRESETS } from "@/lib/fees/presets";
import { computeMetrics, type Metrics, type NoComps } from "@/lib/verdict/metrics";
import {
  computeConfidence,
  evaluateVerdict,
  type Confidence,
  type VerdictResult,
} from "@/lib/verdict/engine";
import { fitDecay, type Forecast } from "@/lib/forecast/decay";

/**
 * Client-safe orchestration of the pure engines. Everything derives from the
 * comps payload + form inputs, so changing the fee preset or ad rate
 * recomputes the whole analysis instantly with zero network calls (Rule 1).
 */

export type AnalysisInput = {
  buyCost: number;
  shippingCost: number;
  qty: number;
  presetId: string;
  promotedListingPct: number;
};

export type Analysis = {
  status: "OK";
  metrics: Metrics;
  verdict: VerdictResult;
  confidence: Confidence;
  /** weak = §5.4 low-visual-weight rendering */
  weak: boolean;
  forecast: Forecast | null;
  decaySlope: number | null;
};

export const WEAK_THRESHOLD = 50;

export function analyze(
  comps: CompsResult,
  input: AnalysisInput,
): Analysis | NoComps {
  const soldOk = comps.sold.status === "OK" ? comps.sold : null;
  const soldBrowse =
    comps.sold.status === "BROWSE_HISTORY" ? comps.sold : null;

  const forecast = soldOk ? fitDecay(soldOk.series) : null;
  const decaySlope =
    forecast && forecast.status === "OK" ? forecast.slopePer90d : null;

  const preset = FEE_PRESETS[input.presetId] ?? FEE_PRESETS.ebay;
  const metrics = computeMetrics({
    buyCost: input.buyCost,
    shippingCost: input.shippingCost,
    activeCount: comps.active.count,
    activePrices: comps.active.prices,
    // Browse quantities are lifetime listing totals, not a 90-day sales
    // window. They may support pricing but must not drive STR/velocity.
    soldCount: soldOk ? soldOk.count : null,
    soldPrices: soldOk ? soldOk.prices : null,
    soldListingPrices: soldBrowse ? soldBrowse.prices : null,
    decaySlope,
    preset,
    feeOptions: { promotedListingPct: input.promotedListingPct || undefined },
  });
  if (metrics.status !== "OK") return metrics;

  const verdict = evaluateVerdict({
    roi: metrics.roi,
    netProfit: metrics.netProfit,
    sellThroughRate: metrics.sellThroughRate,
    daysToFlip: metrics.daysToFlip,
    decaySlope,
  });
  const dataAgeDays =
    (Date.now() - Date.parse(comps.fetchedAt)) / 86_400_000 || 0;
  const confidence = computeConfidence({
    soldCount: soldOk ? soldOk.count : null,
    soldPrices: soldOk?.prices ?? soldBrowse?.prices ?? null,
    sampleCount: soldOk
      ? soldOk.prices.length
      : soldBrowse
        ? soldBrowse.references.length
        : undefined,
    dataAgeDays: Math.max(dataAgeDays, 0),
  });

  return {
    status: "OK",
    metrics,
    verdict,
    confidence,
    weak: confidence.lowSample || confidence.confidence < WEAK_THRESHOLD,
    forecast,
    decaySlope,
  };
}
