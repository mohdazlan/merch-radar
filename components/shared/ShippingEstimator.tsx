"use client";

import { useCallback, useState } from "react";
import { AlertTriangle, Loader2, Package, Ruler } from "lucide-react";
import { useDemoMode } from "@/components/shared/DemoModeProvider";
import { Chip } from "@/components/shared/Chip";
import type { ShippingQuote } from "@/lib/shipping/types";

const inputCls =
  "h-11 w-full border border-line bg-surface px-3 text-sm text-ink placeholder:text-ink-2 focus:border-accent num";
const labelCls =
  "mb-1 block text-xs font-medium uppercase tracking-wide text-ink-2";

/**
 * Weight + dimensions in, a real chargeable-weight-based shipping cost out.
 * Embedded in both Sourcing and Middleman so a flat manual shipping guess
 * never quietly wipes out a margin that looked fine on paper.
 */
export function ShippingEstimator({
  destCountry = "US",
  onEstimate,
}: {
  destCountry?: string;
  onEstimate: (shippingCostUsd: number) => void;
}) {
  const { demoMode } = useDemoMode();
  const [weightGrams, setWeightGrams] = useState("");
  const [lengthCm, setLengthCm] = useState("");
  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [loading, setLoading] = useState(false);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [error, setError] = useState<string | null>(null);

  const canEstimate = Number(weightGrams) > 0;

  const runEstimate = useCallback(async () => {
    const w = Number(weightGrams);
    if (!Number.isFinite(w) || w <= 0) {
      setError("Enter the parcel's actual weight in grams.");
      return;
    }
    const l = Number(lengthCm);
    const wd = Number(widthCm);
    const h = Number(heightCm);
    const hasDims =
      Number.isFinite(l) && l > 0 && Number.isFinite(wd) && wd > 0 && Number.isFinite(h) && h > 0;

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/shipping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          actualWeightGrams: w,
          dimensions: hasDims ? { lengthCm: l, widthCm: wd, heightCm: h } : null,
          originCountry: "MY",
          destCountry,
          demo: demoMode,
        }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => null)) as { error?: string } | null;
        setError(err?.error ?? `Shipping lookup failed (${res.status}).`);
        return;
      }
      const result = (await res.json()) as ShippingQuote;
      setQuote(result);
      if (result.rates.length > 0) {
        onEstimate(result.rates[0].priceUsd);
      }
    } catch {
      setError("Network error — check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [weightGrams, lengthCm, widthCm, heightCm, destCountry, demoMode, onEstimate]);

  return (
    <section aria-label="Shipping estimator" className="border border-line">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Package size={15} aria-hidden />
        <h3 className="font-display text-sm font-black uppercase tracking-tight">
          Shipping estimate
        </h3>
        <span className="text-xs text-ink-2">from Malaysia to {destCountry}</span>
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-4">
        <div>
          <label htmlFor="se-weight" className={labelCls}>
            Weight (g)
          </label>
          <input
            id="se-weight"
            type="number"
            inputMode="decimal"
            min="1"
            step="1"
            value={weightGrams}
            onChange={(e) => setWeightGrams(e.target.value)}
            placeholder="e.g. 200"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="se-l" className={labelCls}>
            Length (cm)
          </label>
          <input
            id="se-l"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={lengthCm}
            onChange={(e) => setLengthCm(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="se-w" className={labelCls}>
            Width (cm)
          </label>
          <input
            id="se-w"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={widthCm}
            onChange={(e) => setWidthCm(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </div>
        <div>
          <label htmlFor="se-h" className={labelCls}>
            Height (cm)
          </label>
          <input
            id="se-h"
            type="number"
            inputMode="decimal"
            min="0"
            step="0.5"
            value={heightCm}
            onChange={(e) => setHeightCm(e.target.value)}
            placeholder="optional"
            className={inputCls}
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 px-4 pb-3">
        <button
          type="button"
          onClick={() => void runEstimate()}
          disabled={!canEstimate || loading}
          className="inline-flex h-10 items-center gap-2 border border-line px-4 text-xs font-bold uppercase tracking-wide hover:border-ink-2 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? (
            <Loader2 size={13} className="animate-spin" aria-hidden />
          ) : (
            <Ruler size={13} aria-hidden />
          )}
          {loading ? "Checking couriers…" : "Estimate shipping"}
        </button>
        <p className="max-w-prose text-xs text-ink-2">
          Couriers bill on <em>chargeable weight</em> — the higher of actual
          weight and volumetric weight (L×W×H÷5000) — not the number on your
          scale. A light-but-bulky parcel routinely costs more than expected.
        </p>
      </div>

      {error && (
        <p role="alert" className="border-t border-line px-4 py-2 text-xs text-loss-text">
          {error}
        </p>
      )}

      {quote && (
        <div className="border-t border-line">
          {quote.degraded && (
            <p
              role="status"
              className="flex items-center gap-2 border-b border-line bg-warn/10 px-4 py-2 text-xs text-warn-text"
            >
              <AlertTriangle size={13} aria-hidden />
              Live courier rates unavailable — showing demo estimates instead.
            </p>
          )}
          <dl className="grid grid-cols-2 gap-x-4 gap-y-1 px-4 py-3 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-2">Actual</dt>
              <dd className="num">{quote.actualWeightGrams}g</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-2">Volumetric</dt>
              <dd className="num">
                {quote.volumetricWeightGrams === null ? "—" : `${quote.volumetricWeightGrams}g`}
              </dd>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <dt className="text-xs uppercase tracking-wide text-ink-2">
                Chargeable (billed on this)
              </dt>
              <dd className="num font-medium text-warn-text">
                {quote.chargeableWeightGrams}g
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wide text-ink-2">Provenance</dt>
              <dd>
                <Chip tone={quote.provenance === "DEMO" ? "warn" : "gain"}>
                  {quote.provenance}
                </Chip>
              </dd>
            </div>
          </dl>

          {quote.rates.length === 0 ? (
            <p className="border-t border-line px-4 py-3 text-sm text-ink-2">
              No courier rates came back for this lane — enter shipping cost
              manually below.
            </p>
          ) : (
            <ul className="border-t border-line">
              {quote.rates.map((r, i) => (
                <li
                  key={`${r.courier}-${r.service}`}
                  className={`flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 border-b border-line px-4 py-2 text-sm last:border-b-0 ${
                    i === 0 ? "bg-gain/5" : ""
                  }`}
                >
                  <span>
                    <span className="font-medium">{r.courier}</span>{" "}
                    <span className="text-xs text-ink-2">{r.service}</span>
                    {r.etaDaysMin !== null && (
                      <span className="ml-2 text-xs text-ink-2">
                        {r.etaDaysMin === r.etaDaysMax
                          ? `${r.etaDaysMin}d`
                          : `${r.etaDaysMin}–${r.etaDaysMax}d`}
                      </span>
                    )}
                  </span>
                  <span className="flex items-center gap-2">
                    <span className="num font-medium">${r.priceUsd.toFixed(2)}</span>
                    {i === 0 && <Chip tone="gain">cheapest</Chip>}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
