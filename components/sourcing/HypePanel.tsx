"use client";

import { useEffect, useState } from "react";
import { HelpCircle, Minus, TrendingDown, TrendingUp } from "lucide-react";
import { DemoBadge } from "@/components/shared/DemoBadge";
import {
  DemoSentimentSource,
  type SentimentSignal,
} from "@/lib/sentiment/SentimentSource";

const TrendIcon = { up: TrendingUp, down: TrendingDown, flat: Minus };

/**
 * §7 hype tracker — synthetic at MVP and unmistakably badged as such.
 * The gauges are rendered inside a container with a permanent DEMO badge
 * that cannot be dismissed. Do not blur the line.
 */
export function HypePanel({ query }: { query: string }) {
  const [signals, setSignals] = useState<SentimentSignal[] | null>(null);

  useEffect(() => {
    let live = true;
    new DemoSentimentSource().getSignals(query).then((s) => {
      if (live) setSignals(s);
    });
    return () => {
      live = false;
    };
  }, [query]);

  return (
    <section
      aria-label="Sentiment and hype signals (demo data)"
      className="border border-warn/50"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
        <h3 className="font-display text-sm font-black uppercase tracking-tight">
          Hype &amp; sentiment
        </h3>
        <span className="inline-flex items-center gap-2">
          <DemoBadge always />
          <span className="text-[11px] uppercase tracking-wide text-warn-text">
            not live
          </span>
        </span>
      </div>
      <div className="grid gap-px bg-line sm:grid-cols-3">
        {(signals ?? []).map((s) => {
          const Icon = TrendIcon[s.trend];
          return (
            <div key={s.id} className="bg-bg p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs uppercase tracking-wide text-ink-2">
                  {s.label}
                </span>
                <span title={s.note} className="cursor-help text-ink-2">
                  <HelpCircle size={12} aria-hidden />
                  <span className="sr-only">{s.note}</span>
                </span>
              </div>
              <div className="mt-1 flex items-center gap-2">
                <span className="num text-lg font-medium">{s.value}</span>
                <Icon size={14} className="text-ink-2" aria-hidden />
              </div>
              <div
                role="img"
                aria-label={`${s.label}: ${s.value} of 100 (synthetic demo value)`}
                className="mt-2 h-1 w-full bg-surface"
              >
                <div
                  className="h-1 bg-warn/70"
                  style={{ width: `${s.value}%` }}
                />
              </div>
            </div>
          );
        })}
        {!signals && (
          <p className="bg-bg p-3 text-sm text-ink-2 sm:col-span-3">
            Loading demo gauges…
          </p>
        )}
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-2">
        How we&apos;ll source this: Reddit public JSON for mention velocity, a
        licensed trends provider, and Keepa/Rainforest for BSR. TikTok stays a
        paid-provider slot — we don&apos;t fake it, so it&apos;s synthetic
        until then.
      </p>
    </section>
  );
}
