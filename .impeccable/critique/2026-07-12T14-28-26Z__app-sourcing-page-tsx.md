---
target: /sourcing
total_score: 23
p0_count: 0
p1_count: 2
timestamp: 2026-07-12T14-28-26Z
slug: app-sourcing-page-tsx
---
# Design Critique — /sourcing (ApexSourcing Engine, M0)

Method: dual-agent (A: design review · B: detector + browser evidence)

## Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Demo Mode toggle produces zero visible change on this page |
| 2 | Match System / Real World | 3 | "STR" never expanded; "Math in TypeScript" subtitle is engineering-speak |
| 3 | User Control and Freedom | 1 | No sort, no verdict override, no editable buy costs (M2 pending) |
| 4 | Consistency and Standards | 3 | STR "—" has tooltip; identical "—" in Days-to-flip/Profit-day has nothing |
| 5 | Error Prevention | 2 | No inputs yet; engine's refusal to fabricate STR is proto-prevention |
| 6 | Recognition Rather Than Recall | 2 | R5_BUY rule IDs shown with no legend |
| 7 | Flexibility and Efficiency | 1 | Static table: no sorting, no keyboard shortcuts, no filtering |
| 8 | Aesthetic and Minimalist Design | 4 | Excellent — dense, flat; only repeated DEMO chips are noise |
| 9 | Error Recovery | 2 | Nothing can error yet; ErrorState unexercised |
| 10 | Help and Documentation | 2 | Only help is a mouse-only title attribute; "§5.3" shown to end users |
| **Total** | | **23/40** | Acceptable — mostly "M2 hasn't landed" |

## Anti-Patterns Verdict

Does not read as AI-made. No banned pattern present (no hero metrics, card grids, side stripes, gradient text, eyebrows, glassmorphism, neon-glow terminal). Verdict cell (chip + R5_BUY · conf 93%) is product-specific personality.

Deterministic scan: CLI clean (exit 0). Browser: 2 warnings, both line-length — page subtitle (~95ch) and table footnote (~206ch), no max-width. Two earlier hits (cramped-padding, footer overflow) were false positives from a zero-size viewport.

## What's Working

1. Verdict cell is an audit trail in 40px — computed by real engines against fixtures; the demo IS the product.
2. Contrast measured, not claimed — --ink-2 on console --bg = 7.99:1; status text 6.9–9.0:1.
3. Honest degradation designed — AirPods row: MODELED price, em dashes, LOW SAMPLE instead of invented sold data.

## Priority Issues

1. [P1] Verdict unusable at 380px — right-scrolling to Verdict loses item names (verified live). Fix: sticky first column with opaque bg (spec requires this for M6 manifest anyway). → /impeccable adapt
2. [P1] Low-confidence verdicts wear high-confidence styling — BUY at conf 40% pixel-identical to BUY at 93%; violates spec §5.4. Fix: outline-only/desaturated chip at low confidence. → /impeccable polish
3. [P2] Provenance inverted on demo data — fixture-derived estimate labeled MODELED; Rule 2 reserves MODELED for live-data computation. Fix: DEMO (or DEMO·MODELED) in Demo Mode. → /impeccable polish
4. [P2] Profit/day buried — spec's "THE number" is column 7 of 8, unstyled. Fix: gain/loss color + weight, or move adjacent to Verdict. → /impeccable layout
5. [P2] Explanations mouse-only and inconsistent — title tooltips unreachable by touch/keyboard/SR; only 1 of 3 em dashes explained. Fix: visible legend under table until M2 "Why?". → /impeccable clarify

## Persona Red Flags

- Alex: plain th headers, cannot sort by Profit/day; nothing responds to keypress except nav.
- Sam: overflow-x-auto wrapper not keyboard-focusable (needs tabindex=0 role=region); title tooltip unreachable; "R5_BUY" announces as raw fragment; th lacks scope="col".
- Riley: no title truncation (long eBay titles stretch table); buildRows() silently drops failed rows, no zero-row empty state; Demo toggle off changes nothing visible (reads as broken); $0.00 vs "—" ambiguity.

## Minor Observations

- DEMO chip repetition (5 chips + badge + footnote).
- Build-spec language leaks: "Math in TypeScript", "§5.3".
- Trends nav item can never be active (match: /^$/).
- min-w-[880px] magic value.
- Both detector-flagged paragraphs need max-w (~65–75ch).

## Questions to Consider

1. Why is the verdict the LAST column? Operator, not spreadsheet — Verdict second, math trailing.
2. Is a table the right container below 768px? Row-cards would kill the sticky-column problem.
3. Rule IDs are inert — as tap targets revealing inputs they'd deliver half of M2's "Why?" today.
