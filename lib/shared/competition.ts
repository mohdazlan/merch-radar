/**
 * Shared competition-pressure classifier — one set of thresholds used
 * everywhere active-listing counts are turned into a plain-language read
 * (Middleman, Trends), so the two features can't silently drift apart.
 */

export type CompetitionPressure = "NONE" | "THIN" | "HEALTHY" | "SATURATED";

export function classifyCompetitionPressure(activeCount: number): CompetitionPressure {
  if (activeCount <= 0) return "NONE";
  if (activeCount < 5) return "THIN";
  if (activeCount < 40) return "HEALTHY";
  return "SATURATED";
}
