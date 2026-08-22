# Source R1 - Sold Evidence and Pricing Change Record

Date: 2026-08-23

Source reviewed: `/Users/macintosh/Desktop/source r1.pdf`

## Problem translated from the attachment

The attachment reports two connected sourcing failures:

1. eBay visibly shows that a matched listing has sold units, while Merch Radar reports `sold unavailable` and provides no item-level evidence.
2. The estimated selling price can be based on the full active-listing set, producing a materially misleading estimate even when a strongly sold listing exists at a different price.

The merchant also needs a list of the sold evidence so they can independently verify the result before risking capital.

## Strategy

1. Trace the eBay response shapes instead of assuming the search payload contains sold quantities.
2. Keep the existing Browse search for active supply and price distribution.
3. Bulk-hydrate the top 20 matched REST item IDs through Browse `getItems`, where eBay defines `estimatedSoldQuantity`.
4. Retain only listings with a positive eBay-reported sold quantity and expose them as item-level references.
5. Prefer completed-sale prices when Marketplace Insights is available. Otherwise, estimate from the current prices of only the listings with reported sales. Use discounted active prices only as the last fallback.
6. Do not treat Browse lifetime sold quantities as a 90-day window. Keep sell-through rate, days to flip, profit per day, and the decay forecast unavailable unless true 90-day data exists.
7. Make every price basis and limitation visible in the interface.

Official contract references:

- [Browse ItemSummary](https://developer.ebay.com/api-docs/buy/browse/types/gct%3AItemSummary) provides search-result fields such as item ID, title, price, seller, and item URL.
- [EstimatedAvailability](https://developer.ebay.com/api-docs/buy/browse/types/gct%3AEstimatedAvailability) defines `estimatedSoldQuantity` on the item-detail calls, including bulk `getItems`.
- [Browse API overview](https://developer.ebay.com/api-docs/buy/api-browse.html) distinguishes search summaries from complete item details.

## Implemented changes

### eBay data layer

- Added `SoldReference`, carrying title, price, currency, quantity sold, date when available, eBay URL, seller, condition, and an explicit price basis.
- Replaced the count-only Browse state with `BROWSE_HISTORY`, which includes sold-backed listing prices, references, and the number of listings scanned.
- Removed the ineffective assumption that `estimatedAvailabilities` is returned by Browse search.
- Added a bulk `getItems` detail request for up to 20 best-match listings using `fieldgroups=COMPACT`.
- Prevented duplicate availability containers from double-counting sold quantity by taking the largest reported quantity per item.
- Expanded Marketplace Insights references and now honors the selected condition filter.
- Preserved the six-hour normalized-query cache, so the extra detail lookup is not repeated on every page interaction.
- Versioned the comps-cache key so pre-change count-only payloads cannot be served to the new sold-evidence UI after deployment.

### Pricing and decision logic

The estimate now uses this auditable order:

1. Median completed-sale price (`SOLD_MEDIAN`).
2. Median current price of listings with reported sales (`SOLD_LISTING_MEDIAN`).
3. Median active-listing price multiplied by 0.88 (`ACTIVE_DISCOUNTED`).

Browse listing-history quantities are lifetime totals. They are displayed as evidence but are not passed into the 90-day velocity formulas. Confidence uses the number of distinct price observations, not a large lifetime unit count from one listing. A listing with 1,589 sold units therefore remains visibly `LOW SAMPLE` when it is the only priced reference.

### Sourcing interface

- Added a Sold Evidence section below the metrics.
- Completed-sale access shows completed prices and dates.
- Browse-only access shows current price, reported units sold, seller, condition, and a direct eBay reference link when available.
- Added clear copy stating that Browse prices are current asking prices, not historic checkout prices.
- Added an explicit unavailable state when neither completed sales nor sold-backed listings can be retrieved.
- Updated metric provenance copy to distinguish completed-sale median, sold-listing median, and active-only fallback.
- Updated the forecast message to explain why lifetime listing counts cannot support a 90-day price trend.

### Reproducible complaint scenario

Demo Mode now includes the attachment's Royal Berkley case:

- buy cost: $111.00
- shipping: $8.00
- sold-backed listing price: $179.99
- reported lifetime units sold: 1,589
- estimated sell price: $179.99 from the sold-listing median
- 90-day velocity metrics: unavailable
- confidence: low sample because only one sold-backed price observation exists

## Verification

- `pnpm test`: 12 test files and 133 tests passed.
- `pnpm lint`: no errors; two pre-existing warnings remain outside this change.
- `pnpm exec tsc --noEmit`: passed.
- `pnpm build`: production build passed.
- Browser verification: Royal Berkley analysis rendered the sold-backed $179.99 estimate, the 1,589-unit evidence row, the low-sample warning, and unavailable 90-day velocity metrics with no browser console errors.
- Responsive check: the sourcing form renders correctly at a 390 x 844 viewport; result tables remain horizontally scrollable.

## Operational limitation

Marketplace Insights is restricted by eBay. Without it, Browse can prove that a currently active listing has sold units, but it cannot provide the exact historic checkout price or a trustworthy 90-day sales series. The interface now states this directly instead of converting lifetime quantity into a misleading velocity metric.

The local environment used for verification did not contain live eBay credentials, so the live HTTP contract is covered by adapter unit tests and the end-to-end UI was verified with deterministic demo data. A production smoke test with valid Browse credentials should confirm that the application keyset is approved for bulk `getItems`.
