# Merch Radar — Project Reference

Consolidated reference gathered from the existing docs (`README.md`, `PRODUCT.md`, `DESIGN.md`, `MERCH-RADAR-BUILD-SPEC-v2.md`), source code, and git history. Intended as raw material for writing a guide — not a replacement for those docs, which stay authoritative for their own topics.

---

## 1. What it is

A Next.js app with **one eBay demand engine** feeding **six surfaces**, split across two ICPs:

| ICP | Pain | Surfaces |
|---|---|---|
| POD seller (Etsy + eBay, solo/side-hustle, <$10k/mo) | *timing* — finding seasonal demand too late | **Radar** |
| Reseller/arbitrageur (eBay + Amazon, $5k–$100k/mo GMV) | *capital risk* on dead stock | **Sourcing**, **Manifest**, **Middleman**, **Scout**, **HDLR**, **Trends** |

Positioning line: *"Stop finding out too late, and stop buying dead stock. Merch Radar tells you what to launch this week. ApexSourcing tells you what's worth buying today."*

The spec (`MERCH-RADAR-BUILD-SPEC-v2.md`) only documents the original two-surface scope (Radar + Sourcing/Manifest). Four surfaces were added afterward and are **not** in the spec — Middleman, Scout, HDLR, Trends (see §5 and git history in §8).

---

## 2. Tech stack (actual, from `package.json` — differs from spec's "Next.js 14+")

- **Next.js 16.2.10** (App Router), **React 19.2.4**, TypeScript strict.
- Tailwind CSS 4 (`@tailwindcss/postcss`).
- **Lucide React** for icons — SVG only, never emoji.
- **Prisma 6.19.3** + `@prisma/client` — SQLite locally (`prisma/dev.db`), written Postgres-portable.
- **Recharts 3.9.2** — sourcing forecast/decay + Radar sparkline-style charts.
- **`@anthropic-ai/sdk` 0.111.0** — server-only AI layer, one shared client (`lib/ai/client.ts`, `import "server-only"`).
- **Zod 4** — validates all AI JSON output.
- **`@tanstack/react-virtual`** — virtualizes large manifest tables (500+ rows).
- **`p-limit`** — bounds concurrent eBay calls (concurrency 5) in the manifest pipeline.
- **Vitest 4** — unit tests for the pure engines in `lib/`.
- ⚠️ `AGENTS.md` flags this Next.js version as having breaking changes vs. training data — check `node_modules/next/dist/docs/` before writing framework code.

No global state library (React hooks + URL search params only, per spec — Zustand was the fallback if ever needed, not currently used).

---

## 3. Directory map (actual, from filesystem)

```
app/
  (marketing)/page.tsx       landing
  radar/page.tsx             Radar surface
  sourcing/page.tsx          Sourcing Co-Pilot
  sourcing/manifest/         bulk pallet analyzer
  middleman/page.tsx         Middleman-radar
  scout/page.tsx             Scout (sold-item finder)
  hdlr/page.tsx              HDLR qualification gates
  trends/page.tsx            Trends (live keyword compare)
  api/
    analyze/route.ts         Claude: sourcing risk narrative
    brief/route.ts           Claude: POD campaign brief
    comps/route.ts           eBay: comps + STR lookup
    manifest/route.ts        Claude: batched manifest triage
    scout/route.ts           eBay: sold-item search
    shipping/route.ts        EasyParcel: shipping estimate
    trends/route.ts          eBay: keyword aspect data

components/
  shared/     Header, Chip, StatLine, EmptyState, ErrorState, CopyButton,
              DemoBadge, DemoModeProvider, SurfaceShell, ShippingEstimator
  radar/      RadarClient, Timeline, ActNowStrip
  sourcing/   SourcingClient, SourcingForm, SourcingTabs, VerdictBanner,
              VerdictChip, MetricsGrid, FeeCalculator, DecayChart,
              HypePanel, AiNarrative, ManifestClient
  middleman/  MiddlemanClient, MiddlemanForm, MiddlemanVerdict, CompetitorLadder
  scout/      ScoutClient, ScoutForm, ScoutResults, FilterPipeline
  hdlr/       HdlrClient
  trends/     TrendsClient, TrendsForm, KeywordSignalCard

lib/
  ai/         client.ts, prompts.ts, schemas.ts (zod)
  db/         client.ts (Prisma), fixtures/
  ebay/       auth.ts, browse.ts, search.ts, demand.ts, insights.ts,
              keywordSignal.ts, DemandSource.ts (interface), FixtureSource.ts
  fees/       engine.ts, presets.ts        — pure, unit-tested
  verdict/    engine.ts, rules.ts, metrics.ts — pure, unit-tested
  forecast/   decay.ts                     — pure, unit-tested
  manifest/   parse.ts                     — pure, unit-tested
  scout/      types.ts, filters.ts         — pure, unit-tested
  trends/     analyze.ts, types.ts         — pure, unit-tested
  hdlr/       evaluate.ts                  — pure, unit-tested
  middleman/  analyze.ts, currencies.ts    — pure, unit-tested
  shared/     competition.ts               — pure, unit-tested
  sentiment/  SentimentSource.ts (interface — demo-only at MVP)
  shipping/   easyparcel.ts, types.ts, volumetric.ts — pure, unit-tested
  stats.ts    median/percentile/outlier-trim helpers shared across engines

prisma/schema.prisma
```

