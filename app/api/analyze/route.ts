import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, aiConfigured, getAiClient, parseModelJson } from "@/lib/ai/client";
import { riskNarrativePrompt } from "@/lib/ai/prompts";
import { RiskNarrativeSchema } from "@/lib/ai/schemas";

const AnalyzeRequestSchema = z.object({
  title: z.string().min(1).max(200),
  condition: z.string().max(40),
  platform: z.string().max(40),
  buyCost: z.number().nonnegative(),
  estSellPrice: z.number().nonnegative(),
  netProfit: z.number(),
  roi: z.number(),
  str: z.number().nullable(),
  activeCount: z.number().int().nonnegative(),
  soldCount: z.number().int().nonnegative().nullable(),
  decaySlope: z.number().nullable(),
  daysToFlip: z.number().nullable(),
  capitalPerDay: z.number().nullable(),
  verdict: z.string().max(60),
  ruleId: z.string().max(40),
  confidence: z.number().int().min(0).max(100),
});

/**
 * §7 AI risk narrative. Additive only: without a key (or on any failure)
 * the response is { available: false } and the UI renders its fallback —
 * the verdict and metrics never depend on this route.
 */
export async function POST(req: Request) {
  if (!aiConfigured()) {
    return NextResponse.json({ available: false, reason: "no-key" });
  }
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = AnalyzeRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid metrics payload" }, { status: 400 });
  }

  try {
    const message = await getAiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 600,
      messages: [{ role: "user", content: riskNarrativePrompt(parsed.data) }],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const narrative = RiskNarrativeSchema.parse(parseModelJson(text));
    return NextResponse.json({ available: true, narrative });
  } catch {
    return NextResponse.json({ available: false, reason: "model-error" });
  }
}
