import { NextResponse } from "next/server";
import { z } from "zod";
import { easyParcelConfigured, EasyParcelSource } from "@/lib/shipping/easyparcel";
import { fixtureCourierRates } from "@/lib/db/fixtures/shipping";
import {
  computeChargeableWeightGrams,
  computeVolumetricWeightGrams,
} from "@/lib/shipping/volumetric";
import type { ShippingQuote } from "@/lib/shipping/types";

const ShippingRequestSchema = z.object({
  actualWeightGrams: z
    .number()
    .positive("Weight must be greater than 0.")
    .max(50_000, "That's over 50kg — split this into multiple parcels."),
  dimensions: z
    .object({
      lengthCm: z.number().positive().max(300, "Each dimension must be 300cm or less."),
      widthCm: z.number().positive().max(300, "Each dimension must be 300cm or less."),
      heightCm: z.number().positive().max(300, "Each dimension must be 300cm or less."),
    })
    .nullable()
    .default(null),
  originCountry: z.string().trim().length(2).default("MY"),
  originPostcode: z.string().trim().max(12).optional(),
  destCountry: z.string().trim().length(2).default("US"),
  destPostcode: z.string().trim().max(12).optional(),
  parcelValueUsd: z.number().nonnegative().optional(),
  demo: z.boolean().optional(),
});

/**
 * Shipping estimate: chargeable weight is always computed (pure math, zero
 * dependency); courier rates come from EasyParcel when configured, or
 * clearly-labeled demo fixtures otherwise. A live-request failure degrades
 * to fixtures rather than erroring the whole analysis — same circuit-breaker
 * shape as /api/comps.
 */
export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const parsed = ShippingRequestSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid shipping request" },
      { status: 400 },
    );
  }
  const { demo, ...query } = parsed.data;

  const volumetricWeightGrams = query.dimensions
    ? computeVolumetricWeightGrams(
        query.dimensions.lengthCm,
        query.dimensions.widthCm,
        query.dimensions.heightCm,
      )
    : null;
  const chargeableWeightGrams = computeChargeableWeightGrams(
    query.actualWeightGrams,
    volumetricWeightGrams,
  );

  const useDemo = demo ?? (process.env.DEMO_MODE === "true" || !easyParcelConfigured());

  const respond = (
    rates: ShippingQuote["rates"],
    provenance: ShippingQuote["provenance"],
    degraded: boolean,
  ) => {
    const result: ShippingQuote = {
      provenance,
      degraded,
      ratesAvailable: rates.length > 0,
      actualWeightGrams: query.actualWeightGrams,
      volumetricWeightGrams,
      chargeableWeightGrams,
      rates,
      fetchedAt: new Date().toISOString(),
    };
    return NextResponse.json(result);
  };

  if (useDemo) {
    return respond(fixtureCourierRates(chargeableWeightGrams), "DEMO", false);
  }

  try {
    const rates = await new EasyParcelSource().getRates({
      ...query,
      actualWeightGrams: chargeableWeightGrams, // quote on the billed weight, not the scale weight
    });
    if (rates.length === 0) throw new Error("no rates returned");
    return respond(rates, "LIVE", false);
  } catch {
    // circuit breaker — never leave the seller with no number to work from
    return respond(fixtureCourierRates(chargeableWeightGrams), "DEMO", true);
  }
}
