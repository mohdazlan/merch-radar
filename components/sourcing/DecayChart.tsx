"use client";

import {
  Area,
  ComposedChart,
  Line,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AlertTriangle, LineChart } from "lucide-react";
import { EmptyState } from "@/components/shared/EmptyState";
import { Chip } from "@/components/shared/Chip";
import { MIN_POINTS, type Forecast } from "@/lib/forecast/decay";
import type { CompsResult } from "@/lib/analysis/types";

const DAY_MS = 86_400_000;

type ChartPoint = {
  day: number;
  /** LIVE/DEMO observed sold price */
  observed?: number;
  /** MODELED projection */
  projected?: number;
  band?: [number, number];
};

/**
 * §6 decay forecast — an honest model. Historical solid, today marker,
 * dashed MODELED projection with a ±1σ band. Under 12 sold points it
 * refuses to forecast; refusing is a feature.
 */
export function DecayChart({
  comps,
  forecast,
}: {
  comps: CompsResult;
  forecast: Forecast | null;
}) {
  if (comps.sold.status !== "OK") {
    const hasBrowseCount =
      comps.sold.status === "BROWSE_HISTORY" ? comps.sold.count : 0;
    return (
      <EmptyState
        icon={LineChart}
        title="Forecast requires sold price history"
        body={
          hasBrowseCount > 0
            ? `We can see ${hasBrowseCount.toLocaleString()} lifetime units sold across matched listings, but the trend chart needs individual sold prices and dates from a defined 90-day window. Listing-history quantities are not used as 90-day velocity.`
            : "Sold history is unavailable for this query (Marketplace Insights not granted). No projection is drawn — we don't invent sold prices."
        }
      />
    );
  }
  if (!forecast || forecast.status === "INSUFFICIENT_DATA") {
    const n = forecast?.status === "INSUFFICIENT_DATA" ? forecast.n : 0;
    return (
      <EmptyState
        icon={LineChart}
        title={`Not enough sold history to forecast (n=${n})`}
        body={`A projection needs at least ${MIN_POINTS} sold data points. Treat this as an unmodeled buy.`}
      />
    );
  }

  const series = comps.sold.series;
  const t0 = Date.parse(series[0].date);
  const observed: ChartPoint[] = series.map((p) => ({
    day: Math.round((Date.parse(p.date) - t0) / DAY_MS),
    observed: p.price,
  }));
  const lastDay = observed[observed.length - 1].day;
  const lastFit = forecast.fitted[forecast.fitted.length - 1];
  const projected: ChartPoint[] = [
    { day: lastDay, projected: lastFit.price, band: [lastFit.lower, lastFit.upper] },
    ...forecast.projections.map((p) => ({
      day: p.day,
      projected: p.price,
      band: [p.lower, p.upper] as [number, number],
    })),
  ];
  const data = [...observed, ...projected];
  const decaying = forecast.slopePer90d < -0.08;

  return (
    <section aria-label="Price trend and 90-day forecast">
      <div className="mb-2 flex flex-wrap items-center gap-3">
        <h3 className="font-display text-sm font-black uppercase tracking-tight">
          Price trend + 90d forecast
        </h3>
        <Chip tone={comps.provenance === "DEMO" ? "warn" : "gain"}>
          history: {comps.provenance}
        </Chip>
        <Chip tone="accent">projection: MODELED ±1σ</Chip>
        <span className="num text-xs text-ink-2">
          slope {forecast.slopePer90d >= 0 ? "+" : ""}
          {Math.round(forecast.slopePer90d * 100)}%/90d · n={forecast.n}
        </span>
      </div>

      {decaying && (
        <p
          role="status"
          className="mb-2 flex items-start gap-2 border border-warn/60 bg-warn/10 px-3 py-2 text-sm text-warn-text"
        >
          <AlertTriangle size={15} className="mt-0.5 shrink-0" aria-hidden />
          Price decay warning: sold prices are trending{" "}
          {Math.abs(Math.round(forecast.slopePer90d * 100))}% lower per 90 days.
          If you buy, list immediately and price to move.
        </p>
      )}

      <div className="h-64 w-full border border-line bg-surface/40 p-2">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 8, right: 8, bottom: 4, left: 0 }}>
            <XAxis
              dataKey="day"
              type="number"
              domain={["dataMin", "dataMax"]}
              tick={{ fontSize: 11, fill: "var(--ink-2)" }}
              stroke="var(--line)"
              label={{
                value: "days",
                position: "insideBottomRight",
                fontSize: 10,
                fill: "var(--ink-2)",
              }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: "var(--ink-2)" }}
              stroke="var(--line)"
              width={44}
              tickFormatter={(v: number) => `$${v}`}
            />
            <Tooltip
              contentStyle={{
                background: "var(--surface)",
                border: "1px solid var(--line)",
                fontSize: 12,
                fontFamily: "var(--font-plex-mono)",
                color: "var(--ink)",
              }}
              formatter={(value, name) => {
                if (Array.isArray(value)) {
                  const [lo, hi] = value as [number, number];
                  return [`$${lo} – $${hi}`, "±1σ band"];
                }
                return [
                  `$${Number(value).toFixed(2)}`,
                  name === "observed"
                    ? `sold (${comps.provenance})`
                    : "projected (MODELED)",
                ];
              }}
              labelFormatter={(d) => `day ${String(d)} · n=${forecast.n}`}
            />
            <Area
              dataKey="band"
              stroke="none"
              fill="var(--accent)"
              fillOpacity={0.12}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              dataKey="observed"
              stroke="var(--ink)"
              strokeWidth={1.5}
              dot={{ r: 1.5, fill: "var(--ink)" }}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              dataKey="projected"
              stroke="var(--accent)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              connectNulls
              isAnimationActive={false}
            />
            <ReferenceLine
              x={lastDay}
              stroke="var(--ink-2)"
              strokeDasharray="2 3"
              label={{
                value: "today",
                fontSize: 10,
                fill: "var(--ink-2)",
                position: "top",
              }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </section>
  );
}
