# MERCH RADAR — Build Spec v2
### One app, two surfaces: **Radar** (what to make) + **ApexSourcing Engine** (what to buy)

> **How to use:** Feed this whole file to Claude Code as the project brief. It supersedes v1. Build in the milestone order in §12. The architectural rules in §3 and the design constraints in §10 are non-negotiable — they are what stop this from becoming another generic AI dashboard, and what stop the numbers from being untrustworthy.

---

## 1. Product thesis

Existing tools are **backward-looking readers**. Terapeak shows you what already sold. Seasonal-calendar apps show you a static table of holidays with invented 0–100 scores. Both stop at insight and leave the operator staring at a blank page.

We ship an **operator**, across two surfaces that share one data spine:

| Surface | Question it answers | User's decision |
|---|---|---|
| **Radar** (`/radar`) | *What should I create and list, and by when?* | Design & launch timing |
| **ApexSourcing Engine** (`/sourcing`) | *Should I buy this unit / this pallet, at this cost?* | Capital allocation |

Both run on the same eBay demand engine, the same fee/margin math, and the same Claude reasoning layer. **Radar is supply creation. ApexSourcing is supply acquisition.**

**Positioning line:** *"Stop finding out too late, and stop buying dead stock. Merch Radar tells you what to launch this week. ApexSourcing tells you what's worth buying today."*

### 1.1 ICP honesty (read this — it affects nav and onboarding)
These are **two different buyers** with overlap, not one:
- **Radar ICP:** solo/side-hustle POD seller on Etsy + eBay. Non-designer. <$10k/mo. Pain = *timing*.
- **ApexSourcing ICP:** high-volume reseller / retail-and-liquidation arbitrageur on eBay + Amazon. Sources pallets, thrift, clearance, wholesale. $5k–$100k/mo GMV. Pain = *capital risk on dead stock*.

They overlap in the eBay reseller who also dabbles in POD. Do **not** pretend they're one persona in the copy. Instead: onboarding asks *"What do you do?"* → **I create products** / **I source products** / **Both**, and the answer sets the default landing surface. Nav always exposes both. Track activation separately per surface; if one dominates, that's your product, and this spec has kept them cleanly separable so you can split them.

---

## 2. Tech stack

- **Next.js 14+ (App Router) + TypeScript strict**, Tailwind CSS, **Lucide React** for icons (SVG only — no emoji as icons, anywhere).
- **State:** React hooks + URL search params for filter state (shareable/bookmarkable views). No global state library needed at MVP; if it becomes needed, Zustand.
- **DB:** SQLite via **Prisma** for local dev; schema written to be Postgres-portable (no SQLite-only types). `DATABASE_URL` env-switched.
- **Charts:** **Recharts** for the sourcing forecast/decay curves and demand sparklines. The Radar 13-month timeline stays hand-rolled (CSS grid + absolutely positioned lane-packed bars) — Recharts is the wrong tool for that.
- **AI:** official **`@anthropic-ai/sdk`**, server-side only, model **`claude-sonnet-4-6`** (NOT `claude-3-5-sonnet-latest` — outdated). One shared client in `/lib/ai/client.ts`.
- **Marketplace data:** eBay Developer APIs (§8). Server-side only, never from the browser.
- **Env:** `ANTHROPIC_API_KEY`, `EBAY_CLIENT_ID`, `EBAY_CLIENT_SECRET`, `EBAY_MARKETPLACE_ID` (default `EBAY_US`), `EBAY_ENV` (`sandbox|production`), `DATABASE_URL`, `DEMO_MODE` (default `true`).

