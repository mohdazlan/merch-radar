import "server-only";
import Anthropic from "@anthropic-ai/sdk";

/**
 * One shared Claude client, server-side only. AI is additive — the verdict
 * and every metric render without it (§7). Callers must check aiConfigured()
 * and degrade gracefully instead of throwing.
 */

export const AI_MODEL = process.env.AI_MODEL ?? "claude-sonnet-5";

let client: Anthropic | null = null;

export function aiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY);
}

export function getAiClient(): Anthropic {
  if (!client) client = new Anthropic();
  return client;
}

/** strip ```json fences defensively, then parse */
export function parseModelJson(text: string): unknown {
  const cleaned = text
    .trim()
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```$/, "");
  return JSON.parse(cleaned);
}
