"use client";

import { useCallback, useMemo, useState } from "react";
import { CloudOff } from "lucide-react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";
import { Chip } from "@/components/shared/Chip";
import { ErrorState } from "@/components/shared/ErrorState";
import {
  MiddlemanForm,
  type MiddlemanFormValues,
} from "@/components/middleman/MiddlemanForm";
import { CompetitorLadder } from "@/components/middleman/CompetitorLadder";
import { MiddlemanVerdict } from "@/components/middleman/MiddlemanVerdict";
import {
  analyzeMiddleman,
  verdictForMiddleman,
} from "@/lib/middleman/analyze";
import { findCurrency } from "@/lib/middleman/currencies";
import type { CompsResult } from "@/lib/analysis/types";

type FetchState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; message: string }
  | { status: "ok"; comps: CompsResult; form: MiddlemanFormValues };

/**
 * Middleman orchestrator. One /api/comps fetch → pure engine recomputes the
 * verdict + suggested list price + break-even supplier price. Everything
 * downstream re-derives client-side from form state (Rule 1), so tweaking
 * undercut % or the FX rate is instant with no refetch.
 */
export function MiddlemanClient() {
  const { demoMode } = useDemoMode();
  const [state, setState] = useState<FetchState>({ status: "idle" });
  const [lastValues, setLastValues] = useState<MiddlemanFormValues | null>(null);

  const runAnalyze = useCallback(
    async (values: MiddlemanFormValues) => {
      setState({ status: "loading" });
      setLastValues(values);
      try {
        const res = await fetch("/api/comps", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ q: values.q, demo: demoMode }),
        });
        if (!res.ok) {
          const err = (await res.json().catch(() => null)) as {
            error?: string;
          } | null;
          setState({
            status: "error",
            message:
              err?.error ??
              `eBay lookup failed (${res.status}). Try again in a moment.`,
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
    const active = state.comps.active;
    return analyzeMiddleman({
      supplierPrice: state.form.supplierPrice,
      fxRatePerUsd: state.form.fxRatePerUsd,
      shippingCostUsd: state.form.shippingCostUsd,
      presetId: state.form.presetId,
      promotedListingPct: state.form.promotedListingPct,
      undercutPct: state.form.undercutPct,
      competitorPrices: active.prices,
      competitorCount: active.count,
    });
  }, [state]);

  const analysis =
    result && result.status === "OK" ? result : null;
  const verdict = analysis ? verdictForMiddleman(analysis) : null;
  const noCompetitors = result?.status === "NO_COMPETITORS";
  const currency =
    state.status === "ok" ? findCurrency(state.form.currency) : null;

  return (
    <div className="space-y-6">
      <MiddlemanForm
        onAnalyze={runAnalyze}
        loading={state.status === "loading"}
      />

      {state.status === "error" && (
        <ErrorState
          title="eBay lookup failed"
          body={state.message}
          retry={lastValues ? () => runAnalyze(lastValues) : undefined}
        />
      )}

      {noCompetitors && (
        <ErrorState
          title="No competitors found on eBay"
          body="Nothing matched this search. Try a broader query (product noun + brand only), or verify the item is being sold on eBay before committing supply."
        />
      )}

      {state.status === "ok" && analysis && verdict && currency && (
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
              {state.comps.active.count} active listings
            </span>
            <span className="num">
              supplier {currency.symbol}
              {state.form.supplierPrice.toFixed(2)} → $
              {analysis.supplierCostUsd.toFixed(2)}
            </span>
          </div>

          <MiddlemanVerdict verdict={verdict} analysis={analysis} />
          <CompetitorLadder analysis={analysis} />

          <section
            aria-label="Fee waterfall"
            className="border border-line"
          >
            <div className="border-b border-line px-4 py-3">
              <h3 className="font-display text-sm font-black uppercase tracking-tight">
                Fee waterfall (per unit)
              </h3>
            </div>
            <dl className="px-4 py-2 text-sm">
              <Row label="List price (undercut floor)" value={`$${analysis.suggestedListPrice.toFixed(2)}`} />
              {analysis.fees.lineItems.map((item) => (
                <Row
                  key={item.id}
                  label={`− ${item.label}`}
                  value={`−$${item.amount.toFixed(2)}`}
                  tone="loss"
                />
              ))}
              <Row
                label="− Shipping"
                value={`−$${state.form.shippingCostUsd.toFixed(2)}`}
                tone="loss"
              />
              <Row
                label={`− Supplier cost (${currency.symbol}${state.form.supplierPrice.toFixed(2)})`}
                value={`−$${analysis.supplierCostUsd.toFixed(2)}`}
                tone="loss"
              />
              <div className="mt-1 flex items-baseline justify-between border-t border-line pt-2">
                <dt className="text-sm font-medium">= Net profit / unit</dt>
                <dd
                  className={`num text-base font-bold ${
                    analysis.netProfitPerUnit > 0
                      ? "text-gain-text"
                      : "text-loss-text"
                  }`}
                >
                  ${analysis.netProfitPerUnit.toFixed(2)}
                </dd>
              </div>
            </dl>
          </section>
        </>
      )}
    </div>
  );
}

function Row({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "loss";
}) {
  return (
    <div className="flex items-baseline justify-between border-b border-line py-1.5 last:border-b-0">
      <dt className="text-ink-2">{label}</dt>
      <dd
        className={`num ${tone === "loss" ? "text-loss-text" : "font-medium"}`}
      >
        {value}
      </dd>
    </div>
  );
}
