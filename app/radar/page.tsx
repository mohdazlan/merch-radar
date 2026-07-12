import type { Metadata } from "next";
import { CalendarClock } from "lucide-react";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { EmptyState } from "@/components/shared/EmptyState";
import { Chip, type ChipTone } from "@/components/shared/Chip";
import { FIXTURE_EVENTS, launchBy } from "@/lib/db/fixtures/events";

export const metadata: Metadata = { title: "Radar" };

const TIER_TONE: Record<string, ChipTone> = {
  ultra: "loss", // riso-red family reads as the ultra tier accent on paper
  major: "warn",
  sports: "blue", // riso-blue is the sports tier hue (§10)
  niche: "neutral",
};

function fmt(d: Date | string): string {
  return new Date(d).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function RadarPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            Radar
          </h1>
          <p className="mt-1 text-sm text-ink-2">
            What to make, and by when. Launch-by = peak − lead time.
          </p>
        </div>
        <DemoBadge />
      </div>

      <div className="mt-8 overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-ink-2">
              <th className="py-2 pr-4 font-medium">Event</th>
              <th className="py-2 pr-4 font-medium">Tier</th>
              <th className="py-2 pr-4 font-medium">Peak</th>
              <th className="py-2 pr-4 font-medium">Launch by</th>
              <th className="py-2 pr-4 text-right font-medium">Etsy</th>
              <th className="py-2 text-right font-medium">eBay</th>
            </tr>
          </thead>
          <tbody>
            {FIXTURE_EVENTS.map((e) => (
              <tr key={e.slug} className="border-b border-line">
                <td className="py-2.5 pr-4 font-medium">{e.name}</td>
                <td className="py-2.5 pr-4">
                  <Chip tone={TIER_TONE[e.tier] ?? "neutral"}>{e.tier}</Chip>
                </td>
                <td className="num py-2.5 pr-4">{fmt(e.peakDate)}</td>
                <td className="num py-2.5 pr-4">{fmt(launchBy(e))}</td>
                <td className="num py-2.5 pr-4 text-right">{e.etsyScore}</td>
                <td className="num py-2.5 text-right">{e.ebayScore}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-10" id="trend-radar">
        <EmptyState
          icon={CalendarClock}
          title="The 13-month timeline lands in M7"
          body="Lane-packed event bars, the Act Now strip, and Claude campaign briefs build on this data spine. The seed above is a demo subset of the 30-event dataset."
        />
      </div>
    </div>
  );
}
