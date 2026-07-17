"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { FileText, X } from "lucide-react";
import { Chip, type ChipTone } from "@/components/shared/Chip";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { CopyButton } from "@/components/shared/CopyButton";
import {
  daysUntilLaunchBy,
  launchBy,
  type FixtureEvent,
} from "@/lib/db/fixtures/events";

const TIER_TONE: Record<string, ChipTone> = {
  ultra: "loss",
  major: "warn",
  sports: "blue",
  niche: "neutral",
};
const TIERS = ["ultra", "major", "sports", "niche"] as const;

type Brief = {
  hooks: string[];
  listingTitles: string[];
  productAngles: string[];
  timing: string;
};

/** deterministic fallback brief straight from the event's seed fields */
function demoBrief(e: FixtureEvent): Brief {
  return {
    hooks: e.niches.map(
      (n) => `Speak to ${n} — make them feel seen before ${e.name}.`,
    ),
    listingTitles: e.keywords
      .slice(0, 3)
      .map((k, i) => `${titleCase(k)} · ${e.products[i % e.products.length]} for ${e.name}`),
    productAngles: e.products.map(
      (p, i) => `${titleCase(p)} in the "${e.designDirections[i % e.designDirections.length]}" direction`,
    ),
    timing: `Designs final ${e.leadWeeks} weeks before the ${e.peakDate} peak (by ${launchBy(e).toISOString().slice(0, 10)}). List immediately after — marketplace algorithms need review velocity before demand crests.`,
  };
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export function RadarClient({
  events,
  now,
}: {
  events: FixtureEvent[];
  now: string;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const tierFilter = params.get("tier");
  const nowDate = useMemo(() => new Date(now), [now]);

  const [selected, setSelected] = useState<FixtureEvent | null>(null);
  const [brief, setBrief] = useState<{
    brief: Brief;
    source: "AI" | "DEMO";
  } | null>(null);
  const [briefLoading, setBriefLoading] = useState(false);

  const filtered = useMemo(() => {
    return events
      .filter((e) => !tierFilter || e.tier === tierFilter)
      .filter((e) => new Date(e.peakDate + "T00:00:00.000Z") >= nowDate)
      .sort((a, b) => a.peakDate.localeCompare(b.peakDate));
  }, [events, tierFilter, nowDate]);

  function setTier(tier: string | null) {
    const next = new URLSearchParams(params.toString());
    if (tier) next.set("tier", tier);
    else next.delete("tier");
    router.replace(`/radar${next.size ? `?${next}` : ""}`, { scroll: false });
  }

  async function openBrief(e: FixtureEvent) {
    setSelected(e);
    setBrief(null);
    setBriefLoading(true);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: e.name,
          peakDate: e.peakDate,
          leadWeeks: e.leadWeeks,
          keywords: e.keywords,
          niches: e.niches,
          designDirections: e.designDirections,
          products: e.products,
        }),
      });
      const data = (await res.json()) as {
        available: boolean;
        brief?: Brief;
      };
      if (data.available && data.brief) {
        setBrief({ brief: data.brief, source: "AI" });
      } else {
        setBrief({ brief: demoBrief(e), source: "DEMO" });
      }
    } catch {
      setBrief({ brief: demoBrief(e), source: "DEMO" });
    } finally {
      setBriefLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <div
        role="group"
        aria-label="Filter by tier"
        className="flex flex-wrap items-center gap-2"
      >
        <span className="text-xs uppercase tracking-wide text-ink-2">Tier:</span>
        <button
          type="button"
          onClick={() => setTier(null)}
          aria-pressed={!tierFilter}
          className={`min-h-11 border px-3 text-xs font-medium uppercase ${
            !tierFilter ? "border-accent text-ink" : "border-line text-ink-2"
          }`}
        >
          All
        </button>
        {TIERS.map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTier(t)}
            aria-pressed={tierFilter === t}
            className={`min-h-11 border px-3 text-xs font-medium uppercase ${
              tierFilter === t ? "border-accent text-ink" : "border-line text-ink-2"
            }`}
          >
            {t}
          </button>
        ))}
        <span className="num ml-auto text-xs text-ink-2">
          {filtered.length} upcoming events
        </span>
      </div>

      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Event table (scrollable)">
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-2">
              <th scope="col" className="py-2 pr-4 font-medium">Event</th>
              <th scope="col" className="py-2 pr-4 font-medium">Tier</th>
              <th scope="col" className="py-2 pr-4 font-medium">Peak</th>
              <th scope="col" className="py-2 pr-4 font-medium">Launch by</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Days left</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">Etsy</th>
              <th scope="col" className="py-2 pr-4 text-right font-medium">eBay</th>
              <th scope="col" className="py-2 font-medium">
                <span className="sr-only">Campaign brief</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((e) => {
              const days = daysUntilLaunchBy(e, nowDate);
              return (
                <tr key={e.slug} className="border-b border-line">
                  <td className="py-2.5 pr-4 font-medium">{e.name}</td>
                  <td className="py-2.5 pr-4">
                    <Chip tone={TIER_TONE[e.tier] ?? "neutral"}>{e.tier}</Chip>
                  </td>
                  <td className="num py-2.5 pr-4">{fmt(e.peakDate)}</td>
                  <td className="num py-2.5 pr-4">{fmt(launchBy(e))}</td>
                  <td
                    className={`num py-2.5 pr-4 text-right ${
                      days < 0
                        ? "text-loss-text"
                        : days <= 14
                          ? "text-warn-text"
                          : ""
                    }`}
                  >
                    {days < 0 ? `${days}` : days}
                  </td>
                  <td className="num py-2.5 pr-4 text-right">{e.etsyScore}</td>
                  <td className="num py-2.5 pr-4 text-right">{e.ebayScore}</td>
                  <td className="py-2.5">
                    <button
                      type="button"
                      onClick={() => void openBrief(e)}
                      className="inline-flex min-h-11 items-center gap-1 border border-line px-2.5 text-xs font-medium hover:border-ink-2"
                    >
                      <FileText size={12} aria-hidden />
                      Brief
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selected && (
        <section
          aria-label={`Campaign brief for ${selected.name}`}
          className="border border-line"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-4 py-3">
            <h3 className="font-display text-base font-black uppercase tracking-tight">
              {selected.name} — campaign brief
            </h3>
            <div className="flex items-center gap-2">
              {brief?.source === "DEMO" && <DemoBadge always />}
              {brief?.source === "AI" && <Chip tone="accent">AI</Chip>}
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setBrief(null);
                }}
                aria-label="Close brief"
                className="inline-flex h-11 w-11 items-center justify-center border border-line hover:border-ink-2"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          </div>
          {briefLoading && (
            <p role="status" className="px-4 py-3 text-sm text-ink-2">
              Building brief…
            </p>
          )}
          {brief && (
            <div className="grid gap-4 px-4 py-4 md:grid-cols-2">
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-2">
                  Hooks
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {brief.brief.hooks.map((h) => (
                    <li key={h}>{h}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-2">
                  Listing titles
                </h4>
                <ul className="space-y-1 text-sm">
                  {brief.brief.listingTitles.map((t) => (
                    <li key={t} className="flex items-center justify-between gap-2">
                      <span className="num text-xs">{t}</span>
                      <CopyButton text={t} label="Copy" />
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-2">
                  Product angles
                </h4>
                <ul className="list-inside list-disc space-y-1 text-sm">
                  {brief.brief.productAngles.map((p) => (
                    <li key={p}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="mb-1 text-xs font-medium uppercase tracking-wide text-ink-2">
                  Timing
                </h4>
                <p className="text-sm">{brief.brief.timing}</p>
                {brief.source === "DEMO" && (
                  <p className="mt-2 text-xs text-ink-2">
                    Deterministic brief assembled from the event&apos;s seed
                    fields — set ANTHROPIC_API_KEY for a generated one.
                  </p>
                )}
              </div>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
