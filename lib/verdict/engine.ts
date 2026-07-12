import { mean, stddev } from "@/lib/stats";
import { RULES, type RuleInput, type Verdict } from "@/lib/verdict/rules";

/**
 * Verdict engine — a rule engine, not an oracle (Rule 3). Evaluates the
 * ordered rules in §5.4; first match wins. Confidence is a separate
 * computation reflecting data quality, never enthusiasm.
 */

export type VerdictResult = {
  verdict: Verdict;
  ruleId: string;
  reason: string;
  /** the exact inputs the rule saw — powers the "Why?" disclosure */
  inputs: RuleInput;
};

export function evaluateVerdict(inputs: RuleInput): VerdictResult {
  for (const rule of RULES) {
    if (rule.when(inputs)) {
      return {
        verdict: rule.verdict,
        ruleId: rule.id,
        reason: rule.reason(inputs),
        inputs,
      };
    }
  }
  // unreachable: R7 always matches
  throw new Error("verdict rules exhausted — R7 must be a catch-all");
}

export type ConfidenceInput = {
  /** null = sold data unavailable */
  soldCount: number | null;
  soldPrices: number[] | null;
  /** days since comps were fetched, default 0 (fresh) */
  dataAgeDays?: number;
  /** 0–1 similarity of comp titles to the query, default 0.8 */
  titleMatchQuality?: number;
};

export type Confidence = {
  /** 0–100 int */
  confidence: number;
  /** fewer than 5 sold comps — render the LOW SAMPLE warning */
  lowSample: boolean;
};

// weights: sample size, price variance (inverse), freshness, title match
const W1 = 0.4;
const W2 = 0.25;
const W3 = 0.2;
const W4 = 0.15;

/** confidence caps at 40% below this many sold comps */
export const LOW_SAMPLE_THRESHOLD = 5;
export const LOW_SAMPLE_CAP = 40;

export function computeConfidence(input: ConfidenceInput): Confidence {
  const soldCount = input.soldCount ?? 0;
  const soldPrices = input.soldPrices ?? [];

  const sampleScore = Math.min(soldCount / 30, 1);

  let varianceScore = 0;
  if (soldPrices.length >= 2) {
    const m = mean(soldPrices);
    const cv = m > 0 ? stddev(soldPrices) / m : 1;
    varianceScore = 1 - Math.min(cv, 1);
  }

  const age = input.dataAgeDays ?? 0;
  const freshnessScore = Math.max(1 - age / 7, 0);

  const titleScore = input.titleMatchQuality ?? 0.8;

  let confidence = Math.round(
    (W1 * sampleScore + W2 * varianceScore + W3 * freshnessScore + W4 * titleScore) *
      100,
  );

  const lowSample = soldCount < LOW_SAMPLE_THRESHOLD;
  if (lowSample) confidence = Math.min(confidence, LOW_SAMPLE_CAP);

  return { confidence, lowSample };
}
