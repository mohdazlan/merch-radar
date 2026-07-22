# Merch Radar

One app, two surfaces, one eBay demand engine:

- **Radar** (`/radar`) — what to make and by when. Seasonal/event demand with launch-by dates for POD sellers.
- **ApexSourcing Engine** (`/sourcing`, `/sourcing/manifest`) — what's worth buying today. Comps, sell-through, fee-true margin, and a rule-based verdict for resellers.

Full product/design context lives in [`PRODUCT.md`](./PRODUCT.md), [`DESIGN.md`](./DESIGN.md), and the build spec [`MERCH-RADAR-BUILD-SPEC-v2.md`](./MERCH-RADAR-BUILD-SPEC-v2.md).

## Getting started

```bash
pnpm install
cp .env.example .env
pnpm exec prisma db push   # creates the local SQLite dev.db
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). **Demo Mode is on by default**, so the app is fully functional with zero API keys — every eBay call is served from fixtures and every surface shows the amber `DEMO DATA` badge.

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
