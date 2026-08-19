import type { Metadata } from "next";
import { Terminal } from "lucide-react";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { SourcingTabs } from "@/components/sourcing/SourcingTabs";
import { SourcingClient } from "@/components/sourcing/SourcingClient";
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

/** low confidence must visibly drop the verdict's weight (§5.4) */
const WEAK_THRESHOLD = 50;

function buildRows() {
  return FIXTURE_PRODUCTS.map((p) => {
    const buy = DEMO_BUYS[p.key] ?? { buyCost: 10, shippingCost: 5 };
    const soldOk = p.sold.status === "OK" ? p.sold : null;
    const soldEstimate =
      p.sold.status === "BROWSE_ESTIMATE" ? p.sold : null;
    const hasSoldCount = soldOk ?? soldEstimate;

    const forecast = soldOk ? fitDecay(soldOk.series) : null;
    const decaySlope =
      forecast && forecast.status === "OK" ? forecast.slopePer90d : null;

    const metrics = computeMetrics({
      buyCost: buy.buyCost,
      shippingCost: buy.shippingCost,
      activeCount: p.active.activeCount,
      activePrices: p.active.prices,
      soldCount: hasSoldCount ? hasSoldCount.soldCount : null,
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
      soldCount: hasSoldCount ? hasSoldCount.soldCount : null,
      soldPrices: soldOk ? soldOk.prices : null,
      dataAgeDays: 1,
    });
    const weak =
      confidence.lowSample || confidence.confidence < WEAK_THRESHOLD;

    return { product: p, buy, metrics, verdict, confidence, weak };
  }).filter((r) => r !== null);
}

/** sticky first column so the item stays in view while the row scrolls */
const stickyCell =
  "sticky left-0 z-10 bg-bg shadow-[inset_-1px_0_0_0_var(--line)]";

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
          <p className="mt-1 max-w-prose text-sm text-ink-2">
            Should you buy it, at this cost? Every number here comes from a
            disclosed formula, and each verdict names the rule behind it.
          </p>
        </div>
        <DemoBadge always />
      </div>

      <div className="mt-6">
        <SourcingClient />
      </div>

      <h2 className="mt-12 font-display text-lg font-black uppercase tracking-tight">
        Demo scenarios
      </h2>
      <p className="mt-1 text-sm text-ink-2">
        Five fixture products through the same engines — type one into the
        form above to run it interactively.
      </p>

      {rows.length === 0 ? (
        <div className="mt-8">
          <EmptyState
            icon={Terminal}
            title="No analyses to show"
            body="No demo comps resolved into a priceable analysis. Once the Co-Pilot input lands, your own lookups appear here."
          />
        </div>
      ) : (
        <div
          className="mt-8 overflow-x-auto"
          tabIndex={0}
          role="region"
          aria-label="Sourcing analyses (scrollable)"
        >
          <table className="w-full min-w-[760px] border-collapse text-sm">
            <caption className="sr-only">
              Demo sourcing analyses computed by the fee, metrics, and verdict
              engines from fixture comps. The item column stays fixed while the
              table scrolls sideways.
            </caption>
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-ink-2">
                <th
                  scope="col"
                  className={`${stickyCell} border-b border-line py-2 pr-4 font-medium`}
                >
                  Item · demo buy
                </th>
                <th
                  scope="col"
                  className="border-b border-line py-2 pr-4 font-medium"
                >
                  Verdict
                </th>
                <th
                  scope="col"
                  className="border-b border-line py-2 pr-4 text-right font-medium"
                >
                  Est. sell
                </th>
                <th
                  scope="col"
                  className="border-b border-line py-2 pr-4 text-right font-medium"
                >
                  Net profit
                </th>
                <th
                  scope="col"
                  className="border-b border-line py-2 pr-4 text-right font-medium"
                >
                  ROI
                </th>
                <th
                  scope="col"
                  className="border-b border-line py-2 pr-4 text-right font-medium"
                >
                  Sell-through
                </th>
                <th
                  scope="col"
                  className="border-b border-line py-2 pr-4 text-right font-medium"
                >
                  Days to flip
                </th>
                <th
                  scope="col"
                  className="border-b border-line py-2 text-right font-medium"
                >
                  Profit / day
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map(
                ({ product, buy, metrics, verdict, confidence, weak }) => (
                  <tr key={product.key} className="align-top">
                    <th
                      scope="row"
                      className={`${stickyCell} border-b border-line py-3 pr-4 text-left font-normal`}
                    >
                      <div className="line-clamp-2 max-w-[240px] font-medium">
                        {product.title}
                      </div>
                      <div className="num mt-0.5 text-xs text-ink-2">
                        buy {money(buy.buyCost)} + ship{" "}
                        {money(buy.shippingCost)}
                      </div>
                    </th>
                    <td className="border-b border-line py-3 pr-4">
                      <div className="flex flex-col items-start gap-1">
                        <VerdictChip verdict={verdict.verdict} weak={weak} />
                        <span className="num text-xs text-ink-2">
                          {verdict.ruleId} · conf {confidence.confidence}%
                          {confidence.lowSample && " · low sample"}
                        </span>
                      </div>
                    </td>
                    <td className="num border-b border-line py-3 pr-4 text-right">
                      <div>{money(metrics.estSellPrice)}</div>
                      <div className="mt-0.5 text-xs text-ink-2">
                        {metrics.estSellPriceSource === "SOLD_MEDIAN"
                          ? "sold median"
                          : "active only"}
                      </div>
                    </td>
                    <td
                      className={`num border-b border-line py-3 pr-4 text-right font-medium ${
                        metrics.netProfit > 0
                          ? "text-gain-text"
                          : "text-loss-text"
                      }`}
                    >
                      {money(metrics.netProfit)}
                    </td>
                    <td className="num border-b border-line py-3 pr-4 text-right">
                      {pct(metrics.roi)}
                    </td>
                    <td className="num border-b border-line py-3 pr-4 text-right">
                      {metrics.sellThroughRate === null
                        ? na
                        : pct(metrics.sellThroughRate)}
                    </td>
                    <td className="num border-b border-line py-3 pr-4 text-right">
                      {metrics.daysToFlip === null
                        ? na
                        : Math.round(metrics.daysToFlip)}
                    </td>
                    <td
                      className={`num border-b border-line py-3 text-right font-medium ${
                        metrics.capitalPerDay === null
                          ? "text-ink-2"
                          : metrics.capitalPerDay > 0
                            ? "text-gain-text"
                            : "text-loss-text"
                      }`}
                    >
                      {metrics.capitalPerDay === null
                        ? na
                        : money(metrics.capitalPerDay)}
                    </td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-2">
        <div className="flex gap-1.5">
          <dt className="num">{na}</dt>
          <dd>requires sold data</dd>
        </div>
        <div className="flex gap-1.5">
          <dt className="num">Rn</dt>
          <dd>verdict rule that fired (full inputs in M2)</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Profit / day</dt>
          <dd>net profit ÷ days to flip — the velocity metric</dd>
        </div>
        <div className="flex gap-1.5">
          <dt>Est. sell</dt>
          <dd>a modeled estimate, not an observed price</dd>
        </div>
      </dl>

      <p className="mt-4 max-w-prose text-xs text-ink-2">
        Synthetic comps, real engines: every row is computed live by the fee
        waterfall, the sourcing metrics, and the ordered verdict rules — zero
        AI, zero API calls.
      </p>

    </div>
  );
}
