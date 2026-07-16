import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, aiConfigured, getAiClient, parseModelJson } from "@/lib/ai/client";
import { manifestTriagePrompt } from "@/lib/ai/prompts";
import { ManifestTriageSchema } from "@/lib/ai/schemas";

const TriageRequestSchema = z.object({
  rows: z
    .array(
      z.object({
        item: z.string().min(1).max(200),
        verdict: z.string().max(60),
        roi: z.number(),
      }),
    )
    .min(1)
    .max(25), // one batch per call (§9 step 5)
});

/**
 * §9 step 5 — one Claude call per batch of ≤25 rows, triage narrative only.
 * The engines have already scored every row locally at zero token cost; this
 * flags non-obvious risks (counterfeit-prone, restricted, seasonal, gated).
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
  const parsed = TriageRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid triage payload (max 25 rows per batch)" },
      { status: 400 },
    );
  }

  try {
    const message = await getAiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 1000,
      messages: [
        { role: "user", content: manifestTriagePrompt(parsed.data.rows) },
      ],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const triage = ManifestTriageSchema.parse(parseModelJson(text));
    return NextResponse.json({ available: true, flags: triage.flags });
  } catch {
    return NextResponse.json({ available: false, reason: "model-error" });
  }
}
