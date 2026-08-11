/**
 * Shipping estimation — the missing piece that turned "sold in a few days"
 * into "margin wiped out." A flat manually-typed shipping guess hides the
 * two things that actually determine cost: chargeable weight (couriers bill
 * on volumetric weight when a parcel is bulky but light) and which courier
 * is actually cheapest for this lane. Both are computed here, never guessed.
 */

export type Dimensions = {
  lengthCm: number;
  widthCm: number;
  heightCm: number;
};

export type ShippingQuoteRequest = {
  /** grams — the parcel's actual scale weight */
  actualWeightGrams: number;
  dimensions: Dimensions | null;
  originCountry: string;
  /** optional — improves accuracy when the courier API is live */
  originPostcode?: string;
  destCountry: string;
  destPostcode?: string;
  /** declared value in USD, some couriers price on this too */
  parcelValueUsd?: number;
};

export type CourierRate = {
  courier: string;
  service: string;
  priceUsd: number;
  currency: string;
  etaDaysMin: number | null;
  etaDaysMax: number | null;
};

export type ShippingQuote = {
  provenance: "LIVE" | "DEMO";
  /** true when a live request was attempted but failed, so we fell back */
  degraded: boolean;
  /** false when no courier source could be reached — never fabricated */
  ratesAvailable: boolean;
  actualWeightGrams: number;
  volumetricWeightGrams: number | null;
  /** max(actual, volumetric) — what couriers actually bill */
  chargeableWeightGrams: number;
  /** cheapest-first */
  rates: CourierRate[];
  fetchedAt: string;
};

export interface ShippingRateSource {
  getRates(req: ShippingQuoteRequest): Promise<CourierRate[]>;
}
