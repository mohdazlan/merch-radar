import type { Metadata } from "next";
import { Suspense } from "react";
import { DemoBadge } from "@/components/shared/DemoBadge";
import { ActNowStrip } from "@/components/radar/ActNowStrip";
import { Timeline } from "@/components/radar/Timeline";
import { RadarClient } from "@/components/radar/RadarClient";
import { FIXTURE_EVENTS } from "@/lib/db/fixtures/events";

export const metadata: Metadata = { title: "Radar" };
// launch-by urgency must be computed per request, not frozen at build time
export const dynamic = "force-dynamic";

export default function RadarPage() {
  const now = new Date();

  return (
    <div className="mx-auto max-w-7xl space-y-8 px-4 py-10">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-black uppercase tracking-tight">
            Radar
          </h1>
          <p className="mt-1 max-w-prose text-sm text-ink-2">
            What to make, and by when. Launch-by = peak − lead time; miss it
            and the marketplace algorithm can&apos;t build velocity before
            demand crests.
          </p>
        </div>
        {/* seed events are synthetic regardless of the Demo Mode toggle —
            the badge stays until live event scoring exists (Rule 2) */}
        <DemoBadge always />
      </div>

      <ActNowStrip now={now} />
      <Timeline now={now} />

      <div id="trend-radar">
        <Suspense
          fallback={<p className="text-sm text-ink-2">Loading events…</p>}
        >
          <RadarClient events={FIXTURE_EVENTS} now={now.toISOString()} />
        </Suspense>
      </div>
    </div>
  );
}