### 2.1 Directory shape
```
/app
  /(marketing)/page.tsx          landing
  /radar/page.tsx                surface 1
  /sourcing/page.tsx             surface 2 (Smart Co-Pilot)
  /sourcing/manifest/page.tsx    bulk pallet analyzer
  /api/brief/route.ts            Claude: POD campaign brief
  /api/analyze/route.ts          Claude: sourcing risk narrative
  /api/manifest/route.ts         Claude: batched manifest triage
  /api/comps/route.ts            eBay: comps + STR lookup
/components
  /shared      Header, Nav, Chip, StatLine, EmptyState, ErrorState, CopyButton
  /radar       Timeline, EventTable, EventRow, ActNowStrip, BriefPanel
  /sourcing    SourcingForm, VerdictBanner, MetricsGrid, FeeCalculator,
               DecayChart, HypePanel, ManifestTable, ManifestUploader
/lib
  /ebay        auth.ts, browse.ts, insights.ts, DemandSource.ts (interface)
  /fees        engine.ts, presets.ts            ← pure, unit-tested
  /verdict     engine.ts, rules.ts              ← pure, unit-tested
  /forecast    decay.ts                         ← pure, unit-tested
  /ai          client.ts, prompts.ts, schemas.ts (zod)
  /db          prisma client, seed.ts
/prisma        schema.prisma
```

---

## 3. THE THREE ARCHITECTURAL RULES (violating these breaks the product)

**Rule 1 — Math in TypeScript, judgment in Claude.**
Claude **never** produces a number that the user acts on. Fees, net margin, ROI, sell-through rate, days-to-flip, the decay curve, and the verdict are all computed by **pure, deterministic, unit-tested functions** in `/lib`. Claude receives those computed numbers as *input* and returns *narrative*: why the risk exists, what the counter-play is, what to watch. An LLM-computed margin is non-reproducible, undebuggable, and will eventually be wrong in a way that costs a user real money.

**Rule 2 — Never present a model output as an observation.**
Every projected number carries a visible provenance label and, where it's a projection, a confidence band:
- `LIVE` — pulled from eBay right now (comps, active count, sold count).
- `MODELED` — computed by our formulas from live data (STR, decay curve, days-to-flip). Shows method on hover.
- `DEMO` — synthetic. Rendered with a persistent amber `DEMO DATA` badge that cannot be dismissed.
The Hype/Sentiment panel (§7) is `DEMO` at MVP. It must be *unmistakably* badged. Shipping fake TikTok hype scores as if real is the fastest way to lose a reseller's trust permanently.

**Rule 3 — Decision support, not advice.**
The verdict is a rule engine, not an oracle. Every verdict shows **which rule fired** and the inputs behind it, and is overridable by the user. Persistent footer disclosure: *"Estimates based on marketplace data and modeled projections. Not financial advice. Verify comps before purchasing."*

---

## 4. Navigation & shell (the "new page in the header")

Header (sticky, `z-index: var(--z-sticky)`): wordmark left, nav center, Demo Mode toggle + account right.

Nav items — active state = 2px underline in the surface's accent, `aria-current="page"`:
- **Radar** → `/radar` (what to make)
- **Sourcing** → `/sourcing` (what to buy) ← **the new page**
- **Manifest** → `/sourcing/manifest` (bulk pallet triage; shown as a sub-tab within Sourcing on <900px)
- **Trends** → `/radar#trend-radar` (v1)

Mobile: hamburger → full-height sheet, items ≥44px tall. Nav is keyboard-navigable with a skip-link to `#main`.

**Demo Mode toggle** is global, persists to `localStorage`, and is *on* by default so the app is fully testable with no API keys configured. When on, every eBay call is served from `/lib/db/fixtures` and every surface shows the `DEMO DATA` badge.

---

## 5. ApexSourcing Engine — Smart Co-Pilot (`/sourcing`)

### 5.1 Input panel
Fields: **Product name or UPC/EAN** (required) · **Buy cost $** (required) · **Est. shipping cost $** (default auto-filled by weight band, editable) · **Qty** (default 1) · **Condition** (New / Used–Like New / Used–Good / For Parts) · **Target platform** (eBay / Amazon / Walmart / Mercari — sets fee preset) · **Item location** (for shipping estimate).

Sensible defaults everywhere. Analyze button disables + spinners during async. Inline validation (buy cost > 0, etc.) with errors next to the field, not at the top.

