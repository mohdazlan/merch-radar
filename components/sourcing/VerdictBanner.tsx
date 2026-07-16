"use client";

import { useState } from "react";
import {
  AlertTriangle,
  ChevronDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import { Chip } from "@/components/shared/Chip";
import type { Analysis } from "@/lib/analysis/compute";

const fmt = (v: number | null, kind: "money" | "pct" | "days") => {
  if (v === null) return "n/a";
  if (kind === "money") return `$${v.toFixed(2)}`;
  if (kind === "pct") return `${Math.round(v * 100)}%`;
  return `${Math.round(v)}d`;
};

/**
 * §5.5 full-bleed verdict banner. Low-confidence verdicts render visibly
 * lighter (§5.4). The "Why?" disclosure expands the exact rule + inputs.
 */
export function VerdictBanner({ analysis }: { analysis: Analysis }) {
  const [open, setOpen] = useState(false);
  const { verdict, confidence, weak } = analysis;

  const family = verdict.verdict.startsWith("PASS")
    ? "loss"
    : verdict.verdict.startsWith("CAUTION")
      ? "warn"
      : "gain";
  const Icon =
    family === "loss" ? XCircle : family === "warn" ? AlertTriangle : TrendingUp;

  const solid = {
    gain: "border-gain bg-gain/15 text-gain-text",
    warn: "border-warn bg-warn/15 text-warn-text",
    loss: "border-loss bg-loss/15 text-loss-text",
  }[family];
  const weakCls = {
    gain: "border-dashed border-gain/40 bg-transparent text-ink-2",
    warn: "border-dashed border-warn/40 bg-transparent text-ink-2",
    loss: "border-dashed border-loss/40 bg-transparent text-ink-2",
  }[family];

  return (
    <section aria-label="Verdict" className={`border ${weak ? weakCls : solid}`}>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
        <Icon size={26} aria-hidden />
        <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight md:text-4xl">
          {verdict.verdict}
        </h2>
        <span className="num text-sm">conf {confidence.confidence}%</span>
        {confidence.lowSample && <Chip tone="warn">Low sample</Chip>}
        {weak && !confidence.lowSample && (
          <Chip tone="neutral">Low confidence</Chip>
        )}
      </div>
      <p className="px-4 pb-3 text-sm text-ink-2">{verdict.reason}</p>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center gap-1.5 border-t border-line px-4 text-sm font-medium text-ink hover:bg-surface"
      >
        <ChevronDown
          size={14}
          aria-hidden
          className={`transition-transform duration-150 ${open ? "rotate-180" : ""}`}
        />
        Why? — rule {verdict.ruleId}
      </button>
      {open && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-1 border-t border-line px-4 py-3 text-sm md:grid-cols-5">
          {(
            [
              ["ROI", fmt(verdict.inputs.roi, "pct")],
              ["Net profit", fmt(verdict.inputs.netProfit, "money")],
              ["Sell-through", fmt(verdict.inputs.sellThroughRate, "pct")],
              ["Days to flip", fmt(verdict.inputs.daysToFlip, "days")],
              ["Price trend /90d", fmt(verdict.inputs.decaySlope, "pct")],
            ] as const
          ).map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs uppercase tracking-wide text-ink-2">
                {label}
              </dt>
              <dd className="num text-ink">{value}</dd>
            </div>
          ))}
          <div className="col-span-2 md:col-span-5">
            <dt className="sr-only">Rule</dt>
            <dd className="text-xs text-ink-2">
              Rules evaluate in order; the first match wins. This verdict fired
              on <span className="num">{verdict.ruleId}</span> with the inputs
              above. It is decision support, not advice — you can always
              override it.
            </dd>
          </div>
        </dl>
      )}
    </section>
  );
}
