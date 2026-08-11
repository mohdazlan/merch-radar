import type { CourierRate } from "@/lib/shipping/types";

/**
 * Deterministic demo courier rates. Modeled loosely on real Malaysia-outbound
 * economy/express tiers so the demo experience is plausible, but these are
 * synthetic and must always render with the DEMO badge — never presented as
 * a real quote (Rule 2).
 */

/** price grows with chargeable weight; deterministic, no randomness */
export function fixtureCourierRates(chargeableWeightGrams: number): CourierRate[] {
  const kg = Math.max(chargeableWeightGrams / 1000, 0.05);
  const round2 = (n: number) => Math.round(n * 100) / 100;

  return [
    {
      courier: "Pos Laju",
      service: "International Economy",
      priceUsd: round2(6.5 + kg * 8.2),
      currency: "USD",
      etaDaysMin: 10,
      etaDaysMax: 18,
    },
    {
      courier: "J&T Express",
      service: "International Standard",
      priceUsd: round2(7.8 + kg * 9.6),
      currency: "USD",
      etaDaysMin: 7,
      etaDaysMax: 12,
    },
    {
      courier: "Skynet",
      service: "Worldwide Priority",
      priceUsd: round2(9.2 + kg * 11.4),
      currency: "USD",
      etaDaysMin: 5,
      etaDaysMax: 9,
    },
    {
      courier: "DHL eCommerce",
      service: "Parcel International Direct",
      priceUsd: round2(11.5 + kg * 14.8),
      currency: "USD",
      etaDaysMin: 4,
      etaDaysMax: 7,
    },
  ].sort((a, b) => a.priceUsd - b.priceUsd);
}