### 5.2 Data fetch (`/api/comps`)
1. eBay **Browse API** → active listings matching the query (title-normalized, condition-filtered). Gives `activeCount` and active price distribution.
2. eBay **Marketplace Insights API** (90-day sold) → `soldCount`, sold-price distribution, sold-date series. *If Insights access isn't granted yet, fall back to the Browse-only path and mark STR as `UNAVAILABLE` rather than guessing — see §8.*
3. Outlier-trim both sets (drop top/bottom 5%), compute median, p25, p75.

### 5.3 Computed metrics (pure functions — unit tests required)
```ts
estSellPrice   = median(soldPrices)                       // MODELED; fall back to median(activePrices) × 0.88
sellThroughRate= soldCount / (soldCount + activeCount)    // the real Terapeak metric. 0–1.
daysToFlip     = clamp(90 / max(soldCount, 1) * activeCount / competitionFactor, 1, 365)
                 // i.e. how deep the queue is ahead of you at current sell velocity
netProceeds    = estSellPrice − fees(estSellPrice, preset) − shippingCost
netProfit      = netProceeds − buyCost
roi            = netProfit / (buyCost + shippingCost)
margin         = netProfit / estSellPrice
capitalPerDay  = netProfit / daysToFlip     // THE number high-volume resellers actually optimize
```
`capitalPerDay` (profit velocity) is the metric Terapeak doesn't give them and the one that separates a good flip from a slow one. Feature it.

### 5.4 Verdict engine (`/lib/verdict/rules.ts` — deterministic, ordered, auditable)
Evaluate in order; first match wins. Each rule returns `{verdict, confidence, ruleId, reason, inputs}`.

| # | Rule | Verdict |
|---|---|---|
| 1 | `roi < 0` or `netProfit <= 0` | **PASS — NEGATIVE MARGIN** |
| 2 | `sellThroughRate < 0.20` **and** `daysToFlip > 60` | **PASS — DEAD STOCK RISK** |
| 3 | `decaySlope < −0.15` (price falling >15% over 90d trend) **and** `daysToFlip > 30` | **PASS — PRICE DECAY** |
| 4 | `roi >= 0.40` **and** `sellThroughRate >= 0.60` **and** `daysToFlip <= 21` | **STRONG BUY** |
| 5 | `roi >= 0.25` **and** `sellThroughRate >= 0.40` | **BUY** |
| 6 | `roi >= 0.20` **and** `decaySlope < −0.08` | **CAUTION — SHORT FLIP** (list immediately, price to move) |
| 7 | otherwise | **CAUTION — THIN MARGIN** |

**Confidence** is a separate computation, and it must reflect *data quality*, not enthusiasm:
`confidence = w1·sampleSize(soldCount) + w2·priceVariance(inverse) + w3·dataFreshness + w4·titleMatchQuality` → 0–100%. Fewer than 5 comps caps confidence at 40% and shows a `LOW SAMPLE` warning. **A verdict with low confidence must never be styled with the same visual weight as a high-confidence one.**

### 5.5 Verdict banner
Full-bleed banner: verdict word (Archivo 900, uppercase), confidence % in mono, one-line `reason` from the rule, and a **"Why?"** disclosure that expands the exact inputs and rule that fired. Colors: STRONG BUY / BUY → emerald; CAUTION → amber; PASS → rose. Never color alone — each verdict has a Lucide icon and text label (a11y `color-not-only`).

### 5.6 Metrics grid
Six tiles: Est. sell price · Net profit · ROI % · Sell-through rate · Days to flip · **Profit/day**. Each shows value (IBM Plex Mono), label, provenance tag, and a delta vs. the category benchmark where available. These are **data tiles, not the SaaS hero-metric template** — no giant gradient numbers, no decorative icons; dense, aligned, terminal-like.

### 5.7 Fee calculator (`/lib/fees/`)
Interactive, always visible, and **it is the audit trail for `netProfit`** — the user must be able to see every dollar subtracted.

