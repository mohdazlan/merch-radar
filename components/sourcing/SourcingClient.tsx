"use client";

import { useCallback, useMemo, useState } from "react";
import { CloudOff } from "lucide-react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";
import { ErrorState } from "@/components/shared/ErrorState";
import { Chip } from "@/components/shared/Chip";
import dynamic from "next/dynamic";
import { SourcingForm, type SourcingFormValues } from "@/components/sourcing/SourcingForm";
import { VerdictBanner } from "@/components/sourcing/VerdictBanner";
import { MetricsGrid } from "@/components/sourcing/MetricsGrid";
import { FeeCalculator } from "@/components/sourcing/FeeCalculator";
import { HypePanel } from "@/components/sourcing/HypePanel";
import { SoldReferences } from "@/components/sourcing/SoldReferences";

// Recharts is the heaviest client dependency and only renders after an
// analysis — split it out of the initial /sourcing bundle
const DecayChart = dynamic(
  () =>
    import("@/components/sourcing/DecayChart").then((m) => ({
      default: m.DecayChart,
    })),
  {
    ssr: false,
    loading: () => (
      <p className="text-sm text-ink-2" role="status">
        Loading chart…
      </p>
    ),
  },
);
import { AiNarrative, type AiState } from "@/components/sourcing/AiNarrative";
import { analyze } from "@/lib/analysis/compute";
import type { CompsResult } from "@/lib/analysis/types";
import { FEE_PRESETS } from "@/lib/fees/presets";
import { RiskNarrativeSchema } from "@/lib/ai/schemas";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; comps: CompsResult; form: SourcingFormValues };

/**
 * Co-Pilot orchestrator. One network call fetches comps; everything else —
 * metrics, verdict, confidence, forecast — is recomputed client-side by the
 * pure engines, so preset/ad-rate changes are instant (Rule 1). The AI
 * narrative is fetched separately and is never a dependency.
 */
export function SourcingClient() {
  const { demoMode } = useDemoMode();
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [presetId, setPresetId] = useState("ebay");
  const [promotedListingPct, setPromotedListingPct] = useState(0);
  const [ai, setAi] = useState<AiState>({ status: "idle" });
  const [lastValues, setLastValues] = useState<SourcingFormValues | null>(null);

  const runAnalyze = useCallback(
    async (values: SourcingFormValues) => {
      setState({ status: "loading" });
      setAi({ status: "idle" });
      setLastValues(values);
      setPresetId(values.presetId);
      try {
        const res = await fetch("/api/comps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            q: values.q,
            condition: values.condition,
            demo: demoMode,
          }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setState({
            status: "error",
            message: err?.error ?? `Lookup failed (${res.status}). Try again.`,
          });
          return;
        }
        const comps = (await res.json()) as CompsResult;
        setState({ status: "ok", comps, form: values });
      } catch {
        setState({
          status: "error",
          message: "Network error — check your connection and try again.",
        });
      }
    },
    [demoMode],
  );

  const result = useMemo(() => {
    if (state.status !== "ok") return null;
    return analyze(state.comps, {
      buyCost: state.form.buyCost,
      shippingCost: state.form.shippingCost,
      qty: state.form.qty,
      presetId,
      promotedListingPct,
    });
  }, [state, presetId, promotedListingPct]);

  const analysis = result && result.status !== "NO_COMPS" ? result : null;
  const noComps = result?.status === "NO_COMPS";

  const fetchNarrative = useCallback(async () => {
    if (state.status !== "ok" || !analysis) return;
    setAi({ status: "loading" });
    try {
      const m = analysis.metrics;
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: state.form.q,
          condition: state.form.condition,
          platform: FEE_PRESETS[presetId]?.label ?? presetId,
          buyCost: state.form.buyCost,
          estSellPrice: m.estSellPrice,
          netProfit: m.netProfit,
          roi: m.roi,
          str: m.sellThroughRate,
          activeCount: state.comps.active.count,
          soldCount: state.comps.sold.status === "OK" ? state.comps.sold.count : null,
          decaySlope: analysis.decaySlope,
          daysToFlip: m.daysToFlip,
          capitalPerDay: m.capitalPerDay,
          verdict: analysis.verdict.verdict,
          ruleId: analysis.verdict.ruleId,
          confidence: analysis.confidence.confidence,
        }),
      });
      const data = (await res.json()) as {
        available: boolean;
        narrative?: unknown;
      };
      const parsed = data.available
        ? RiskNarrativeSchema.safeParse(data.narrative)
        : null;
      if (parsed?.success) {
        setAi({ status: "ok", narrative: parsed.data });
      } else {
        setAi({ status: "unavailable" });
      }
    } catch {
      setAi({ status: "unavailable" });
    }
  }, [state, analysis, presetId]);

  return (
    <div className="space-y-6">
      <SourcingForm onAnalyze={runAnalyze} loading={state.status === "loading"} />

      {state.status === "error" && (
        <ErrorState
          title="Comps lookup failed"
          body={state.message}
          retry={lastValues ? () => runAnalyze(lastValues) : undefined}
        />
      )}

      {noComps && (
        <ErrorState
          title="No comps found"
          body="Neither active nor sold listings matched this query. Refine the product name — there's nothing to price against, so no verdict is possible."
        />
      )}

      {state.status === "ok" && analysis && (
        <>
          {state.comps.degraded && (
            <p
              role="status"
              className="flex items-center gap-2 border border-warn/60 bg-warn/10 px-3 py-2 text-sm text-warn-text"
            >
              <CloudOff size={14} aria-hidden />
              eBay is unreachable — showing demo fixtures instead of live data.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 text-xs text-ink-2">
            <span className="num">{state.form.q}</span>
            <Chip tone={state.comps.provenance === "DEMO" ? "warn" : "gain"}>
              comps: {state.comps.provenance}
            </Chip>
            <span className="num">
              {state.comps.active.count} active ·{" "}
              {state.comps.sold.status === "OK"
                ? `${state.comps.sold.count} sold/90d`
                : state.comps.sold.status === "BROWSE_HISTORY"
                  ? `${state.comps.sold.count.toLocaleString()} sold (listing history)`
                  : "sold unavailable"}
            </span>
            {state.form.qty > 1 && (
              <span className="num">
                qty {state.form.qty} → total net $
                {(analysis.metrics.netProfit * state.form.qty).toFixed(2)}
              </span>
            )}
          </div>

          <VerdictBanner analysis={analysis} />
          <MetricsGrid analysis={analysis} comps={state.comps} />
          <SoldReferences sold={state.comps.sold} />

          <div className="grid gap-6 lg:grid-cols-2">
            <FeeCalculator
              metrics={analysis.metrics}
              buyCost={state.form.buyCost}
              shippingCost={state.form.shippingCost}
              presetId={presetId}
              promotedListingPct={promotedListingPct}
              onPresetChange={setPresetId}
              onPromotedChange={setPromotedListingPct}
            />
            <div className="space-y-6">
              <DecayChart comps={state.comps} forecast={analysis.forecast} />
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <HypePanel query={state.form.q} />
            <div className="space-y-3">
              {ai.status === "idle" && (
                <button
                  type="button"
                  onClick={fetchNarrative}
                  className="inline-flex min-h-11 items-center border border-line px-4 text-sm font-medium hover:border-ink-2"
                >
                  Get AI risk narrative
                </button>
              )}
              <AiNarrative state={ai} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
