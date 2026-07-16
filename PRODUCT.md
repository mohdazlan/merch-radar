# Product

## Register

product

## Users

Two distinct ICPs sharing one app (per spec §1.1 — do not blend them in copy):

- **Radar:** solo/side-hustle POD sellers on Etsy + eBay. Non-designers, <$10k/mo. Their pain is *timing* — finding out about seasonal demand two weeks too late.
- **ApexSourcing:** high-volume resellers / retail-and-liquidation arbitrageurs on eBay + Amazon ($5k–$100k/mo GMV). Sourcing pallets, thrift, clearance, wholesale. Their pain is *capital risk on dead stock*. They are in a buying decision with real money on the line, often on a phone in a warehouse or at an auction preview.

## Product Purpose

An **operator, not a backward-looking reader**. Terapeak shows what already sold; we tell the user what to launch this week (Radar) and whether this unit/pallet is worth buying today at this cost (ApexSourcing). Success = a reseller pastes a manifest, sees within seconds which lines make money, understands exactly why each verdict fired, and can trace every dollar of margin.

## Brand Personality

Honest, dense, auditable. The sourcing surface is a **workbench, not a landing page** — Bloomberg-dense and flat, never a Tron set. Three words: *trustworthy, terminal, operator*. The emotional goal is earned confidence: the user should feel the numbers are defensible, never hyped.

## Anti-references

- The generic AI dashboard: hero-metric tiles with giant gradient numbers, icon+heading+text card grids, glassmorphism, neon-glow "terminal" cosplay.
- Hype tools that dress guesses as prophecy (fake TikTok scores, invented 0–100 "trend scores").
- Colored left-border stripe callouts, gradient text, numbered 01/02/03 section markers, eyebrow kickers on every section, emoji as icons, untouched shadcn defaults.

## Design Principles

1. **Math in TypeScript, judgment in Claude** — no number the user acts on comes from an LLM; every metric is a disclosed, reproducible formula.
2. **Never present a model output as an observation** — every number carries LIVE / MODELED / DEMO provenance; synthetic data is unmistakably badged.
3. **Refusing to guess is a feature** — thin data gets an honest empty state, not a fabricated forecast; low-confidence verdicts never wear high-confidence styling.
4. **Decision support, not advice** — verdicts name the rule that fired and expose the inputs; the user can always override.
5. **Data density is the aesthetic** — mono tabular numbers, right-aligned columns, hairline dividers; the mode split is semantic (paper = planning, console = executing).

## Accessibility & Inclusion

- Contrast ≥4.5:1 body / ≥3:1 large text, verified in **both** paper and console modes.
- Never color alone: every verdict/status pairs an icon and text with its hue.
- Touch targets ≥44px; visible focus rings (never `outline: none`); full keyboard operation of tables, tabs, and modals; semantic z-index scale.
- `prefers-reduced-motion` alternative on every animation; motion 150–300ms ease-out.
- Loading, empty, error, and low-confidence states are designed surfaces, not afterthoughts.