Fee presets are **versioned, dated, and configurable** — do not hardcode "13.25%" as universal truth; eBay's final value fee is category-dependent and changes.
```ts
type FeePreset = {
  id: string; label: string; effectiveDate: string; sourceUrl: string;
  finalValuePct: number;        // category-dependent; default eBay ~13.25%
  perOrderFixed: number;        // eBay ~$0.30 (tiered by order value)
  categoryOverrides?: Record<string, number>;
  promotedListingPct?: number;  // optional ad rate, user-set (default 0)
  storeSubscriptionMonthly?: number; // amortized across monthly volume, optional
  internationalPct?: number;
  paymentProcessingPct?: number;
}
```
Ship presets for **eBay**, **Amazon FBM**, **Amazon FBA** (referral + fulfillment tiers), **Walmart**, **Mercari**, plus **Custom**. Toggle between presets → all downstream metrics and the verdict recompute live. Show a line-item waterfall: `Sell price − FVF − fixed − ads − shipping − buy cost = Net`. Each preset displays its `effectiveDate` and links its source so the user knows how fresh the numbers are.

---

## 6. Predictive trend & decay forecast (the actual Terapeak killer)

**This must be an honest model, not a guess dressed as a prophecy.**

- **Input:** the 90-day sold-price time series from Marketplace Insights (or, in Demo Mode, fixtures).
- **Model:** ordinary least-squares regression on log(price) vs. days → yields a decay/growth rate. Project 30/60/90 days forward. Compute the residual standard error and render a **confidence band** (±1σ) as a shaded Recharts `Area` around the projected line.
- **Chart (Recharts):** historical sold prices (solid, `LIVE`) → today marker (`ReferenceLine`) → projection (dashed, `MODELED`) with the band. Tooltip shows value, band, and n. Legend labels the provenance explicitly.
- **Price Decay Warning:** fires when `decaySlope < −0.08/90d` **or** when `activeCount` grows >30% WoW while `soldCount` is flat (saturation signal). Renders as an inline amber alert with the driver named ("Active supply up 42% this week; sold velocity flat — market is saturating") — **not** a colored side-stripe callout.
- **Guardrail:** if fewer than 12 sold data points exist, do **not** draw a projection. Show an honest empty state: *"Not enough sold history to forecast (n=4). Treat this as an unmodeled buy."* Refusing to forecast is a feature; it is the exact opposite of what a hype tool does, and it's why serious resellers will trust you.

---

## 7. Multi-channel sentiment & hype tracker (`DEMO` at MVP — be honest about it)

Panel with three gauges: **TikTok Hype Score**, **Reddit mention velocity**, **Amazon BSR trend**.

- **At MVP these are synthetic** and are rendered inside a container with a permanent, non-dismissible `DEMO DATA — not live` badge and a "How we'll source this" tooltip. Do not blur the line.
- **Real sourcing path (build behind a `SentimentSource` interface so it drops in later):** Reddit public JSON API for mention velocity (free, legitimate); Google Trends via an unofficial adapter or a paid trends provider; Amazon BSR via a licensed data provider (Keepa/Rainforest — do **not** scrape Amazon). TikTok has no usable public search API — treat it as a paid-provider or manual-signal slot, not a fake gauge.
- **AI summary box:** `/api/analyze` sends Claude the *computed* metrics (STR, decay slope, active/sold counts, price spread, verdict + ruleId) plus any real sentiment signals available, and asks for a 2–3 sentence risk narrative + one counter-play. Claude explains; Claude does not score.

