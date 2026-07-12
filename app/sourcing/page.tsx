import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Chip, ProvenanceTag } from "@/components/shared/Chip";
import { SourcingTabs } from "@/components/sourcing/SourcingTabs";
import { VerdictChip } from "@/components/sourcing/VerdictChip";
import { FIXTURE_PRODUCTS } from "@/lib/db/fixtures/comps";
import { fitDecay } from "@/lib/forecast/decay";
import { DEFAULT_PRESET } from "@/lib/fees/presets";
import { computeMetrics } from "@/lib/verdict/metrics";
import { computeConfidence, evaluateVerdict } from "@/lib/verdict/engine";

export const metadata: Metadata = { title: "Sourcing" };

/** demo buy scenarios per fixture — the numbers a reseller would type in */
const DEMO_BUYS: Record<string, { buyCost: number; shippingCost: number }> = {
  "nintendo switch oled console": { buyCost: 150, shippingCost: 10 },
  "stanley quencher 40oz tumbler": { buyCost: 15, shippingCost: 6.5 },
  "funko pop grogu 1105": { buyCost: 4, shippingCost: 4.5 },
  "vintage pyrex butterfly gold bowl": { buyCost: 12, shippingCost: 8 },
  "apple airpods pro 2nd gen": { buyCost: 118, shippingCost: 5 },
};

const money = (x: number) => `$${x.toFixed(2)}`;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const na = "—";

function buildRows() {
  return FIXTURE_PRODUCTS.map((p) => {
    const buy = DEMO_BUYS[p.key] ?? { buyCost: 10, shippingCost: 5 };
    const soldOk = p.sold.status === "OK" ? p.sold : null;
    const forecast = soldOk ? fitDecay(soldOk.series) : null;
    const decaySlope =
      forecast && forecast.status === "OK" ? forecast.slopePer90d : null;

    const metrics = computeMetrics({
      buyCost: buy.buyCost,
      shippingCost: buy.shippingCost,
      activeCount: p.active.activeCount,
      activePrices: p.active.prices,
      soldCount: soldOk ? soldOk.soldCount : null,
      soldPrices: soldOk ? soldOk.prices : null,
      decaySlope,
      preset: DEFAULT_PRESET,
    });
    if (metrics.status !== "OK") return null;

    const verdict = evaluateVerdict({
      roi: metrics.roi,
      netProfit: metrics.netProfit,
      sellThroughRate: metrics.sellThroughRate,
      daysToFlip: metrics.daysToFlip,
      decaySlope,
    });
    const confidence = computeConfidence({
      soldCount: soldOk ? soldOk.soldCount : null,
      soldPrices: soldOk ? soldOk.prices : null,
      dataAgeDays: 1,
    });

    return { product: p, buy, metrics, verdict, confidence };
  }).filter((r) => r !== null);
}

export default function SourcingPage() {
  const rows = buildRows();

  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <SourcingTabs />
      <div className="mt-6 flex flex-wrap items-center justify-between gap-3 min-[900px]:mt-0">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            ApexSourcing Engine
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            Should you buy it, at this cost? Math in TypeScript, judgment on
            top — every verdict names the rule that fired.
          </p>
        </div>
        <DemoBadge always />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[880px] border-collapse text-sm">
          <caption className="sr-only">
            Demo sourcing analyses computed by the fee, metrics, and verdict
            engines from fixture comps
          </caption>
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-2">
              <th className="py-2 pr-4 font-medium">Item · demo buy</th>
              <th className="py-2 pr-4 text-right font-medium">Est. sell</th>
              <th className="py-2 pr-4 text-right font-medium">Net profit</th>
              <th className="py-2 pr-4 text-right font-medium">ROI</th>
              <th className="py-2 pr-4 text-right font-medium">STR</th>
              <th className="py-2 pr-4 text-right font-medium">Days to flip</th>
              <th className="py-2 pr-4 text-right font-medium">Profit/day</th>
              <th className="py-2 font-medium">Verdict</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(({ product, buy, metrics, verdict, confidence }) => (
              <tr key={product.key} className="border-b border-line align-top">
                <td className="py-3 pr-4">
                  <div className="font-medium">{product.title}</div>
                  <div className="num mt-0.5 text-xs text-ink-2">
                    buy {money(buy.buyCost)} + ship {money(buy.shippingCost)}
                  </div>
                </td>
                <td className="num py-3 pr-4 text-right">
                  <div>{money(metrics.estSellPrice)}</div>
                  <div className="mt-0.5 flex justify-end">
                    <ProvenanceTag
                      kind={
                        metrics.estSellPriceSource === "SOLD_MEDIAN"
                          ? "DEMO"
                          : "MODELED"
                      }
                    />
                  </div>
                </td>
                <td
                  className={`num py-3 pr-4 text-right font-medium ${
                    metrics.netProfit > 0 ? "text-gain-text" : "text-loss-text"
                  }`}
                >
                  {money(metrics.netProfit)}
                </td>
                <td className="num py-3 pr-4 text-right">{pct(metrics.roi)}</td>
                <td className="num py-3 pr-4 text-right">
                  {metrics.sellThroughRate === null ? (
                    <span title="requires sold data">{na}</span>
                  ) : (
                    pct(metrics.sellThroughRate)
                  )}
                </td>
                <td className="num py-3 pr-4 text-right">
                  {metrics.daysToFlip === null
                    ? na
                    : Math.round(metrics.daysToFlip)}
                </td>
                <td className="num py-3 pr-4 text-right">
                  {metrics.capitalPerDay === null
                    ? na
                    : money(metrics.capitalPerDay)}
                </td>
                <td className="py-3">
                  <div className="flex flex-col items-start gap-1">
                    <VerdictChip verdict={verdict.verdict} />
                    <span className="num text-xs text-ink-2">
                      {verdict.ruleId} · conf {confidence.confidence}%
                    </span>
                    {confidence.lowSample && (
                      <Chip tone="warn">Low sample</Chip>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="mt-3 text-xs text-ink-2">
        Synthetic comps, real engines: these rows are computed live by the fee
        waterfall, §5.3 metrics, and the ordered verdict rules — zero AI, zero
        API calls.
      </p>

      <div className="mt-10">
        <EmptyState
          icon={Terminal}
          title="The Co-Pilot input panel lands in M2"
          body="Type a product and a buy cost, get the verdict banner with its Why? disclosure, the six-tile metrics grid, and the interactive fee waterfall."
        />
      </div>
    </div>
  );
}
