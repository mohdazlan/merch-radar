# Merch Radar

One app, seven surfaces, one eBay demand engine:

- **Radar** (`/radar`) — what to make and by when. Seasonal/event demand with launch-by dates for POD sellers.
- **Sourcing** (`/sourcing`) — what's worth buying today. Comps, sell-through, fee-true margin, and a rule-based verdict for resellers.
- **Manifest** (`/sourcing/manifest`) — bulk pallet/manifest analyzer; scores every line of a liquidation lot at once.
- **Middleman** (`/middleman`) — margin + undercut pricing when your supplier is a friend with elastic capacity (wholesale/FX flips), not a one-shot pallet buy.
- **Scout** (`/scout`) — finds *already-selling* items from low-feedback sellers, i.e. products that carry themselves without reputation.
- **HDLR** (`/hdlr`) — a five-gate qualification check (demand, new-seller, risk, competition, supplier) before you commit capital to a Scout find.
- **Trends** (`/trends`) — compares 1–5 keyword ideas on real eBay market composition (active supply, price spread, top attributes, new-seller share). Not a fake "search volume" score — see [`PROJECT-REFERENCE.md`](./PROJECT-REFERENCE.md#57-trends-trends--added-post-spec-pr-7-fixed-in-pr-89).

Full product/design context lives in [`PRODUCT.md`](./PRODUCT.md), [`DESIGN.md`](./DESIGN.md), the original build spec [`MERCH-RADAR-BUILD-SPEC-v2.md`](./MERCH-RADAR-BUILD-SPEC-v2.md) (covers Radar + Sourcing/Manifest only), and [`PROJECT-REFERENCE.md`](./PROJECT-REFERENCE.md) (covers everything, including the four surfaces built after the spec).

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm exec prisma db push   # creates the local SQLite dev.db
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). With no API keys configured, every surface automatically runs on fixtures and shows the amber `DEMO DATA` badge. **Note:** the Demo Mode toggle itself now defaults to **off** in the UI (it flips to fixtures automatically whenever `EBAY_CLIENT_ID`/`EBAY_CLIENT_SECRET` aren't set or a live call fails — see `components/shared/DemoModeProvider.tsx`) — this changed after eBay keys went live in production, so a first-time visitor to the deployed app sees real marketplace data by default, not synthetic fixtures. Locally, with no keys in `.env`, you'll still see demo data even with the toggle off, since live calls aren't possible.

Live calls degrade gracefully and independently per item, not all-or-nothing: a failed live lookup for one Manifest row, one Trends keyword, or one shipping quote falls back to a `degraded`-flagged demo value for just that item, while the rest of the batch stays live.

```bash
pnpm test     # Vitest — the pure engines in lib/ (fees, verdict, forecast, manifest parsing)
pnpm lint
pnpm build
```

## Environment variables

Copied from [`.env.example`](./.env.example). **None of these are required to run or demo the app** — Demo Mode works with an empty `.env`.

| Variable | Required? | Notes |
|---|---|---|
| `DATABASE_URL` | Set to *something* well-formed (e.g. `file:./dev.db`) | Only read on the live-eBay path (6h comps cache). Prisma initializes even if nothing ever writes to it in Demo Mode. |
| `DEMO_MODE` | Recommended: `true` | Default app-wide fallback when a request doesn't explicitly pass `demo`. |
| `ANTHROPIC_API_KEY` | No | Enables the AI risk narrative (`/api/analyze`), campaign briefs (`/api/brief`), and manifest AI triage (`/api/manifest`). Without it, those routes return `available:false` and the UI shows its designed fallback — the verdict and all metrics never depend on this key. |
| `EBAY_CLIENT_ID` / `EBAY_CLIENT_SECRET` | No | Enables live eBay Browse data. Without them, comps always come from fixtures (Demo Mode), regardless of the toggle. |
| `EBAY_MARKETPLACE_ID` | No | Defaults to `EBAY_US`. |
| `EBAY_ENV` | No | `sandbox` or `production`. |
| `EBAY_INSIGHTS_ENABLED` | No | Set to `true` only once eBay has granted Marketplace Insights access — this is a separate, harder approval than Browse API access. Until then sold data stays `UNAVAILABLE` rather than being guessed. |

Your `.env` file is git-ignored (see `.gitignore`) and has never been committed — only `.env.example`, which contains empty placeholder values. See [`lib/ai/client.ts`](./lib/ai/client.ts) — it's marked `import "server-only"`, so `ANTHROPIC_API_KEY` can never be bundled into client-side JavaScript; the build fails if a client component ever imports it.

## Deploying

### Vercel

1. Import the repo at [vercel.com/new](https://vercel.com/new).
2. Add the env vars from the table above under **Environment Variables**. For a first deploy, `DEMO_MODE=true` and `DATABASE_URL=file:./dev.db` are enough — everything else is optional and can be added later without a redeploy of code.
3. **SQLite caveat**: Vercel's serverless functions don't have a persistent writable filesystem, so the `file:./dev.db` comps cache won't actually persist between requests. This doesn't affect Demo Mode (fixtures never touch the DB). If you later enable live eBay data and want the 6h comps cache to work, point `DATABASE_URL` at a real Postgres instance instead (Vercel Postgres, Neon, Supabase all have free tiers) — the schema in [`prisma/schema.prisma`](./prisma/schema.prisma) is written to be Postgres-portable, just switch the `provider`.

### Elsewhere (any Node host)

```bash
pnpm build
pnpm start
```

SQLite works normally on a host with a persistent filesystem.

## Project structure

See the directory shape in [`MERCH-RADAR-BUILD-SPEC-v2.md`](./MERCH-RADAR-BUILD-SPEC-v2.md#21-directory-shape). In short: `/lib/fees`, `/lib/verdict`, `/lib/forecast` are pure, unit-tested functions — Claude never computes a number the user acts on (see spec §3, Rule 1).

## Learn more

Built on [Next.js](https://nextjs.org) (App Router) — see the [Next.js docs](https://nextjs.org/docs) for framework-level questions.