**Claude prompt (`/lib/ai/prompts.ts`, verbatim shape):**
```
You are a sourcing risk analyst for high-volume marketplace resellers.
You will receive computed marketplace metrics. Do NOT recalculate or invent any numbers —
reason only over the values given. If a value is missing, say so rather than estimating it.

Product: {title} | Condition: {condition} | Platform: {platform}
Buy cost: {buyCost} | Est. sell: {estSellPrice} | Net profit: {netProfit} | ROI: {roi}
Sell-through: {str} | Active listings: {activeCount} | Sold (90d): {soldCount}
Price trend (90d slope): {decaySlope} | Days to flip: {daysToFlip} | Profit/day: {capitalPerDay}
Verdict from our rule engine: {verdict} (rule {ruleId}, confidence {confidence}%)
Sentiment signals available: {sentiment | "none"}

Respond ONLY with minified JSON, no markdown fences:
{"why":"2-3 sentences explaining the demand/risk picture behind these numbers",
 "risks":["2-3 specific, concrete risks for this exact item"],
 "counterplay":"one tactical move that improves the outcome (pricing, timing, bundling, listing angle, or walking away)",
 "watch":"the single metric to re-check before committing capital"}
```
Validate the response with a **zod schema** (`/lib/ai/schemas.ts`); strip ```` ```json ```` fences defensively; `JSON.parse` in try/catch; on failure render a graceful fallback ("Analysis unavailable — the numbers above still stand") rather than crashing. The verdict must render **without** Claude — AI is additive, never a dependency for the core decision.

---

## 8. eBay integration

- **OAuth2 client-credentials** → app token, scope `https://api.ebay.com/oauth/api_scope`. Cache ~2h, refresh on 401. Server-side only.
- **Browse API** `/buy/browse/v1/item_summary/search` → active supply, active price distribution. Free tier ≈5,000 calls/day.
- **Marketplace Insights API** → 90-day sold data. **Requires eBay approval and is not guaranteed.** This is the single biggest external dependency in the project. Mitigation, and it is mandatory:
  ```ts
  interface DemandSource {
    getActive(q: SearchQuery): Promise<ActiveComps>;
    getSold(q: SearchQuery): Promise<SoldComps | { status: 'UNAVAILABLE' }>;
  }
  ```
  Implementations: `EbayBrowseSource` (always), `EbayInsightsSource` (when approved), `FixtureSource` (Demo Mode). When `getSold` returns `UNAVAILABLE`, the UI degrades honestly: STR and the forecast show "requires sold data" empty states; margin math still works off active-price comps with a clear `estimate` provenance tag. **Never fabricate sold data to fill the gap.** Apply for Insights access on day one.
- **Caching:** comps cached per normalized query for 6h (Prisma table). Manifest rows dedupe against this cache before hitting the API — a 200-row pallet must not fire 200 uncached calls.
- Exponential backoff on 429/5xx. Circuit-breaker → Demo fixtures with a visible banner if eBay is down.

---

## 9. Bulk manifest / pallet analyzer (`/sourcing/manifest`)

The highest-leverage feature for the ApexSourcing ICP — it's how they actually buy (liquidation pallets, wholesale lots) — and the one most likely to blow up your API bill if built naively.

**Flow:** paste CSV/TSV or raw spreadsheet text (or drop a `.csv`) → header auto-detection with a manual column-mapper fallback (`Item Name` | `Qty` | `Unit Buy Cost`) → preview table with row-level validation errors → **Analyze**.

**Pipeline (cost-controlled — this is the part your original brief would have gotten wrong):**
1. Normalize + **dedupe** titles; collapse identical items, summing qty.
2. Check the comps cache; only cache-miss rows hit eBay.
3. Rate-limited concurrent comps fetch (`p-limit`, concurrency 5) with a progress bar and partial-results streaming — rows populate as they resolve, never a frozen "Analyzing…" screen.
4. Run the **fee + verdict engines locally per row** (zero AI cost — this is why Rule 1 matters: a 200-row manifest costs $0 in tokens to score).
5. **One** Claude call per **batch of 25 rows**, for triage narrative only — flags non-obvious risks (counterfeit-prone categories, restricted/hazmat items, seasonal mismatch, brand-gated on Amazon). Hard cap: max 8 AI calls per manifest, with an explicit spend estimate shown before the run and a confirm step above a configurable threshold.
6. Cache everything by content hash so re-running a manifest is free.

**Output table:** sortable by ROI, profit/day, or total net. Columns: Item · Qty · Unit cost · Est. sell · Net/unit · Total net · ROI · STR · Days to flip · Verdict badge · AI flag. Row-level **Dead Stock Risk** highlighting (amber/rose background tint + icon + text — never a left border stripe). Above the table, a manifest-level summary line in mono: `total cost · projected net · blended ROI · n dead-stock risks · projected days to clear`. **This is the number that decides whether they bid on the pallet.** Export enriched CSV.

