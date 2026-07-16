---
target: /sourcing
total_score: 31
p0_count: 0
p1_count: 0
timestamp: 2026-07-12T22-47-02Z
slug: app-sourcing-page-tsx
---
# Design Critique (re-run) — /sourcing (ApexSourcing Engine, M0)

Method: dual-agent (A: design review · B: detector + browser evidence). Re-critique after the adapt/polish/clarify fix pass. Baseline was 23/40.

## Design Health Score

| # | Heuristic | Score | Δ | Key Issue |
|---|-----------|-------|---|-----------|
| 1 | Visibility of System Status | 4 | +1 | Provenance everywhere; only ceiling is no live/loading states yet (static M0) |
| 2 | Match System / Real World | 3 | 0 | Reseller language landed, but R5_BUY / R2_DEAD_STOCK rule codes still leak |
| 3 | User Control and Freedom | 2 | +1 | Keyboard-scrollable region, Esc, skip-link added; core input/override is M2 |
| 4 | Consistency and Standards | 4 | +1 | Chip system + weak variant + tabular nums fully consistent |
| 5 | Error Prevention | 3 | +1 | Weak-chip variant stops a shaky verdict being misread as confident |
| 6 | Recognition Rather Than Recall | 3 | +1 | Visible legend replaces mouse-only tooltips; STR spelled out |
| 7 | Flexibility and Efficiency | 2 | +1 | Scroll region keyboard-operable; still no sort/filter/search |
| 8 | Aesthetic and Minimalist Design | 4 | 0 | Holds — dense, flat, hard-bans respected |
| 9 | Error Recovery | 3 | +1 | Empty states designed and instructive; thin-data degrades to "—" |
| 10 | Help and Documentation | 3 | +1 | Inline legend + est-method notes + named rules; full Why? is M2 |
| **Total** | | **31/40** | **+8** | Good — remaining gaps are all M0 scope, not design defects |

## Anti-Patterns Verdict

Not slop, by either assessor. Honors its own anti-references: no hero metrics, gradient text, icon-card grid, eyebrows, or neon. Flat hairline-divided mono-tabular table, Bloomberg-dense on purpose.

Deterministic scan: CLI clean (exit 0), overlay console "No anti-patterns found," direct re-scan []. Both prior line-length findings (subtitle ~95ch, footnote ~206ch) are GONE — the max-w-prose fix resolved them, no new findings replaced them. Viewport false-positive trap from the baseline run was explicitly guarded (verified 1280x720 before injection).

## What's Working

1. The low-confidence weak chip is exemplary — dashed, fill-less, ink-2 (7.99:1), visibly subordinate to the solid confident chip yet legible. Executes "refusing to guess is a feature" better than most shipping fintech UIs.
2. End-to-end provenance honesty — persistent DEMO badge + per-row conf% / low sample + sold-median vs active-only + "zero AI, zero API calls."
3. Responsive + a11y craft at 380px — sticky opaque item column with hairline separator holds context while the row scrolls; focusable keyboard-scrollable role=region with sr-only caption + skip link.

## Resolved From Baseline (all verified live)

- [P1] Sticky item column at 380px — item stays pinned while row scrolls. FIXED.
- [P1] Low-confidence verdict styling — Pyrex 40% / AirPods 29% dashed vs Switch 93% solid. FIXED.
- [P2] MODELED-on-demo mislabel — replaced by sold median / active only method notes. FIXED.
- [P2] Mouse-only tooltips + inconsistent "—" — visible dl legend, zero title attributes, STR expanded. FIXED.
- [Minor] Copy leaks ("Math in TypeScript", "§5.3") — rewritten to reseller language. FIXED.

## Priority Issues (remaining)

1. [P2] Profit/day only half-fixed — got color + weight, but as the rightmost column it's the first to scroll off at 380px, the exact phone/warehouse moment it matters most. Fix: on <900px surface it next to Verdict or in the sticky block. → /impeccable adapt
2. [P2] ruleId codes exposed — R5_BUY / R2_DEAD_STOCK are internal identifiers with no on-surface key. Fix: rely on the plain-language verdict text; defer the Rn code to the M2 "Why?" disclosure. → /impeccable clarify
3. [P3] Net profit green on every demo row including PASS rows — the loss-text branch is never exercised. Fix: add one negative-margin fixture to prove the honesty story and validate the branch. → /impeccable harden
4. [P3] Est. sell provenance imprecision — legend says "not an observed price" but sold-median rows are essentially observed. Fix: "estimate — from sold median where available." → /impeccable clarify
5. [P3] Item cell is td, not th scope="row" — SR won't announce it as the row header. Fix: make the sticky item cell a row header. → /impeccable audit

No P0s, no new P1s.

## Persona Red Flags

- Alex: cleared — verdicts name rule + confidence, full provenance. Remaining — no sort/filter, ruleId codes, no own-unit input (M2).
- Sam: cleared — scroll region focusable + arrow-scrollable, zero title-only tooltips, skip-link + sr-only caption + scope="col". Remaining — item cell not th scope="row"; "·" separators read literally.
- Riley: cleared — honest weak chips, thin-data "—", designed empty states. Remaining — only 5 happy-path rows; no negative-margin / UNAVAILABLE / error / large-manifest row exercised.

## Minor Observations

- Console contrast all clears 4.5:1: title 16.45:1, gain 8.79:1, loss 6.88:1, weak/legend ink-2 7.99:1.
- Weak-chip differentiation is fill+dash+desaturation, not lower contrast (weaker != dimmer) — worth a usability glance.
- Demo Mode toggle has no visible effect on this surface (DemoBadge always) — feels inert here.

## Questions to Consider

1. If the buyer is on a phone at an auction preview, why is Profit/day — the number that closes the buy — engineered to scroll off first?
2. With no sort, override, or rule drill-down, is the table letting the user interrogate the verdict or just trust it?
3. "Zero AI" is the honesty flex, but 100% on screen is synthetic — does the persistent DEMO badge build trust or remind the operator nothing here is real yet?
