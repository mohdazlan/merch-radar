/**
 * Prompt shapes per spec §7/§9 — Claude receives computed numbers as input
 * and returns narrative only. It never recalculates or invents a number.
 */

export type AnalyzePromptInput = {
  title: string;
  condition: string;
  platform: string;
  buyCost: number;
  estSellPrice: number;
  netProfit: number;
  roi: number;
  str: number | null;
  activeCount: number;
  soldCount: number | null;
  decaySlope: number | null;
  daysToFlip: number | null;
  capitalPerDay: number | null;
  verdict: string;
  ruleId: string;
  confidence: number;
  sentiment?: string;
};

const show = (v: number | null, digits = 2) =>
  v === null ? "UNAVAILABLE" : v.toFixed(digits);

export function riskNarrativePrompt(i: AnalyzePromptInput): string {
  return `You are a sourcing risk analyst for high-volume marketplace resellers.
You will receive computed marketplace metrics. Do NOT recalculate or invent any numbers —
reason only over the values given. If a value is missing, say so rather than estimating it.

Product: ${i.title} | Condition: ${i.condition} | Platform: ${i.platform}
Buy cost: ${i.buyCost.toFixed(2)} | Est. sell: ${i.estSellPrice.toFixed(2)} | Net profit: ${i.netProfit.toFixed(2)} | ROI: ${show(i.roi)}
Sell-through: ${show(i.str)} | Active listings: ${i.activeCount} | Sold (90d): ${i.soldCount ?? "UNAVAILABLE"}
Price trend (90d slope): ${show(i.decaySlope, 3)} | Days to flip: ${show(i.daysToFlip, 0)} | Profit/day: ${show(i.capitalPerDay)}
Verdict from our rule engine: ${i.verdict} (rule ${i.ruleId}, confidence ${i.confidence}%)
Sentiment signals available: ${i.sentiment ?? "none"}

Respond ONLY with minified JSON, no markdown fences:
{"why":"2-3 sentences explaining the demand/risk picture behind these numbers",
 "risks":["2-3 specific, concrete risks for this exact item"],
 "counterplay":"one tactical move that improves the outcome (pricing, timing, bundling, listing angle, or walking away)",
 "watch":"the single metric to re-check before committing capital"}`;
}

export function manifestTriagePrompt(
  rows: { item: string; verdict: string; roi: number }[],
): string {
  const list = rows
    .map((r) => `- ${r.item} | verdict: ${r.verdict} | roi: ${r.roi.toFixed(2)}`)
    .join("\n");
  return `You are a sourcing risk analyst triaging a liquidation manifest for marketplace resellers.
Metrics and verdicts are already computed by a deterministic engine — do NOT re-score anything.
Flag ONLY non-obvious risks: counterfeit-prone categories, restricted/hazmat items,
seasonal mismatch (wrong time of year to list), brand-gated on Amazon. Skip rows with no such risk.

Rows:
${list}

Respond ONLY with minified JSON, no markdown fences:
{"flags":[{"item":"<item name verbatim>","flag":"<one concrete sentence>","kind":"counterfeit|restricted|seasonal|gated|other"}]}`;
}
