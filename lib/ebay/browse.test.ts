import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/ebay/auth", () => ({ ebayFetch: vi.fn() }));

import { ebayFetch } from "@/lib/ebay/auth";
import { EbayBrowseSource } from "@/lib/ebay/browse";

const mockedFetch = vi.mocked(ebayFetch);

function jsonResponse(body: object) {
  return new Response(JSON.stringify(body), {
    headers: { "Content-Type": "application/json" },
  });
}

describe("EbayBrowseSource sold evidence", () => {
  beforeEach(() => {
    mockedFetch.mockReset();
  });

  it("hydrates item summaries and returns only listings with eBay-reported sales", async () => {
    mockedFetch
      .mockResolvedValueOnce(
        jsonResponse({
          total: 290,
          itemSummaries: [
            {
              itemId: "v1|sold-a|0",
              title: "Royal Berkey housing",
              price: { value: "179.99", currency: "USD" },
              itemWebUrl: "https://www.ebay.com/itm/sold-a",
              seller: { username: "merchant-a" },
              condition: "Open box",
            },
            {
              itemId: "v1|unsold|0",
              title: "Unproven active listing",
              price: { value: "73.92", currency: "USD" },
            },
            {
              itemId: "v1|sold-b|0",
              title: "Second sold-backed listing",
              price: { value: "189.00", currency: "USD" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              itemId: "v1|sold-a|0",
              price: { value: "179.99", currency: "USD" },
              estimatedAvailabilities: [{ estimatedSoldQuantity: 1589 }],
            },
            {
              itemId: "v1|unsold|0",
              price: { value: "73.92", currency: "USD" },
              estimatedAvailabilities: [{ estimatedSoldQuantity: 0 }],
            },
            {
              itemId: "v1|sold-b|0",
              price: { value: "189.00", currency: "USD" },
              estimatedAvailabilities: [
                { estimatedSoldQuantity: 11 },
                { estimatedSoldQuantity: 11 },
              ],
            },
          ],
        }),
      );

    const sold = await new EbayBrowseSource().getSold({ q: "Royal Berkley" });

    expect(sold.status).toBe("BROWSE_HISTORY");
    if (sold.status !== "BROWSE_HISTORY") throw new Error("expected history");
    expect(sold.soldCount).toBe(1600);
    expect(sold.prices).toEqual([179.99, 189]);
    expect(sold.references).toHaveLength(2);
    expect(sold.references[0]).toMatchObject({
      title: "Royal Berkey housing",
      soldQuantity: 1589,
      priceBasis: "CURRENT_LISTING_WITH_SALES",
    });
    expect(sold.scannedListingCount).toBe(3);
    expect(mockedFetch).toHaveBeenCalledTimes(2);
    expect(mockedFetch.mock.calls[1][0]).toContain("/buy/browse/v1/item?");
    expect(mockedFetch.mock.calls[1][0]).toContain("fieldgroups=COMPACT");
  });

  it("returns UNAVAILABLE when no hydrated listing reports a sale", async () => {
    mockedFetch
      .mockResolvedValueOnce(
        jsonResponse({
          total: 1,
          itemSummaries: [
            {
              itemId: "v1|unsold|0",
              title: "Unsold listing",
              price: { value: "50.00", currency: "USD" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              itemId: "v1|unsold|0",
              price: { value: "50.00", currency: "USD" },
              estimatedAvailabilities: [{ estimatedSoldQuantity: 0 }],
            },
          ],
        }),
      );

    await expect(
      new EbayBrowseSource().getSold({ q: "unsold listing" }),
    ).resolves.toEqual({ status: "UNAVAILABLE" });
  });
});
