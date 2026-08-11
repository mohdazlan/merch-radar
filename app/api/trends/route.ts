import { NextResponse } from "next/server";
import { z } from "zod";
import { ebayConfigured } from "@/lib/ebay/auth";
import { fetchKeywordSignal } from "@/lib/ebay/keywordSignal";
import { fixtureKeywordSignal } from "@/lib/db/fixtures/trends";
import type { KeywordSignal, TrendsResult } from "@/lib/trends/types";

const TrendsRequestSchema = z.object({
  keywords: z
    .array(z.string().trim().min(2, "Each keyword needs at least 2 characters."))
    .min(1, "Enter at least one keyword to compare.")
    .max(5, "Compare at most 5 keywords at a time."),
  demo: z.boolean().optional(),
});

/**
 * Live keyword comparison — not a "most searched" panel (eBay/Google expose
 * no such free API; see lib/trends/types.ts). Each keyword gets its own
 * circuit breaker: a live failure on one term falls back to a clearly
 * labeled demo signal for that term only, rather than degrading the whole
 * comparison.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = TrendsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 },
    );
  }
  const { keywords, demo } = parsed.data;
  const useDemo = demo ?? (process.env.DEMO_MODE === "true" || !ebayConfigured());

  const signals: KeywordSignal[] = await Promise.all(
    keywords.map(async (keyword): Promise<KeywordSignal> => {
      if (useDemo) return fixtureKeywordSignal(keyword);
      try {
        return await fetchKeywordSignal(keyword);
      } catch {
        return { ...fixtureKeywordSignal(keyword), degraded: true };
      }
    }),
  );

  const result: TrendsResult = { signals };
  return NextResponse.json(result);
}
