import type { ScoutItem } from "@/lib/scout/types";

/**
 * Deterministic Scout fixtures for Demo Mode. Deliberately includes the
 * shapes the pipeline has to handle: brand-new sellers with sales, a
 * high-feedback power seller, a suspiciously cheap listing, a replica title,
 * and a seller with unknown feedback.
 */

const DAY = 86_400_000;
const BASE = Date.parse("2026-09-01T00:00:00.000Z");
const iso = (daysAgo: number) => new Date(BASE - daysAgo * DAY).toISOString();

export const FIXTURE_SCOUT_ITEMS: ScoutItem[] = [
  {
    itemId: "v1|demo001|0",
    title: "Silicone Oven Glove Heat Resistant Mitt Pair — Kitchen BBQ",
    price: 14.99,
    currency: "USD",
    seller: { username: "kl_kitchen_co", feedbackScore: 12, feedbackPct: 100 },
    itemLocation: "MY",
    condition: "NEW",
    itemWebUrl: "https://www.ebay.com/itm/demo001",
    soldDate: iso(4),
    riskFlags: [],
  },
  {
    itemId: "v1|demo002|0",
    title: "Silicone Oven Mitts Non-Slip Grill Gloves 932°F Heat Proof",
    price: 17.5,
    currency: "USD",
    seller: { username: "homegoods_direct", feedbackScore: 8421, feedbackPct: 99 },
    itemLocation: "US",
    condition: "NEW",
    itemWebUrl: "https://www.ebay.com/itm/demo002",
    soldDate: iso(2),
    riskFlags: [],
  },
  {
    itemId: "v1|demo003|0",
    title: "Silicone Oven Glove Set 2pc Waterproof Cooking Baking",
    price: 21.95,
    currency: "USD",
    seller: { username: "newshop2026", feedbackScore: 3, feedbackPct: 100 },
    itemLocation: "MY",
    condition: "NEW",
    itemWebUrl: "https://www.ebay.com/itm/demo003",
    soldDate: iso(9),
    riskFlags: [],
  },
  {
    itemId: "v1|demo004|0",
    title: "Oven Glove Silicone — REPLICA designer print",
    price: 6.5,
    currency: "USD",
    seller: { username: "bargain_bin_88", feedbackScore: 41, feedbackPct: 76 },
    itemLocation: "CN",
    condition: "NEW",
    itemWebUrl: "https://www.ebay.com/itm/demo004",
    soldDate: iso(15),
    riskFlags: [],
  },
  {
    itemId: "v1|demo005|0",
    title: "Heat Resistant Silicone Oven Glove Long Cuff Professional",
    price: 24.0,
    currency: "USD",
    seller: { username: "chef_supply_sg", feedbackScore: 67, feedbackPct: 98 },
    itemLocation: "SG",
    condition: "NEW",
    itemWebUrl: "https://www.ebay.com/itm/demo005",
    soldDate: iso(21),
    riskFlags: [],
  },
  {
    itemId: "v1|demo006|0",
    title: "Silicone Oven Glove Single — clearance",
    price: 3.25,
    currency: "USD",
    seller: { username: "liquidation_lots", feedbackScore: 210, feedbackPct: 94 },
    itemLocation: "US",
    condition: "NEW",
    itemWebUrl: "https://www.ebay.com/itm/demo006",
    soldDate: iso(30),
    riskFlags: [],
  },
  {
    itemId: "v1|demo007|0",
    title: "Premium Silicone Oven Gloves with Cotton Lining, 1 Pair",
    price: 19.99,
    currency: "USD",
    seller: { username: "quietseller", feedbackScore: null, feedbackPct: null },
    itemLocation: "US",
    condition: "NEW",
    itemWebUrl: "https://www.ebay.com/itm/demo007",
    soldDate: iso(11),
    riskFlags: [],
  },
  {
    itemId: "v1|demo008|0",
    title: "Silicone Oven Glove Heavy Duty Pair — Restaurant Grade",
    price: 28.5,
    currency: "USD",
    seller: { username: "startup_kitchen", feedbackScore: 27, feedbackPct: 100 },
    itemLocation: "MY",
    condition: "NEW",
    itemWebUrl: "https://www.ebay.com/itm/demo008",
    soldDate: iso(6),
    riskFlags: [],
  },
];
