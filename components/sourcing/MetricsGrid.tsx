import { ProvenanceTag } from "@/components/shared/Chip";
import type { Analysis } from "@/lib/analysis/compute";
import type { CompsResult } from "@/lib/analysis/types";

const money = (x: number) => `$${x.toFixed(2)}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;

/**
 * §5.6 six data tiles — dense and terminal-like, not the SaaS hero-metric
 * template. Each value carries provenance; Profit/day is the featured number.
 */
export function MetricsGrid({
  analysis,
  comps,
}: {
  analysis: Analysis;
  comps: CompsResult;
}) {
  const m = analysis.metrics;
  const estProv =
    comps.provenance === "DEMO"
      ? "DEMO"
      : m.estSellPriceSource === "SOLD_MEDIAN"
        ? "MODELED"
        : "MODELED";
  const soldMissing = m.sellThroughRate === null;

  const tiles: {
    label: string;
    value: string;
    provenance: "LIVE" | "MODELED" | "DEMO" | "UNAVAILABLE";
    tone?: "gain" | "loss";
    note?: string;
    featured?: boolean;
  }[] = [
    {
      label: "Est. sell price",
      value: money(m.estSellPrice),
      provenance: estProv,
      note: m.estSellPriceSource === "SOLD_MEDIAN" ? "sold median" : "active × 0.88",
    },
    {
      label: "Net profit / unit",
      value: money(m.netProfit),
      provenance: estProv,
      tone: m.netProfit > 0 ? "gain" : "loss",
    },
    { label: "ROI", value: pct(m.roi), provenance: estProv },
    {
      label: "Sell-through rate",
      value: soldMissing ? "—" : pct(m.sellThroughRate!),
      provenance: soldMissing ? "UNAVAILABLE" : estProv,
      note: soldMissing ? "requires sold data" : "sold ÷ (sold + active)",
    },
    {
      label: "Days to flip",
      value: m.daysToFlip === null ? "—" : String(Math.round(m.daysToFlip)),
      provenance: m.daysToFlip === null ? "UNAVAILABLE" : estProv,
    },
    {
      label: "Profit / day",
      value: m.capitalPerDay === null ? "—" : money(m.capitalPerDay),
      provenance: m.capitalPerDay === null ? "UNAVAILABLE" : estProv,
      tone:
        m.capitalPerDay === null
          ? undefined
          : m.capitalPerDay > 0
            ? "gain"
            : "loss",
      note: "the velocity metric",
      featured: true,
    },
  ];

  return (
    <dl className="grid grid-cols-2 gap-px border border-line bg-line md:grid-cols-3 lg:grid-cols-6">
      {tiles.map((t) => (
        <div
          key={t.label}
          className={`flex flex-col gap-1 p-3 ${t.featured ? "bg-surface" : "bg-bg"}`}
        >
          <dt className="text-xs uppercase tracking-wide text-ink-2">
            {t.label}
          </dt>
          <dd
            className={`num text-lg font-medium ${
              t.tone === "gain"
                ? "text-gain-text"
                : t.tone === "loss"
                  ? "text-loss-text"
                  : "text-ink"
            }`}
          >
            {t.value}
          </dd>
          <dd className="flex items-center gap-1.5">
            <ProvenanceTag kind={t.provenance} />
            {t.note && <span className="text-[11px] text-ink-2">{t.note}</span>}
          </dd>
        </div>
      ))}
    </dl>
  );
}
