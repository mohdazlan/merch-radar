import { AlertTriangle, Sprout, Tag } from "lucide-react";
import { Chip, type ChipTone } from "@/components/shared/Chip";
import { readKeywordSignal } from "@/lib/trends/analyze";
import type { CompetitionPressure } from "@/lib/shared/competition";
import type { KeywordSignal } from "@/lib/trends/types";

const PRESSURE_TONE: Record<CompetitionPressure, ChipTone> = {
  NONE: "neutral",
  THIN: "warn",
  HEALTHY: "gain",
  SATURATED: "loss",
};

const money = (x: number) => `$${x.toFixed(2)}`;

/** groups the flat topAspects list back into per-attribute clusters for display */
function groupAspects(aspects: KeywordSignal["topAspects"]) {
  const groups = new Map<string, { value: string; matchCount: number }[]>();
  for (const a of aspects) {
    const list = groups.get(a.name) ?? [];
    list.push({ value: a.value, matchCount: a.matchCount });
    groups.set(a.name, list);
  }
  return [...groups.entries()];
}

export function KeywordSignalCard({ signal }: { signal: KeywordSignal }) {
  const read = readKeywordSignal(signal);
  const aspectGroups = groupAspects(signal.topAspects);

  return (
    <section
      aria-label={`Market signal for ${signal.keyword}`}
      className="flex flex-col border border-line"
    >
      <div className="border-b border-line px-4 py-3">
        <h3 className="font-display text-base font-black uppercase tracking-tight">
          {signal.keyword}
        </h3>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          <Chip tone={signal.provenance === "DEMO" ? "warn" : "gain"}>
            {signal.provenance}
          </Chip>
          <Chip tone={PRESSURE_TONE[signal.competitionPressure]}>
            {signal.competitionPressure}
          </Chip>
          {signal.degraded && (
            <Chip tone="warn" icon={AlertTriangle}>
              live lookup failed
            </Chip>
          )}
        </div>
      </div>

      <div className="border-b border-line px-4 py-3">
        <p className="font-medium">{read.headline}</p>
        <p className="mt-1 text-sm text-ink-2">{read.detail}</p>
      </div>

      <dl className="grid grid-cols-2 gap-x-4 gap-y-2 border-b border-line px-4 py-3 text-sm">
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-2">Active</dt>
          <dd className="num font-medium">{signal.activeCount}</dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-2">New sellers</dt>
          <dd className="num font-medium">
            {signal.newSellerPct === null ? "—" : `${signal.newSellerPct}%`}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-2">Median price</dt>
          <dd className="num font-medium">
            {signal.priceStats ? money(signal.priceStats.median) : "—"}
          </dd>
        </div>
        <div>
          <dt className="text-xs uppercase tracking-wide text-ink-2">Range (p25–p75)</dt>
          <dd className="num font-medium">
            {signal.priceStats
              ? `${money(signal.priceStats.p25)}–${money(signal.priceStats.p75)}`
              : "—"}
          </dd>
        </div>
      </dl>

      <div className="flex-1 px-4 py-3">
        <p className="mb-2 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-ink-2">
          <Tag size={12} aria-hidden />
          What&apos;s already listed
        </p>
        {aspectGroups.length === 0 ? (
          <p className="text-sm text-ink-2">No attribute data for this niche.</p>
        ) : (
          <div className="space-y-2">
            {aspectGroups.map(([name, values]) => (
              <div key={name}>
                <p className="text-xs text-ink-2">{name}</p>
                <div className="mt-1 flex flex-wrap gap-1">
                  {values.map((v) => (
                    <span
                      key={v.value}
                      className="border border-line px-1.5 py-0.5 font-mono text-[11px] text-ink"
                    >
                      {v.value} <span className="text-ink-2">({v.matchCount})</span>
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {signal.newSellerPct !== null && signal.newSellerPct >= 20 && (
        <p className="flex items-center gap-1.5 border-t border-line bg-gain/5 px-4 py-2 text-xs text-gain-text">
          <Sprout size={12} aria-hidden />
          Approachable for a new seller — check /scout for who&apos;s already doing it.
        </p>
      )}
    </section>
  );
}