Handle gracefully: 500+ rows (virtualize with `@tanstack/react-virtual`), malformed rows (skip + report, never crash), non-UTF8 paste, currency symbols and thousands separators in cost columns.

---

## 10. Design system

**One system, two lightness modes — not two clashing aesthetics.** The app has a single OKLCH palette. Planning surfaces (Radar) run in the **paper** mode; execution surfaces (Sourcing, Manifest) run in the **console** (dark) mode requested for the terminal feel. Same hues, inverted lightness ramp. The mode shift is *semantic*: light = deciding what to make, dark = executing with capital on the line. The transition between them is instant, not animated.

```css
/* shared hues */
--riso-red:   oklch(0.55 0.20 32);   /* Radar accent, ultra tier */
--riso-blue:  oklch(0.50 0.15 258);  /* eBay data, sports tier */
--gain:       oklch(0.65 0.15 155);  /* emerald — profit, STRONG BUY */
--warn:       oklch(0.72 0.15 75);   /* amber — caution, demo badge */
--loss:       oklch(0.58 0.19 22);   /* rose — pass, negative margin */

/* paper mode (Radar) */
--bg: oklch(0.985 0.002 90);  --surface: oklch(0.97 0.003 90);
--ink: oklch(0.22 0.015 60);  --ink-2: oklch(0.42 0.01 60);  --line: oklch(0.87 0.008 60);

/* console mode (Sourcing) */
--bg: oklch(0.19 0.012 260);  --surface: oklch(0.24 0.014 260);
--ink: oklch(0.96 0.005 260); --ink-2: oklch(0.74 0.012 260); --line: oklch(0.34 0.016 260);
```
Every surface pairs a text color with a background that clears **≥4.5:1** for body and **≥3:1** for large text. Verify both modes — dark-mode secondary text that "looks elegant" at 3:1 body is the most common failure and it is a bug.

**Type:** one family — **Archivo** (400/500/700/900). 900 uppercase for verdicts, masthead, section heads. **IBM Plex Mono** for every number, price, percentage, date, ticker, and the stats/summary strips. This mono/display pairing *is* the terminal feel; you don't need chrome, gradients, or glow to get there. Display clamp max ≤6rem, letter-spacing ≥ −0.04em, `text-wrap: balance` on headings.

**Density:** the Sourcing surface is a **workbench, not a landing page**. Tight vertical rhythm (4/8px scale), tabular figures (`font-variant-numeric: tabular-nums`), right-aligned numeric columns, hairline `--line` dividers rather than cards. Data density is the aesthetic.

**Hard bans** (rewrite the element if you catch yourself doing any of these): colored left/right border stripes on cards, rows, or alerts · gradient text (`background-clip: text`) · glassmorphism as decoration · the hero-metric template (giant gradient number + label + supporting stats) · identical icon+heading+text card grids · tiny uppercase tracked eyebrows above every section · numbered `01/02/03` section markers · emoji as icons · default shadcn styling left untouched · neon glow on the "terminal" surface (Bloomberg is dense and flat, not a Tron set).

**Quality bar:** touch targets ≥44px · visible focus rings (never `outline: none`) · full keyboard operation of tables, tabs, modals (`aria-expanded`, focus trap + Esc in modals) · motion 150–300ms ease-out-quart, `@media (prefers-reduced-motion: reduce)` alternative on every animation · semantic z-index scale (dropdown → sticky → modal-backdrop → modal → toast → tooltip) — never `9999` · mobile-first: the manifest table scrolls horizontally with a sticky first column at 380px; no horizontal *page* scroll anywhere · **loading, empty, error, and low-confidence states designed for every async surface** (they are the majority of what a real user sees on day one).

---

## 11. Data model (Prisma, abbreviated)

