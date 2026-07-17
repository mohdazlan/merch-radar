"use client";

import { ExternalLink } from "lucide-react";
import { FEE_PRESETS } from "@/lib/fees/presets";
import type { Metrics } from "@/lib/verdict/metrics";

const money = (x: number) => `$${x.toFixed(2)}`;

/**
 * §5.7 fee calculator — the audit trail for netProfit. Every dollar
 * subtracted is a visible line item; switching presets or the ad rate
 * recomputes all downstream metrics and the verdict live.
 */
export function FeeCalculator({
  metrics,
  buyCost,
  shippingCost,
  presetId,
  promotedListingPct,
  onPresetChange,
  onPromotedChange,
}: {
  metrics: Metrics;
  buyCost: number;
  shippingCost: number;
  presetId: string;
  promotedListingPct: number;
  onPresetChange: (id: string) => void;
  onPromotedChange: (pct: number) => void;
}) {
  const preset = FEE_PRESETS[presetId] ?? FEE_PRESETS.ebay;
  const fees = metrics.fees;

  return (
    <section aria-label="Fee calculator" className="border border-line">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line px-4 py-3">
        <h3 className="font-display text-sm font-black uppercase tracking-tight">
          Fee waterfall
        </h3>
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <label
              htmlFor="fee-preset"
              className="mb-1 block text-xs uppercase tracking-wide text-ink-2"
            >
              Preset
            </label>
            <select
              id="fee-preset"
              value={presetId}
              onChange={(e) => onPresetChange(e.target.value)}
              className="h-11 border border-line bg-surface px-2 text-sm"
            >
              {Object.values(FEE_PRESETS).map((p) => (
                <option key={p.id} value={p.id}>
                  {p.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label
              htmlFor="fee-ads"
              className="mb-1 block text-xs uppercase tracking-wide text-ink-2"
            >
              Ad rate %
            </label>
            <input
              id="fee-ads"
              type="number"
              min="0"
              max="30"
              step="0.5"
              value={promotedListingPct * 100}
              onChange={(e) =>
                onPromotedChange(
                  Math.max(0, Math.min(30, Number(e.target.value))) / 100,
                )
              }
              className="num h-11 w-20 border border-line bg-surface px-2 text-sm"
            />
          </div>
        </div>
      </div>

      <dl className="px-4 py-2 text-sm">
        <div className="flex items-baseline justify-between border-b border-line py-1.5">
          <dt className="text-ink-2">Sell price (est.)</dt>
          <dd className="num font-medium">{money(fees.sellPrice)}</dd>
        </div>
        {fees.lineItems.map((item) => (
          <div
            key={item.id}
            className="flex items-baseline justify-between border-b border-line py-1.5"
          >
            <dt className="text-ink-2">− {item.label}</dt>
            <dd className="num text-loss-text">−{money(item.amount)}</dd>
          </div>
        ))}
        <div className="flex items-baseline justify-between border-b border-line py-1.5">
          <dt className="text-ink-2">− Shipping</dt>
          <dd className="num text-loss-text">−{money(shippingCost)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-line py-1.5">
          <dt className="text-ink-2">= Net proceeds</dt>
          <dd className="num font-medium">{money(metrics.netProceeds)}</dd>
        </div>
        <div className="flex items-baseline justify-between border-b border-line py-1.5">
          <dt className="text-ink-2">− Buy cost</dt>
          <dd className="num text-loss-text">−{money(buyCost)}</dd>
        </div>
        <div className="flex items-baseline justify-between py-2">
          <dt className="font-medium text-ink">= Net profit</dt>
          <dd
            className={`num text-base font-bold ${
              metrics.netProfit > 0 ? "text-gain-text" : "text-loss-text"
            }`}
          >
            {money(metrics.netProfit)}
          </dd>
        </div>
      </dl>

      <p className="border-t border-line px-4 py-2 text-xs text-ink-2">
        Preset effective {preset.effectiveDate}
        {preset.sourceUrl && (
          <>
            {" · "}
            <a
              href={preset.sourceUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-0.5 underline hover:text-ink"
            >
              fee source <ExternalLink size={10} aria-hidden />
            </a>
          </>
        )}
        {" · "}fees are category-dependent and change — verify before large buys
      </p>
    </section>
  );
}
