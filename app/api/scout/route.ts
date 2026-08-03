import { NextResponse } from "next/server";
import { z } from "zod";
import { ebayConfigured } from "@/lib/ebay/auth";
import { searchScout } from "@/lib/ebay/search";
import { FIXTURE_SCOUT_ITEMS } from "@/lib/db/fixtures/scout";
import { applyPipeline } from "@/lib/scout/filters";
import type { ScoutQuery, ScoutResult } from "@/lib/scout/types";

const ScoutRequestSchema = z
  .object({
    keyword: z.string().trim().max(200).default(""),
    matchMode: z.enum(["exact", "relevance"]).default("relevance"),
    soldWindowDays: z.union([z.literal(30), z.literal(60), z.literal(90)]).default(90),
    categoryId: z.string().trim().max(20).optional(),
    minPrice: z.number().nonnegative().optional(),
    maxPrice: z.number().positive().optional(),
    itemLocationCountry: z.string().trim().length(2).optional(),
    maxSellerFeedback: z.number().int().min(0).max(1_000_000).nullable().default(null),
    removeHighRisk: z.boolean().default(false),
    sort: z
      .enum(["price_asc", "price_desc", "recent", "feedback_asc"])
      .default("recent"),
    demo: z.boolean().optional(),
  })
  // eBay requires a keyword or a category — an entirely open search is rejected
  // upstream, so we fail fast with a message the user can act on
  .refine((v) => v.keyword.length >= 2 || Boolean(v.categoryId), {
    message:
      "Enter a search keyword (2+ characters) or pick a category — eBay can't run a completely open search.",
    path: ["keyword"],
  })
  .refine(
    (v) => v.minPrice === undefined || v.maxPrice === undefined || v.minPrice <= v.maxPrice,
    { message: "Minimum price must be less than or equal to maximum price.", path: ["minPrice"] },
  );

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = ScoutRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid search" },
      { status: 400 },
    );
  }
  const query = parsed.data as ScoutQuery;
  const useDemo =
    query.demo ?? (process.env.DEMO_MODE === "true" || !ebayConfigured());

  if (useDemo) {
    const { items, pipeline } = applyPipeline(FIXTURE_SCOUT_ITEMS, query);
    const result: ScoutResult = {
      mode: "SOLD",
      provenance: "DEMO",
      soldDataAvailable: true,
      items,
      totalMatched: FIXTURE_SCOUT_ITEMS.length,
      pipeline,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);
  }

  try {
    const raw = await searchScout(query);
    const { items, pipeline } = applyPipeline(raw.items, query);
    const result: ScoutResult = {
      mode: raw.mode,
      provenance: "LIVE",
      soldDataAvailable: raw.soldDataAvailable,
      items,
      totalMatched: raw.totalMatched,
      pipeline,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);
  } catch {
    // circuit-break to fixtures rather than a dead page, but label it honestly
    const { items, pipeline } = applyPipeline(FIXTURE_SCOUT_ITEMS, query);
    const result: ScoutResult = {
      mode: "SOLD",
      provenance: "DEMO",
      soldDataAvailable: true,
      items,
      totalMatched: FIXTURE_SCOUT_ITEMS.length,
      pipeline,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);
  }
}
