import { FIXTURE_EVENTS, launchBy, type FixtureEvent } from "@/lib/db/fixtures/events";

const DAY_MS = 86_400_000;

const TIER_BAR: Record<string, string> = {
  ultra: "border-riso-red/60 bg-riso-red/15 text-ink",
  major: "border-warn/60 bg-warn/10 text-ink",
  sports: "border-riso-blue/60 bg-riso-blue/15 text-ink",
  niche: "border-line bg-surface text-ink-2",
};

type Bar = {
  event: FixtureEvent;
  leftPct: number;
  widthPct: number;
  lane: number;
};

/**
 * §2 hand-rolled 13-month timeline — CSS grid + absolutely positioned
 * lane-packed bars (Recharts is the wrong tool for this). Each bar spans the
 * launch window: launch-by → peak.
 */
export function Timeline({ now }: { now: Date }) {
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 13, 1));
  const total = end.getTime() - start.getTime();

  const months: { label: string; leftPct: number }[] = [];
  for (let i = 0; i < 13; i++) {
    const m = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1));
    months.push({
      label: m.toLocaleDateString("en-US", { month: "short", timeZone: "UTC" }),
      leftPct: ((m.getTime() - start.getTime()) / total) * 100,
    });
  }

  // greedy lane packing, sorted by window start
  const windows = FIXTURE_EVENTS.map((event) => {
    const from = launchBy(event).getTime();
    const to = new Date(event.peakDate + "T00:00:00.000Z").getTime() + DAY_MS;
    return { event, from, to };
  })
    .filter((w) => w.to > start.getTime() && w.from < end.getTime())
    .sort((a, b) => a.from - b.from);

  const laneEnds: number[] = [];
  const bars: Bar[] = windows.map(({ event, from, to }) => {
    const clampedFrom = Math.max(from, start.getTime());
    const clampedTo = Math.min(to, end.getTime());
    let lane = laneEnds.findIndex((endT) => endT + 2 * DAY_MS <= clampedFrom);
    if (lane === -1) {
      lane = laneEnds.length;
      laneEnds.push(clampedTo);
    } else {
      laneEnds[lane] = clampedTo;
    }
    return {
      event,
      leftPct: ((clampedFrom - start.getTime()) / total) * 100,
      widthPct: Math.max(((clampedTo - clampedFrom) / total) * 100, 1.2),
      lane,
    };
  });

  const laneCount = laneEnds.length;
  const todayPct = ((now.getTime() - start.getTime()) / total) * 100;

  return (
    <section aria-label="13-month launch timeline" className="border border-line">
      <div className="flex items-baseline justify-between border-b border-line px-4 py-2">
        <h2 className="font-display text-sm font-black uppercase tracking-tight">
          Launch windows — next 13 months
        </h2>
        <span className="text-xs text-ink-2">
          bar = design &amp; list window (launch-by → peak)
        </span>
      </div>
      <div className="overflow-x-auto">
        <div className="relative min-w-[720px] px-0 py-2">
          {/* month grid */}
          <div className="relative h-5">
            {months.map((m) => (
              <span
                key={m.label + m.leftPct}
                className="absolute top-0 text-[10px] uppercase tracking-wide text-ink-2"
                style={{ left: `${m.leftPct}%` }}
              >
                {m.label}
              </span>
            ))}
          </div>
          <div
            className="relative"
            style={{ height: laneCount * 30 + 8 }}
            role="list"
            aria-label="Event launch windows"
          >
            {months.map((m) => (
              <span
                key={`line-${m.leftPct}`}
                aria-hidden
                className="absolute bottom-0 top-0 w-px bg-line"
                style={{ left: `${m.leftPct}%` }}
              />
            ))}
            <span
              aria-hidden
              className="absolute bottom-0 top-0 w-px bg-accent"
              style={{ left: `${todayPct}%` }}
            />
            {bars.map((b) => (
              <span
                key={b.event.slug}
                role="listitem"
                title={`${b.event.name}: design by ${launchBy(b.event).toISOString().slice(0, 10)}, peak ${b.event.peakDate}`}
                className={`absolute flex h-6 items-center overflow-hidden border px-1.5 text-[11px] font-medium whitespace-nowrap ${TIER_BAR[b.event.tier]}`}
                style={{
                  left: `${b.leftPct}%`,
                  width: `${b.widthPct}%`,
                  top: b.lane * 30 + 4,
                }}
              >
                {b.event.name}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="border-t border-line px-4 py-2 text-xs text-ink-2">
        <span className="text-riso-red">■</span> ultra ·{" "}
        <span className="text-warn-text">■</span> major ·{" "}
        <span className="text-riso-blue">■</span> sports ·{" "}
        <span>■</span> niche · vertical line = today
      </p>
    </section>
  );
}
