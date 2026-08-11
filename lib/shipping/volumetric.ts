/**
 * Chargeable weight — pure, unit-tested (Rule 1). The single most common
 * cause of a reseller's shipping bill blowing past their estimate: a parcel
 * that's light but bulky gets billed on *volumetric* weight, not the number
 * on the bathroom scale, and most sellers have never heard of this.
 *
 * Divisor 5000 (cm³ per kg) is the standard most couriers — including the
 * Malaysia-based aggregator this app integrates with — publish for
 * road/economy service. Air/express services sometimes use 6000; both are
 * exposed so the number is never silently wrong for the wrong service tier.
 * Source: https://helpcentre-my.easyparcel.com/support/solutions/articles/9000188791-volumetric-calculator
 */

export const VOLUMETRIC_DIVISOR_STANDARD = 5000;
export const VOLUMETRIC_DIVISOR_EXPRESS = 6000;

export function computeVolumetricWeightGrams(
  lengthCm: number,
  widthCm: number,
  heightCm: number,
  divisor: number = VOLUMETRIC_DIVISOR_STANDARD,
): number {
  if (
    lengthCm <= 0 ||
    widthCm <= 0 ||
    heightCm <= 0 ||
    !Number.isFinite(divisor) ||
    divisor <= 0
  ) {
    return 0;
  }
  const volumeCm3 = lengthCm * widthCm * heightCm;
  // divisor is defined in cm³ per kg; convert the kg result to grams
  return Math.round((volumeCm3 / divisor) * 1000);
}

/** couriers bill on whichever is larger — this is the number that surprises sellers */
export function computeChargeableWeightGrams(
  actualWeightGrams: number,
  volumetricWeightGrams: number | null,
): number {
  const actual = Math.max(actualWeightGrams, 0);
  if (volumetricWeightGrams === null) return actual;
  return Math.max(actual, volumetricWeightGrams);
}

export function gramsToKg(grams: number): number {
  return grams / 1000;
}
