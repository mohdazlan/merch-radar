import { AlarmClock } from "lucide-react";
import {
  daysUntilLaunchBy,
  FIXTURE_EVENTS,
  launchBy,
} from "@/lib/db/fixtures/events";

/**
 * The operator strip: events whose launch window is open (or opens within a
 * week) right now, most urgent first. This is the "what do I do today"
 * answer that static holiday calendars never give.
 */
export function ActNowStrip({ now }: { now: Date }) {
  const actNow = FIXTURE_EVENTS.map((e) => ({
    e,
    days: daysUntilLaunchBy(e, now),
    peakPassed: new Date(e.peakDate + "T00:00:00.000Z") < now,
  }))
    .filter((x) => !x.peakPassed && x.days <= 7)
    .sort((a, b) => b.days - a.days) // least-overdue → most time left
    .slice(0, 4);

  if (actNow.length === 0) return null;

  return (
    <section
      aria-label="Act now — launch windows closing"
      className="border border-riso-red/50"
    >
      <div className="flex items-center gap-2 border-b border-line px-4 py-2">
        <AlarmClock size={14} className="text-riso-red" aria-hidden />
        <h2 className="font-display text-sm font-black uppercase tracking-tight">
          Act now
        </h2>
        <span className="text-xs text-ink-2">
          design &amp; list before the algorithm window closes
        </span>
      </div>
      <ul className="grid gap-px bg-line sm:grid-cols-2 lg:grid-cols-4">
        {actNow.map(({ e, days }) => (
          <li key={e.slug} className="bg-bg p-3">
            <p className="font-medium">{e.name}</p>
            <p className="num mt-0.5 text-xs">
              {days < 0 ? (
                <span className="text-loss-text">
                  launch-by passed {Math.abs(days)}d ago — list today
                </span>
              ) : (
                <span className="text-warn-text">{days}d to launch-by</span>
              )}
            </p>
            <p className="num mt-0.5 text-xs text-ink-2">
              list by {launchBy(e).toISOString().slice(0, 10)} · peak{" "}
              {e.peakDate}
            </p>
          </li>
        ))}
      </ul>
    </section>
  );
}
