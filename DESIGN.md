# Design

One OKLCH system, two lightness modes. The mode shift is semantic — **paper** (light) for planning surfaces (`/`, `/radar`), **console** (dark) for execution surfaces (`/sourcing`, `/sourcing/manifest`). Same hues, inverted lightness ramp, switched instantly (never animated) by a `data-mode` attribute set in `components/shared/SurfaceShell.tsx`. Tokens live in `app/globals.css`.

## Color

Strategy: **Restrained** — tinted neutrals + per-surface accent; status hues reserved for meaning (profit/caution/loss), never decoration.

### Shared hues

| Token | Value | Role |
|---|---|---|
| `--riso-red` | `oklch(0.55 0.20 32)` | Radar accent, ultra tier |
| `--riso-blue` | `oklch(0.50 0.15 258)` | eBay data, sports tier |
| `--gain` | `oklch(0.65 0.15 155)` | profit, STRONG BUY / BUY |
| `--warn` | `oklch(0.72 0.15 75)` | caution, DEMO badge, low sample |
| `--loss` | `oklch(0.58 0.19 22)` | pass verdicts, negative margin |

### Paper mode (`[data-mode="paper"]`)

`--bg oklch(0.985 0.002 90)` · `--surface oklch(0.97 0.003 90)` · `--ink oklch(0.22 0.015 60)` · `--ink-2 oklch(0.42 0.01 60)` · `--line oklch(0.87 0.008 60)` · `--accent = --riso-red`. Status *text* variants darkened to clear 4.5:1 (`--gain-text oklch(0.45 0.13 155)` etc.).

### Console mode (`[data-mode="console"]`)

`--bg oklch(0.19 0.012 260)` · `--surface oklch(0.24 0.014 260)` · `--ink oklch(0.96 0.005 260)` · `--ink-2 oklch(0.74 0.012 260)` · `--line oklch(0.34 0.016 260)` · `--accent oklch(0.72 0.13 258)`. Status text variants brightened (`--gain-text oklch(0.75 0.15 155)` etc.).

## Typography

- **Archivo** (400/500/700/900) — everything. 900 uppercase for verdicts, masthead, section heads. Display clamp max ≤6rem, letter-spacing ≥ −0.04em, `text-wrap: balance` on headings.
- **IBM Plex Mono** (400/500/600) — every number, price, percentage, date, and stat strip. Apply via `.num` class; `font-variant-numeric: tabular-nums`.
- Loaded with `next/font/google` as `--font-archivo` / `--font-plex-mono`.

## Layout & density

- Sourcing/console is a workbench: 4/8px vertical rhythm, right-aligned numeric columns, hairline `--line` dividers instead of cards.
- Tables scroll horizontally in an `overflow-x-auto` wrapper; no horizontal page scroll anywhere. Breakpoints: 380 / 768 / 1440; Manifest becomes a Sourcing sub-tab below 900px.
- Semantic z-index scale: `--z-dropdown 10 → --z-sticky 20 → --z-modal-backdrop 30 → --z-modal 40 → --z-toast 50 → --z-tooltip 60`. Never arbitrary values.

## Components (components/shared, components/sourcing)

- `Chip` (tones: neutral/gain/warn/loss/accent/blue; icon optional but required for status tones — never color alone) and `ProvenanceTag` (LIVE / MODELED / DEMO / UNAVAILABLE).
- `DemoBadge` — persistent amber `DEMO DATA` badge; `always` prop for surfaces synthetic at MVP.
- `VerdictChip` — verdict word + Lucide icon, emerald/amber/rose by verdict family.
- `StatLine`, `EmptyState` (dashed border, icon, title, body), `ErrorState`, `CopyButton`.
- Header: sticky, wordmark left, nav center (2px accent underline + `aria-current`), Demo Mode switch right, mobile full-height sheet with ≥44px items.

## Motion

150–300ms ease-out only; state changes, not decoration. Mode switch is instant. `prefers-reduced-motion: reduce` collapses all animation globally in `globals.css`.

## Hard bans (spec §10)

Colored side-stripe borders · gradient text · glassmorphism as decoration · hero-metric template · identical icon-card grids · eyebrow kickers everywhere · numbered section markers · emoji as icons · neon glow on the console surface · default shadcn styling.