Every folder under `lib/` marked "pure, unit-tested" has a matching `*.test.ts` — this is Rule 1 in practice (see §4).

---

## 4. The three architectural rules (spec §3 — treat as non-negotiable)

1. **Math in TypeScript, judgment in Claude.** No number the user acts on is ever computed by the LLM. Fees, margin, ROI, STR, days-to-flip, decay curve, verdicts — all pure deterministic functions in `lib/`. Claude only receives computed numbers and returns narrative.
2. **Never present a model output as an observation.** Every number carries a provenance tag: `LIVE` (from eBay now), `MODELED` (our formula over live data), `DEMO` (synthetic, permanently badged), `UNAVAILABLE` (honestly refused rather than guessed).
3. **Decision support, not advice.** Verdicts are a rule engine, not an oracle — every verdict names the rule that fired (`ruleId`) and the inputs, and is overridable. Persistent footer disclaimer: *"Estimates based on marketplace data and modeled projections. Not financial advice. Verify comps before purchasing."*

---

## 5. Surfaces

### 5.1 Radar (`/radar`) — planning, paper mode
What to create and by when. Seasonal/event demand engine with `launchBy = peakDate − leadWeeks·7d` (derived, never stored). 30-event seed dataset (Halloween, Christmas, BFCM, Valentine's, Mother's/Father's Day, Easter, Diwali, Lunar New Year, Eid, World Cup, Super Bowl, etc.) with per-event tier, region, keywords, niches, design directions, palettes, styles, products. Hand-rolled 13-month timeline (CSS grid + absolutely positioned lane-packed bars — not Recharts). `ActNowStrip` surfaces imminent launch windows.

### 5.2 Sourcing (`/sourcing`) — execution, console mode
"Should I buy this unit/pallet at this cost?" Input panel (product/UPC, buy cost, ship cost, qty, condition, target platform, item location) → `/api/comps` (eBay Browse + Insights) → computed metrics → verdict engine → verdict banner + metrics grid + fee waterfall + decay forecast + hype panel (demo) + AI risk narrative.

Computed metrics (`lib/verdict/metrics.ts`):
```
estSellPrice    = median(soldPrices), fallback median(activePrices) × 0.88
sellThroughRate = soldCount / (soldCount + activeCount)
daysToFlip      = clamp(90 / max(soldCount,1) * activeCount / competitionFactor, 1, 365)
netProceeds     = estSellPrice − fees(estSellPrice, preset) − shippingCost
netProfit       = netProceeds − buyCost
roi             = netProfit / (buyCost + shippingCost)
margin          = netProfit / estSellPrice
capitalPerDay   = netProfit / daysToFlip   ← the featured "profit velocity" metric
```

Verdict rules (`lib/verdict/rules.ts`, ordered, first match wins):
| # | Condition | Verdict |
|---|---|---|
| 1 | `roi < 0` or `netProfit <= 0` | PASS — NEGATIVE MARGIN |
| 2 | `str < 0.20` and `daysToFlip > 60` | PASS — DEAD STOCK RISK |
| 3 | `decaySlope < −0.15` and `daysToFlip > 30` | PASS — PRICE DECAY |
| 4 | `roi ≥ 0.40` and `str ≥ 0.60` and `daysToFlip ≤ 21` | STRONG BUY |
| 5 | `roi ≥ 0.25` and `str ≥ 0.40` | BUY |
| 6 | `roi ≥ 0.20` and `decaySlope < −0.08` | CAUTION — SHORT FLIP |
| 7 | otherwise | CAUTION — THIN MARGIN |

Confidence is separate from verdict — weighted from sample size, price variance, data freshness, title-match quality; <5 comps caps confidence at 40% with a `LOW SAMPLE` warning.

Fee engine (`lib/fees/engine.ts`, `presets.ts`): versioned/dated presets per platform (eBay, Amazon FBM, Amazon FBA, Walmart, Mercari, Custom), each with `effectiveDate` + `sourceUrl`. Full line-item waterfall shown, never a hardcoded flat rate.

### 5.3 Manifest (`/sourcing/manifest`) — bulk pallet analyzer
Paste/upload CSV/TSV → header auto-detect + manual column mapper → dedupe/normalize titles → comps-cache check → rate-limited concurrent fetch (`p-limit`, concurrency 5) with streaming partial results → fee+verdict engines run locally per row (zero AI cost) → **one Claude call per 25-row batch**, hard cap 8 AI calls/manifest, spend estimate shown before running → cache by content hash so re-runs are free. Sortable output table, dead-stock highlighting, manifest-level summary line, CSV export. Virtualized via `@tanstack/react-virtual` for 500+ rows.

### 5.4 Middleman (`/middleman`) — added post-spec (PR #3, "middleman-radar")
Different question from Sourcing: the supplier is a friend with elastic capacity, so dead-stock risk isn't the concern — the fight is margin thickness after fees + international FX/shipping, and whether the competitor floor lets you undercut and still profit. Inputs: supplier price (in supplier currency), FX rate, international shipping cost, platform fee preset, promoted-listing %, undercut %, competitor prices. Output: undercut price as the tactical recommendation, not just a verdict word. `CompetitorLadder` visualizes the competitor price stack. Pure engine: `lib/middleman/analyze.ts`, `lib/middleman/currencies.ts`.

### 5.5 Scout (`/scout`) — added post-spec (PR #4)
Sold-item discovery, implements a specific flowchart: keyword (exact/relevance, or blank = "include everything" + category) → sold-within-N-months window → category → price range → item location → **max seller feedback** filter → risk-flag removal → sort → display → export. The seller-feedback step is the strategic core: a seller with near-zero feedback who's *already selling* proves the product sells itself, independent of reputation — a replicable opportunity. Risk flags (`lib/scout/filters.ts`) are disclosed heuristics: price far below set median (counterfeit/scam-bait), low positive-feedback %, and title patterns (`replica`, `fake`, `knock-off`, `not authentic`, `for parts`/`broken`, `box/photo only`).

### 5.6 HDLR (`/hdlr`) — added post-spec (PR "aro feature", latest commit)
Deterministic implementation of an "academy" research-gate flowchart for qualifying a Scout result before acting on it. Five gates evaluated to PASS/FAIL/UNVERIFIED: demand (min monthly sales), new-seller (feedback ceiling), risk (VeRO review), competition (competitor count band), supplier (named supplier + unit cost). Overall verdict: `QUALIFIED` / `REJECT` / `NEEDS EVIDENCE`. Consumes a `ScoutResult` as input — i.e. HDLR is downstream of Scout in the actual workflow even though it's a separate nav item. Pure engine: `lib/hdlr/evaluate.ts`.

### 5.7 Trends (`/trends`) — added post-spec (PR #7, fixed in PR #8/#9)
Deliberately **not** a fake "most searched keywords" panel — eBay has no public search-volume API (Merchandising API deprecated; Marketing API's "trending" is ad-bid rate on your own listings, not buyer interest) and Google Trends has no free official API, so faking a score here would violate Rule 2. What's real: the Browse API's `ASPECT_REFINEMENTS` fieldgroup (counts of active listings per attribute value, e.g. Brand=Tupperware) combined with active-count, price spread, and Scout's new-seller-density signal — lets a seller compare 1–5 candidate keywords side by side on real, disclosed market composition. Each result card also cross-links to Scout ("Approachable for a new seller — check /scout for who's already doing it").

**Production bug + fix (resolved, PR #7→#8→#9), worth knowing because the pattern recurs elsewhere in the codebase:** eBay's Browse API `fieldgroups` param does not *add* to the default field group, it *replaces* it — the first live deploy set `fieldgroups=ASPECT_REFINEMENTS` and got aspect counts back but silently lost `itemSummaries`, so `priceStats` and `newSellerPct` were `null` for every real query (invisible locally, since local dev has no eBay key and runs on fixtures — only caught by testing the actual deployed route against production). Two single-shape guesses at fixing this both failed silently. The shipped fix (`lib/ebay/keywordSignal.ts`) stopped guessing and instead makes **two separate Browse API calls per keyword**, each using a request shape with direct production evidence it returns what's needed:
1. A plain search with no `fieldgroups` param — the same shape already proven live in `lib/ebay/search.ts` (Scout) to return `itemSummaries` with price + seller feedback.
2. `fieldgroups=ASPECT_REFINEMENTS&limit=1` — the shape proven on Trends' own first deploy to return `refinement.aspectDistributions`; `limit=1` keeps it cheap since only the aggregate container is used.

**Per-keyword circuit breaking (`app/api/trends/route.ts`):** each of the 1–5 keywords in a comparison is fetched independently and carries its own `degraded: boolean` flag on `KeywordSignal` — if the live call for one keyword throws, only that keyword falls back to a demo signal (`{...fixtureKeywordSignal(keyword), degraded: true}`); the rest of the comparison stays live. This mirrors the resilience pattern already used by the comps and shipping paths (per-item/per-row fallback instead of an all-or-nothing failure), rather than being a one-off for Trends.

### 5.8 Shipping estimator (`components/shared/ShippingEstimator.tsx`, `lib/shipping/`) — added post-spec (PR #6)
Chargeable-weight calculation (`lib/shipping/volumetric.ts`, pure/tested) plus live EasyParcel rates when `EASYPARCEL_API_KEY` is set; falls back to clearly labeled DEMO courier rates without a key. Chargeable-weight math always works either way.

---

## 6. eBay integration (`lib/ebay/`)

- OAuth2 client-credentials flow (`auth.ts`) → app token, cached ~2h, refreshed on 401. Server-side only.
- **Browse API** (`browse.ts`, `search.ts`) → active listings, price distribution, aspect refinements (used by Trends). Free tier ≈5,000 calls/day.
- **Marketplace Insights API** (`insights.ts`) → 90-day sold data. Requires separate, harder eBay approval than Browse. Biggest external dependency risk in the project.
- `DemandSource` interface (`DemandSource.ts`) with implementations `EbayBrowseSource` (always available), an Insights-backed source (when approved), and `FixtureSource` (Demo Mode) — when sold data is `UNAVAILABLE`, UI degrades honestly rather than fabricating.
- Comps cached per normalized query for 6h via the `CompsCache` Prisma table; manifest rows dedupe against this cache before hitting the API.
- Exponential backoff on 429/5xx; circuit-breaker falls back to Demo fixtures with a visible banner if eBay is down.
- **Circuit breaking is per-unit-of-work, not per-request**, across every multi-item surface: manifest rows, shipping quotes, and Trends keywords each fall back to a demo/fixture value independently on failure (carrying a `degraded: true` flag where applicable) rather than failing the whole batch when one item's live call errors.
- `fieldgroups` on Browse API search calls **replaces** the default field group rather than adding to it — a live gotcha that cost three iterations to fix in Trends (see §5.7). Any new Browse API call that needs both `itemSummaries` and a non-default field group must be split into two calls, not one call with a combined `fieldgroups` value.

---

## 7. AI layer (`lib/ai/`)

- One shared server-only Anthropic client (`client.ts`).
- Model per spec: `claude-sonnet-4-6` (spec explicitly warns against the outdated `claude-3-5-sonnet-latest` — verify current model naming before reusing this literally, spec is dated).
- Three consumers: `/api/analyze` (sourcing risk narrative — 2-3 sentence why + risks + counterplay + watch metric), `/api/brief` (POD campaign brief for Radar), `/api/manifest` (batched 25-row triage narrative, flags counterfeit-prone categories, restricted/hazmat items, seasonal mismatch, brand-gating).
- Prompt for `/api/analyze` explicitly instructs Claude **not** to recalculate or invent numbers — reason only over given values, and say so if a value is missing.
- Responses validated with Zod schemas (`schemas.ts`); defensively strips markdown code fences; `JSON.parse` wrapped in try/catch; graceful fallback text on failure rather than a crash.
- Every AI-dependent surface must remain fully functional (verdict + metrics) with `ANTHROPIC_API_KEY` unset — this is a stated acceptance criterion (spec M5).

---

## 8. Data model (`prisma/schema.prisma`)

SQLite locally, written to be Postgres-portable (no SQLite-only types) — switch by changing `DATABASE_URL` + `provider`.

- `Event` — Radar seed events (peak date, span, tier, region, scores, keywords/niches/design fields as JSON).
- `DemandSnapshot` — time-series demand points per event.
- `CompsCache` — 6h eBay comps cache, keyed by query hash.
- `Analysis` — saved Sourcing analyses (metrics, verdict, ruleId, confidence, AI narrative).
- `Manifest` — saved manifest runs (rows + summary as JSON).
- `User`, `UserNiche` — minimal user/persona/niche tracking.

Confirmed: this schema (from the spec / early build) has no dedicated tables for Middleman, Scout, HDLR, or Trends results — none of `app/api/{scout,trends}/route.ts` or `lib/{scout,middleman,hdlr}/` touch Prisma. All four are stateless/session-only: results live only in client state for the duration of the page visit and are lost on refresh. Nothing to export/save from those surfaces except what the UI itself offers (e.g. Manifest's CSV export, which *does* use `Manifest`/`Analysis`).

---

## 9. Design system (see `DESIGN.md` for full detail — summary here)

- Single OKLCH palette, two lightness modes switched via `data-mode` on `SurfaceShell`: **paper** (light) for planning surfaces (`/`, `/radar`), **console** (dark) for execution surfaces (`/sourcing` and likely the other reseller tools). Switch is instant, never animated.
- Fonts: **Archivo** (400/500/700/900, display/headings, 900 uppercase for verdicts) + **IBM Plex Mono** (every number — `.num` class, tabular figures).
- Status hues reserved for meaning only: `--gain` (emerald, profit/buy), `--warn` (amber, caution/demo), `--loss` (rose, pass/negative). Never color alone — always paired with a Lucide icon + text.
- Hard bans: colored side-stripe borders, gradient text, glassmorphism-as-decoration, hero-metric tile template, icon+heading+text card grids, eyebrow kickers, numbered 01/02/03 markers, emoji-as-icons, neon glow, untouched shadcn defaults.
- Accessibility floor: ≥4.5:1 body contrast / ≥3:1 large text in both modes, ≥44px touch targets, visible focus rings, full keyboard operability, `prefers-reduced-motion` fallback on all motion (150–300ms ease-out otherwise).

---

## 10. Environment & running locally

```bash
pnpm install
cp .env.example .env
pnpm exec prisma db push   # creates local SQLite dev.db
pnpm dev                   # http://localhost:3000
```

```bash
pnpm test     # Vitest — all pure engines in lib/
pnpm lint
pnpm build
```

| Variable | Required? | Purpose |
|---|---|---|
| `DATABASE_URL` | Set to something well-formed (`file:./dev.db`) | Only read on the live-eBay comps-cache path |
| `DEMO_MODE` | Recommended `true` for a fresh local/no-key setup | Server-side fallback used only when a request doesn't explicitly pass `demo`. **Confirmed:** the client-side toggle (`components/shared/DemoModeProvider.tsx`) now defaults to **OFF** — first-time visitors see live eBay data, not fixtures, because production eBay keys are live on the deployed site. A visitor who explicitly flips the toggle ON keeps that preference via `localStorage`. `.env.example`'s `DEMO_MODE="true"` is about the server-side fallback for local dev without keys, not the deployed app's default UI state — don't conflate the two when writing guide instructions. |
| `ANTHROPIC_API_KEY` | No | AI narrative/brief/manifest-triage; routes degrade to `available:false` without it |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | No | Live eBay Browse data; without them everything runs on fixtures |
| `EBAY_MARKETPLACE_ID` | No | Defaults `EBAY_US` |
| `EBAY_ENV` | No | `sandbox` or `production` |
| `EBAY_INSIGHTS_ENABLED` | No | Only set once eBay grants Marketplace Insights access |
| `EASYPARCEL_API_KEY` | No | Live shipping rates; falls back to labeled DEMO rates |
| `SHIP_FROM_POSTCODE` | No | Origin postcode for shipping estimate |

`.env` is git-ignored and never committed. `lib/ai/client.ts` is marked `import "server-only"` so `ANTHROPIC_API_KEY` cannot be bundled client-side — build fails if a client component imports it.

### Deploying
- **Vercel**: import repo, set `DEMO_MODE=true` + `DATABASE_URL=file:./dev.db` minimum. Caveat: Vercel serverless functions have no persistent filesystem, so the SQLite comps cache won't persist between requests — doesn't affect Demo Mode; for live eBay + working cache, point `DATABASE_URL` at real Postgres (schema is portable, just change `provider`).
- **Any Node host**: `pnpm build && pnpm start`; SQLite works normally with a persistent filesystem.

---

## 11. Build history (from git log, oldest → newest)

1. Initial `create-next-app` scaffold
2. M0 foundation + M1 pure engines
3. Design context docs added (`PRODUCT.md`, `DESIGN.md`, live-mode config)
4. `/sourcing` refined per design critique (2 P1 + 3 P2 fixes)
5. M2–M7 built: Co-Pilot UI, eBay layer, forecast, AI layer, manifest analyzer, Radar surface
6. M8 audit fixes: polish/adapt/optimize passes
7. README replaced with real project docs + deploy guide
8. `/middleman` added ([PR #3](https://github.com/mohdazlan/merch-radar/pull/3)); Demo Mode default flipped **off** (client-side UI default, once production eBay keys went live)
9. `/scout` added ("sold-item finder built from the flowchart", [PR #4](https://github.com/mohdazlan/merch-radar/pull/4))
10. Scout sort-label copy fix ([PR #5](https://github.com/mohdazlan/merch-radar/pull/5)) — contradicted the active-listings banner
11. Shipping estimator added ([PR #6](https://github.com/mohdazlan/merch-radar/pull/6)) — chargeable weight + EasyParcel live rates
12. `/trends` added ("live keyword compare — honest, not fake search-volume", [PR #7](https://github.com/mohdazlan/merch-radar/pull/7))
13. Trends fix ([PR #8](https://github.com/mohdazlan/merch-radar/pull/8)): `fieldgroups` param was suppressing price/seller data — first fix attempt
14. Trends fix #2 ([PR #9](https://github.com/mohdazlan/merch-radar/pull/9)): second guess also failed in production; final fix split the fetch into two evidence-based calls (see §5.7) and added the per-keyword `degraded` circuit breaker
15. `/hdlr` added ("aro feature") — most recent commit

Everything from step 8 onward (Middleman, Scout, HDLR, Trends, Shipping) is **not documented in the build spec** — the spec is frozen at the original M0–M8 plan. Any guide should treat the spec as historical/foundational and these four+ surfaces as a second, undocumented phase whose only source of truth is the code itself plus the in-file comments (which are unusually thorough — see `lib/scout/types.ts`, `lib/trends/types.ts`, `lib/middleman/analyze.ts`, `lib/hdlr/evaluate.ts`, `lib/ebay/keywordSignal.ts` header comments).

**Test suite:** 126 tests across 11 files, all passing (`pnpm test`), covering every pure engine in `lib/` including the Trends fix (`lib/trends/analyze.test.ts`, `lib/ebay` circuit-breaker coverage). **Deploy:** live in production at `merch-radar.mhdazlan.cc`, verified end-to-end against real eBay data after the two-call fix — e.g. `stanley tumbler`: active=37,918, new-seller 20%, price median $37.00 ($27.37–$48.86), top color breakdown by real listing counts.

---

## 12. Open questions / gaps worth resolving before writing a guide

Resolved since first draft of this doc:
- ~~`DEMO_MODE` default~~ — confirmed OFF client-side in production (§10).
- ~~Middleman/Scout/HDLR/Trends persistence~~ — confirmed stateless, no Prisma writes (§8).
- ~~Scout→HDLR handoff~~ — confirmed HDLR is independently reachable; it calls `/api/scout` itself internally rather than requiring a prior Scout session, and its results panel *points forward* to Scout (to inspect individual sellers) and Sourcing (to run the supplier cost through fee-true margin), not the reverse.

Still open:
- Confirm the actual Claude model string currently used in `lib/ai/client.ts` — the spec's `claude-sonnet-4-6` may be stale.
