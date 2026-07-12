/**
 * Radar seed events (subset for the M0 placeholder — the full 30-event
 * dataset lands with M7). launchBy is derived, never stored:
 * launchBy = peakDate − leadWeeks × 7d.
 */

export type FixtureEvent = {
  slug: string;
  name: string;
  tier: "ultra" | "major" | "sports" | "niche";
  region: string;
  peakDate: string;
  leadWeeks: number;
  etsyScore: number;
  ebayScore: number;
};

export const FIXTURE_EVENTS: FixtureEvent[] = [
  {
    slug: "back-to-school-2026",
    name: "Back to School",
    tier: "major",
    region: "US",
    peakDate: "2026-08-20",
    leadWeeks: 6,
    etsyScore: 78,
    ebayScore: 71,
  },
  {
    slug: "halloween-2026",
    name: "Halloween",
    tier: "ultra",
    region: "Global",
    peakDate: "2026-10-31",
    leadWeeks: 10,
    etsyScore: 96,
    ebayScore: 88,
  },
  {
    slug: "nfl-kickoff-2026",
    name: "NFL Season Kickoff",
    tier: "sports",
    region: "US",
    peakDate: "2026-09-10",
    leadWeeks: 5,
    etsyScore: 62,
    ebayScore: 84,
  },
  {
    slug: "bfcm-2026",
    name: "Black Friday / Cyber Monday",
    tier: "ultra",
    region: "Global",
    peakDate: "2026-11-27",
    leadWeeks: 8,
    etsyScore: 90,
    ebayScore: 94,
  },
  {
    slug: "christmas-2026",
    name: "Christmas",
    tier: "ultra",
    region: "Global",
    peakDate: "2026-12-25",
    leadWeeks: 12,
    etsyScore: 98,
    ebayScore: 92,
  },
];

export function launchBy(e: FixtureEvent): Date {
  const peak = new Date(e.peakDate + "T00:00:00.000Z");
  return new Date(peak.getTime() - e.leadWeeks * 7 * 86_400_000);
}
