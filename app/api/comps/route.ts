import { NextResponse } from "next/server";
import { z } from "zod";
import { getComps } from "@/lib/ebay/demand";

const CompsRequestSchema = z.object({
  q: z.string().trim().min(2).max(200),
  condition: z
    .enum(["NEW", "USED_LIKE_NEW", "USED_GOOD", "FOR_PARTS"])
    .optional(),
  demo: z.boolean().optional(),
});

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = CompsRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Enter a product name of at least 2 characters." },
      { status: 400 },
    );
  }
  const { q, condition, demo } = parsed.data;
  // Live is the default; only fall back to fixtures if the caller explicitly
  // says demo, or the operator has forced DEMO_MODE=true env-wide.
  const useDemo = demo ?? process.env.DEMO_MODE === "true";
  const result = await getComps({ q, condition }, useDemo);
  return NextResponse.json(result);
}
