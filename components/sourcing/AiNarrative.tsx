"use client";

import { Bot, Eye, ShieldAlert, Swords } from "lucide-react";
import type { RiskNarrative } from "@/lib/ai/schemas";

export type AiState =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "ok"; narrative: RiskNarrative }
  | { status: "unavailable" };

/**
 * §7 AI summary — narrative over the computed numbers, never a source of
 * numbers. When the model is unavailable the fallback line makes clear the
 * verdict above still stands.
 */
export function AiNarrative({ state }: { state: AiState }) {
  if (state.status === "idle") return null;

  return (
    <section aria-label="AI risk narrative" className="border border-line">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Bot size={15} aria-hidden />
        <h3 className="font-display text-sm font-black uppercase tracking-tight">
          Risk narrative
        </h3>
        <span className="text-[11px] uppercase tracking-wide text-ink-2">
          explains the numbers — never computes them
        </span>
      </div>
      {state.status === "loading" && (
        <p className="px-4 py-3 text-sm text-ink-2" role="status">
          Reading the computed metrics…
        </p>
      )}
      {state.status === "unavailable" && (
        <p className="px-4 py-3 text-sm text-ink-2">
          Analysis unavailable — the numbers above still stand. The verdict is
          computed by the rule engine and does not depend on AI.
        </p>
      )}
      {state.status === "ok" && (
        <div className="space-y-3 px-4 py-3 text-sm">
          <p>{state.narrative.why}</p>
          <div>
            <h4 className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-2">
              <ShieldAlert size={12} aria-hidden /> Risks
            </h4>
            <ul className="list-inside list-disc space-y-1 text-ink">
              {state.narrative.risks.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
          <p className="flex items-start gap-1.5">
            <Swords size={13} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
            <span>
              <span className="font-medium">Counter-play:</span>{" "}
              {state.narrative.counterplay}
            </span>
          </p>
          <p className="flex items-start gap-1.5">
            <Eye size={13} className="mt-0.5 shrink-0 text-ink-2" aria-hidden />
            <span>
              <span className="font-medium">Watch:</span> {state.narrative.watch}
            </span>
          </p>
        </div>
      )}
    </section>
  );
}
