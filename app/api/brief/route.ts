import { NextResponse } from "next/server";
import { z } from "zod";
import { AI_MODEL, aiConfigured, getAiClient, parseModelJson } from "@/lib/ai/client";

const BriefRequestSchema = z.object({
  name: z.string().min(1).max(120),
  peakDate: z.string().max(20),
  leadWeeks: z.number().int().min(1).max(52),
  keywords: z.array(z.string().max(80)).max(10),
  niches: z.array(z.string().max(80)).max(10),
  designDirections: z.array(z.string().max(120)).max(10),
  products: z.array(z.string().max(80)).max(10),
});

export const BriefSchema = z.object({
  hooks: z.array(z.string().min(1).max(200)).min(2).max(5),
  listingTitles: z.array(z.string().min(1).max(140)).min(2).max(5),
  productAngles: z.array(z.string().min(1).max(200)).min(2).max(5),
  timing: z.string().min(1).max(400),
});

/**
 * POD campaign brief (§ spec v1 carry-over). AI is additive: without a key
 * the client renders a deterministic demo brief from the event's own seed
 * fields — clearly badged DEMO, never presented as generated insight.
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
  const parsed = BriefRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid event payload" }, { status: 400 });
  }
  const e = parsed.data;

  try {
    const message = await getAiClient().messages.create({
      model: AI_MODEL,
      max_tokens: 800,
      messages: [
        {
          role: "user",
          content: `You are a print-on-demand campaign strategist. Build a launch brief for this event.
Ground every suggestion in the seed data given — do not invent demand statistics or search volumes.

Event: ${e.name} | Peak: ${e.peakDate} | Lead time: ${e.leadWeeks} weeks
Keywords: ${e.keywords.join(", ")}
Niches: ${e.niches.join(", ")}
Design directions: ${e.designDirections.join(", ")}
Best products: ${e.products.join(", ")}

Respond ONLY with minified JSON, no markdown fences:
{"hooks":["2-4 emotional angles that make someone buy"],
 "listingTitles":["2-4 keyword-rich listing titles under 140 chars"],
 "productAngles":["2-4 product/niche pairings worth testing"],
 "timing":"one paragraph: when to design, list, and start promoting relative to the peak"}`,
        },
      ],
    });
    const text = message.content
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("");
    const brief = BriefSchema.parse(parseModelJson(text));
    return NextResponse.json({ available: true, brief });
  } catch {
    return NextResponse.json({ available: false, reason: "model-error" });
  }
}
