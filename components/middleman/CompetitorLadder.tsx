import { Users } from "lucide-react";
import { Chip, type ChipTone } from "@/components/shared/Chip";
import type { MiddlemanAnalysis } from "@/lib/middleman/analyze";

const PRESSURE_TONE: Record<MiddlemanAnalysis["competitorPressure"], ChipTone> = {
  NONE: "neutral",
  THIN: "accent",
  HEALTHY: "gain",
  SATURATED: "warn",
};

const PRESSURE_LABEL: Record<MiddlemanAnalysis["competitorPressure"], string> = {
  NONE: "No competitors found",
  THIN: "Thin market",
  HEALTHY: "Healthy competition",
  SATURATED: "Saturated — expect price war",
};

const money = (x: number) => `$${x.toFixed(2)}`;

/**
 * Competitor snapshot — the price ladder plus a market-pressure signal. The
 * middleman is pricing *against* this distribution, not a fabricated "avg".
 */
export function CompetitorLadder({
  analysis,
}: {
  analysis: MiddlemanAnalysis;
}) {
  const c = analysis.competitors;
  return (
    <section aria-label="Competitor ladder" className="border border-line">
      <div className="flex items-center gap-2 border-b border-line px-4 py-3">
        <Users size={15} aria-hidden />
        <h3 className="font-display text-sm font-black uppercase tracking-tight">
          Competitor ladder
        </h3>
        <Chip tone={PRESSURE_TONE[analysis.competitorPressure]}>
          {PRESSURE_LABEL[analysis.competitorPressure]}
        </Chip>
      </div>

      {c === null ? (
        <p className="px-4 py-4 text-sm text-ink-2">
          No competitor prices resolved for this query. Either the search
          returned nothing, or every result was outlier-trimmed as
          non-comparable.
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-px bg-line sm:grid-cols-4">
            {(
              [
                ["Floor (min)", money(c.min)],
                ["25th percentile", money(c.p25)],
                ["Median", money(c.median)],
                ["75th percentile", money(c.p75)],
              ] as const
            ).map(([label, value]) => (
              <div key={label} className="bg-bg p-3">
                <dt className="text-xs uppercase tracking-wide text-ink-2">
                  {label}
                </dt>
                <dd className="num mt-0.5 text-base font-medium">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="border-t border-line px-4 py-2 text-xs text-ink-2">
            {c.count} active listings pulled from eBay just now. Undercutting
            the floor puts you at the top of the price sort — worth doing when
            the floor still leaves you a real margin.
          </p>
        </>
      )}
    </section>
  );
}
