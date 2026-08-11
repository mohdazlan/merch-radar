import "server-only";
import type {
  CourierRate,
  ShippingQuoteRequest,
  ShippingRateSource,
} from "@/lib/shipping/types";
import { findCurrency } from "@/lib/middleman/currencies";

/**
 * EasyParcel — Malaysia-based courier aggregator (Pos Laju, DHL eCommerce,
 * Skynet, J&T, Aramex, City-Link and others behind one API). Rate quotes are
 * free; a registered account + API key is required, same shape as eBay's
 * Insights gate. https://developers.easyparcel.com/
 *
 * We never fabricate a rate table when this isn't configured — see
 * FixtureShippingSource for the honestly-labeled DEMO alternative.
 */

const RATE_ENDPOINT = "https://connect.easyparcel.my/?ac=EPRateCheckingBulk";

type EasyParcelRateRow = {
  rate_id?: string;
  courier_name?: string;
  service_name?: string;
  service_type?: string;
  price?: string | number;
  shipment_price?: string | number;
  currency?: string;
  pickup_date?: string;
  delivery?: string;
};

type EasyParcelResponse = {
  api_status?: string;
  error_code?: string;
  error_remark?: string;
  result?: { rates?: EasyParcelRateRow[] }[];
};

export function easyParcelConfigured(): boolean {
  return Boolean(process.env.EASYPARCEL_API_KEY);
}

function parseEtaDays(delivery?: string): [number | null, number | null] {
  if (!delivery) return [null, null];
  const match = delivery.match(/(\d+)\s*-\s*(\d+)/);
  if (match) return [Number(match[1]), Number(match[2])];
  const single = delivery.match(/(\d+)/);
  if (single) return [Number(single[1]), Number(single[1])];
  return [null, null];
}

export class EasyParcelSource implements ShippingRateSource {
  async getRates(req: ShippingQuoteRequest): Promise<CourierRate[]> {
    const apiKey = process.env.EASYPARCEL_API_KEY;
    if (!apiKey) throw new Error("EasyParcel not configured");

    const weightKg = Math.max(req.actualWeightGrams / 1000, 0.01);
    const body = new URLSearchParams({
      "bulk[0][pick_code]": req.originPostcode ?? process.env.SHIP_FROM_POSTCODE ?? "",
      "bulk[0][pick_country]": req.originCountry,
      "bulk[0][send_code]": req.destPostcode ?? "",
      "bulk[0][send_country]": req.destCountry,
      "bulk[0][weight]": weightKg.toFixed(2),
      "bulk[0][width]": req.dimensions ? String(req.dimensions.widthCm) : "",
      "bulk[0][length]": req.dimensions ? String(req.dimensions.lengthCm) : "",
      "bulk[0][height]": req.dimensions ? String(req.dimensions.heightCm) : "",
      api: apiKey,
    });

    const res = await fetch(RATE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`EasyParcel rate check failed: ${res.status}`);

    const data = (await res.json()) as EasyParcelResponse;
    if (data.api_status !== "Success") {
      throw new Error(data.error_remark ?? "EasyParcel rate check failed");
    }

    const rows = data.result?.[0]?.rates ?? [];
    return rows
      .map((r): CourierRate | null => {
        const rawPrice = Number(r.price ?? r.shipment_price);
        if (!Number.isFinite(rawPrice) || rawPrice <= 0) return null;
        const [etaDaysMin, etaDaysMax] = parseEtaDays(r.delivery);
        // an EasyParcel MY account quotes in MYR; convert to USD with the
        // same seeded rate the Middleman flow uses, rather than duplicating
        // a second FX table the two features could silently disagree on
        const currency = r.currency ?? "MYR";
        const rate =
          currency === "USD" ? 1 : findCurrency(currency).seededRatePerUsd;
        const priceUsd = Math.round((rawPrice / rate) * 100) / 100;
        return {
          courier: r.courier_name ?? "Unknown courier",
          service: r.service_name ?? r.service_type ?? "Standard",
          priceUsd,
          currency: "USD",
          etaDaysMin,
          etaDaysMax,
        };
      })
      .filter((r): r is CourierRate => r !== null)
      .sort((a, b) => a.priceUsd - b.priceUsd);
  }
}