```prisma
model Event        { id String @id  slug String @unique  name String  tier String  region String
                     peakDate DateTime  spanStart DateTime  spanEnd DateTime  leadWeeks Int
                     etsyScore Int  ebayScore Int  keywords Json  niches Json
                     designDirections Json  palettes Json  styles Json  products Json }
model DemandSnapshot { id String @id  eventId String  date DateTime  source String
                       matchCount Int  soldCount Int?  velocity Float? }
model CompsCache   { id String @id  queryHash String @unique  payload Json  fetchedAt DateTime }
model Analysis     { id String @id  userId String?  title String  buyCost Float  shipCost Float
                     platform String  metrics Json  verdict String  ruleId String
                     confidence Int  aiNarrative Json?  createdAt DateTime }
model Manifest     { id String @id  userId String?  name String  rows Json  summary Json  createdAt DateTime }
model User         { id String @id  email String @unique  persona String  createdAt DateTime }
model UserNiche    { userId String  niche String }
```
Derived, never stored: `launchBy = peakDate − leadWeeks·7d` · all sourcing metrics in §5.3 (recompute from inputs so a fee-preset change is instantly reflected).

*(The Radar seed dataset — 30 global events: Halloween, Christmas, BFCM, Valentine's, Mother's/Father's Day, Easter, Diwali, Lunar New Year, Eid, World Cup, Super Bowl, NBA Finals, NFL season, March Madness, Pride, Back-to-School, graduation, wedding season, 4th of July, etc., each with peak date, span, tier, lead weeks, Etsy/eBay baseline scores, keywords, niches, design directions, palettes, styles, and best products — carries over unchanged from spec v1 §7. Recompute movable dates (Easter, Eid, Lunar NY, Super Bowl) at seed time.)*

---

## 12. Build order & acceptance criteria

**M0 — Foundation.** Next.js + TS strict + Tailwind + Prisma + tokens (both modes) + shell/header/nav + Demo Mode toggle + fixtures. ✅ Both routes render, nav switches modes, `DEMO DATA` badge visible, zero API keys needed.

**M1 — Pure engines (do this before any UI logic).** `/lib/fees`, `/lib/verdict`, `/lib/forecast` as pure functions with **Vitest unit tests**, including edge cases (zero comps, negative margin, single data point, fee-preset switching). ✅ `pnpm test` green; margin math reproducible by hand from the waterfall.

**M2 — Sourcing Co-Pilot UI.** Input panel → verdict banner (with "Why?" rule disclosure) → metrics grid → fee waterfall, all running on fixtures. ✅ Changing the fee preset recomputes the verdict live; low-confidence verdicts visibly differ from high-confidence ones.

**M3 — eBay live data.** OAuth, Browse, `DemandSource` interface, comps cache, Insights adapter behind a flag. ✅ Real product lookup returns real comps; with `getSold → UNAVAILABLE` the UI degrades honestly and never invents sold data.

**M4 — Forecast + decay.** Recharts historical + projection with confidence band, decay/saturation warnings, the n<12 refusal state. ✅ A thin-data item refuses to forecast instead of drawing a fake line.

**M5 — AI layer.** `/api/analyze` with zod-validated Claude output, hype panel (badged DEMO), graceful degradation. ✅ Killing `ANTHROPIC_API_KEY` leaves the verdict and all metrics fully functional.

**M6 — Manifest analyzer.** Paste/upload → mapper → batched pipeline → sortable results + dead-stock flags + summary line + CSV export. ✅ A 200-row manifest completes with ≤8 AI calls, streams partial results, and re-runs from cache for free.

**M7 — Radar surface.** Timeline, event table, filters, campaign briefs (from spec v1). ✅ Both surfaces coexist under one nav with no style bleed.

**M8 — Hardening & design pass.** Contrast audit in both modes, keyboard walkthrough of every interactive surface, reduced-motion, all empty/error/low-confidence states, the §10 ban list, 380/768/1440 breakpoints, disclaimer footer. ✅ Nothing on screen could be mistaken for a default AI-generated dashboard; every number on screen can be traced to either a live source or a disclosed formula.

**Definition of done:** a reseller pastes a pallet manifest, sees within seconds which lines make money and which are dead stock, understands exactly *why* each verdict fired, can trace every dollar of margin through the fee waterfall, and is never shown a number the app can't defend.
