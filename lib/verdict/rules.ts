/**
 * §5.4 verdict rules — deterministic, ordered, auditable. First match wins.
 * Every verdict shows which rule fired and the inputs behind it (Rule 3).
 * Conditions over null inputs (sold data unavailable, no trend) are false —
 * a rule never fires on data we don't have.
 */

export type Verdict =
  | "STRONG BUY"
  | "BUY"
  | "CAUTION — SHORT FLIP"
  | "CAUTION — THIN MARGIN"
  | "PASS — NEGATIVE MARGIN"
  | "PASS — DEAD STOCK RISK"
  | "PASS — PRICE DECAY";

export type RuleInput = {
  roi: number;
  netProfit: number;
  sellThroughRate: number | null;
  daysToFlip: number | null;
  decaySlope: number | null;
};

export type RuleDef = {
  id: string;
  verdict: Verdict;
  when: (m: RuleInput) => boolean;
  reason: (m: RuleInput) => string;
};

const pct = (x: number) => `${Math.round(x * 100)}%`;
const days = (x: number | null) => (x === null ? "n/a" : `${Math.round(x)}d`);

export const RULES: RuleDef[] = [
  {
    id: "R1_NEGATIVE_MARGIN",
    verdict: "PASS — NEGATIVE MARGIN",
    when: (m) => m.roi < 0 || m.netProfit <= 0,
    reason: (m) =>
      `Net profit is $${m.netProfit.toFixed(2)} after fees and shipping — you lose money on every unit.`,
  },
  {
    id: "R2_DEAD_STOCK",
    verdict: "PASS — DEAD STOCK RISK",
    when: (m) =>
      m.sellThroughRate !== null &&
      m.daysToFlip !== null &&
      m.sellThroughRate < 0.2 &&
      m.daysToFlip > 60,
    reason: (m) =>
      `Sell-through is ${pct(m.sellThroughRate!)} with ~${days(m.daysToFlip)} to flip — capital would sit in dead stock.`,
  },
  {
    id: "R3_PRICE_DECAY",
    verdict: "PASS — PRICE DECAY",
    when: (m) =>
      m.decaySlope !== null &&
      m.daysToFlip !== null &&
      m.decaySlope < -0.15 &&
      m.daysToFlip > 30,
    reason: (m) =>
      `Price is falling ${pct(Math.abs(m.decaySlope!))} per 90d and the flip takes ~${days(m.daysToFlip)} — the margin decays before you sell.`,
  },
  {
    id: "R4_STRONG_BUY",
    verdict: "STRONG BUY",
    when: (m) =>
      m.sellThroughRate !== null &&
      m.daysToFlip !== null &&
      m.roi >= 0.4 &&
      m.sellThroughRate >= 0.6 &&
      m.daysToFlip <= 21,
    reason: (m) =>
      `${pct(m.roi)} ROI with ${pct(m.sellThroughRate!)} sell-through and ~${days(m.daysToFlip)} to flip.`,
  },
  {
    id: "R5_BUY",
    verdict: "BUY",
    when: (m) =>
      m.sellThroughRate !== null && m.roi >= 0.25 && m.sellThroughRate >= 0.4,
    reason: (m) =>
      `${pct(m.roi)} ROI with ${pct(m.sellThroughRate!)} sell-through clears the buy bar.`,
  },
  {
    id: "R6_SHORT_FLIP",
    verdict: "CAUTION — SHORT FLIP",
    when: (m) => m.decaySlope !== null && m.roi >= 0.2 && m.decaySlope < -0.08,
    reason: (m) =>
      `${pct(m.roi)} ROI is real but price is decaying ${pct(Math.abs(m.decaySlope!))}/90d — list immediately and price to move.`,
  },
  {
    id: "R7_THIN_MARGIN",
    verdict: "CAUTION — THIN MARGIN",
    when: () => true,
    reason: (m) =>
      `${pct(m.roi)} ROI doesn't clear any buy rule — margin is thin or demand signals are missing.`,
  },
];
