import {
  AlertTriangle,
  CircleCheck,
  Lightbulb,
  RefreshCw,
  XCircle,
} from "lucide-react";
import type {
  MiddlemanAnalysis,
  MiddlemanVerdict as VerdictShape,
} from "@/lib/middleman/analyze";

const ICONS = {
  "LIST IT": CircleCheck,
  "LIST — SLIM MARGIN": AlertTriangle,
  "REPRICE OR RENEGOTIATE": RefreshCw,
  "SKIP — CAN'T UNDERCUT PROFITABLY": XCircle,
  "SKIP — NO MARKET": XCircle,
} as const;

const TONE_CLS = {
  "LIST IT": "border-gain bg-gain/15 text-gain-text",
  "LIST — SLIM MARGIN": "border-warn bg-warn/15 text-warn-text",
  "REPRICE OR RENEGOTIATE": "border-warn bg-warn/15 text-warn-text",
  "SKIP — CAN'T UNDERCUT PROFITABLY": "border-loss bg-loss/15 text-loss-text",
  "SKIP — NO MARKET": "border-loss bg-loss/15 text-loss-text",
} as const;

const money = (x: number) => `$${x.toFixed(2)}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * Verdict banner for the middleman flow. Unlike /sourcing (which explains
 * "buy or not"), this frames the outcome as a listing decision plus a
 * pricing tactic — with the break-even supplier price so the operator has
 * something concrete to negotiate against.
 */
export function MiddlemanVerdict({
  verdict,
  analysis,
}: {
  verdict: VerdictShape;
  analysis: MiddlemanAnalysis;
}) {
  const Icon = ICONS[verdict.verdict];
  const cls = TONE_CLS[verdict.verdict];

  return (
    <section
      aria-label="Verdict"
      aria-live="polite"
      className={`border ${cls}`}
    >
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-4">
        <Icon size={26} aria-hidden />
        <h2 className="font-display text-2xl font-black uppercase leading-none tracking-tight md:text-4xl">
          {verdict.verdict}
        </h2>
      </div>
      <p className="px-4 pb-3 text-sm">{verdict.reason}</p>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-t border-line px-4 py-3 text-sm md:grid-cols-4">
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-2">
            List at
          </dt>
          <dd className="num text-base font-medium text-ink">
            {money(analysis.suggestedListPrice)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-2">
            Net / unit
          </dt>
          <dd
            className={`num text-base font-medium ${
              analysis.netProfitPerUnit > 0
                ? "text-gain-text"
                : "text-loss-text"
            }`}
          >
            {money(analysis.netProfitPerUnit)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-2">
            Margin
          </dt>
          <dd className="num text-base font-medium text-ink">
            {pct(analysis.marginPct)}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-2">
            Break-even supplier $
          </dt>
          <dd className="num text-base font-medium text-ink">
            {money(analysis.breakEvenSupplierUsd)}
          </dd>
        </div>
      </dl>

      {verdict.tips.length > 0 && (
        <div className="border-t border-line px-4 py-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-2">
            <Lightbulb size={12} aria-hidden />
            Counter-play
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-ink">
            {verdict.tips.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
