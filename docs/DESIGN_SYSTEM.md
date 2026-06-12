# DESIGN SYSTEM — Krado

The visual language from the approved mockups, codified. Lives in
`packages/ui` as tokens + components.

## Brand idea

**Flat, warm, woven.** Krado looks Ghanaian through geometry and color —
the kente strip, sunlit ramps — never through clip-art or costume. Every
screen should feel lighter than the artisan's notebook, not heavier.

## The kente strip (brand signature)

A flat horizontal band of colored blocks at the top of every primary
surface (app header, booking page, receipts, OG images).

- Height: 5px (app), 8px (marketing)
- Block pattern (flex ratios): `2:1:2:1:2:1:2`
- Colors in order: gold `#BA7517` · black `#2C2C2A` · green `#3B6D11` ·
  red `#A32D2D` · gold · black · green
- Never gradient it, never animate it, never put text on it.

```tsx
<KenteStrip />  // packages/ui — the first component to build
```

## Color tokens

| Token | Hex | Use |
|---|---|---|
| `gold.100 / 200 / 600 / 800 / 900` | #FAC775 / #EF9F27 / #854F0B / #633806 / #412402 | Primary CTA (MoMo button bg = gold.200, text = gold.900), highlights |
| `forest.50 / 100 / 600 / 900` | #E1F5EE / #9FE1CB / #0F6E56 / #04342C | Money, success, goal bar, "Locked" chips, selected slots (bg forest.900 / text forest.100) |
| `clay.50 / 600 / 800` | #FAECE7 / #993C1D / #712B13 | Warnings-with-warmth, no-show states |
| `violet.50 / 600 / 800` | #EEEDFE / #534AB7 / #3C3489 | Smart features only: nudges, insights — "the app noticed something" |
| `ink / paper / mist` | #2C2C2A / #FFFFFF / #F1EFE8 | Text / surfaces / page bg |

Rules: text on a colored fill always uses the darkest stop of the same
family. Violet is reserved for intelligence — if a violet card appears,
Krado is making a suggestion. Semantic red only for destructive actions.

## Typography

- UI: **DM Sans** (400 / 500 only — never 600+). Numerals: tabular.
- Display/marketing: **Fraunces** (matches the OHWP family feel).
- Body 16px / labels 12–13px / money-hero 26px·500. Floor: 11px.
- Sentence case everywhere. No ALL CAPS, no Title Case.

## Components (build order in packages/ui)

1. `KenteStrip`
2. `GoalBar` — label + % + GHS x of y + 6px track (forest.100 track,
   forest.900 fill). Animates width on data change only, 300ms ease-out.
3. `StatusChip` — pill, 11px·500: Locked (forest.50/900) · Hold {m}m
   (gold.100/900, live countdown) · No-show (clay.50/800)
4. `TimelineItem` — dot + connector + avatar initials + name·time +
   service·price + StatusChip. Filled dot = locked, outlined gold = held.
5. `NudgeCard` — violet.50 bg, insight line, primary action + always a
   "Later" dismiss. Never more than one nudge visible at a time.
6. `StyleCard` — photo (R2), name, duration · price; selected = 2px info
   border + check badge. Photos are the artisan's real work — the
   portfolio IS the storefront.
7. `SlotPill` — default outline; selected = forest.900 bg / forest.100 text.
8. `MoMoButton` — full-width, gold.200 bg / gold.900 text, lock icon,
   radius-lg. The single most-pressed element in the product.
9. `Stepper` — 1·Style 2·Time 3·Lock; done = forest.50 fill, current =
   forest outline.
10. `SusuTile`, `MetricTile`, `BottomNav` (Home · Bookings · Money · Styles,
    19px icons + 10px labels)

## Voice & microcopy

- **Greeting by clock + language**: Maakye (–11:59) · Maaha (–17:59) ·
  Maadwo. Language pill in header, one tap to switch (en ⇄ tw in v1).
- **Plain, warm, zero legalese.** The deposit explained in two lines:
  "Deposit counts toward your cut." / "No-show? {artisan} keeps it." /
  "Refunded if {artisan} cancels."
- Trust microcopy sits at the moment of hesitation — directly under the
  pay button, 11px, shield icon.
- Numbers carry the emotion; words stay calm. Let "GHS 145 of 200" do the
  talking — never "Amazing job!! 🎉". No emoji in UI.
- Twi strings reviewed by a native speaker before every release —
  machine-translated Twi is a brand killer.

## Accessibility & performance

- Touch targets ≥ 44px; contrast AA on every chip (the dark-stop-on-
  light-fill rule guarantees this).
- Public booking page: < 150KB JS gzipped, SSR first paint, works on
  Android Go + 3G. Test on a real entry-level device before pilot.
- Dark mode: v1.1 — tokens are structured for it, don't ship it yet.
