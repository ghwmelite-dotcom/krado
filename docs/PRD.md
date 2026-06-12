---
name: krado-v1
description: WhatsApp-first, MoMo-native booking and daily-money platform for Ghanaian barbers — deposit-locked slots, daily goal dashboard, susu set-aside, and cycle-based rebooking nudges.
status: backlog
created: 2026-06-12
owner: Ozzy (Hodges & Co. / OHWPStudios)
---

# PRD — Krado v1

## 1. Problem

Ghanaian artisans (barbers, hairdressers, seamstresses) run their businesses
on WhatsApp, phone calls, and memory. The costs:

1. **No-shows** — a barber blocks 4 pm for a client who never comes. Lost
   revenue, zero recourse. This is the single most-cited pain.
2. **Invisible money** — daily cash + MoMo flows are untracked. No daily
   total, no savings discipline, no payment history → no access to credit.
3. **Passive client base** — regulars drift. Nobody reminds Akosua that her
   3-week cycle is due, so she walks into whichever shop is nearest.

Existing booking tools (Booksy, Fresha) assume smartphones-first users,
card payments, email identity, and English-only UX. They are not built for
a GHS 40 haircut economy running on MoMo and WhatsApp.

## 2. Users

- **Primary: the artisan.** v1 wedge = barbers in Accra (high frequency,
  appointment-driven, young smartphone-holding clientele). Entry-level
  Android, data-conscious, allergic to "office work."
- **Secondary: the client.** Books via a link in WhatsApp/Instagram bio.
  Never installs anything, never creates an account. Phone number is
  identity.

## 3. v1 scope — five features, nothing else

### F1. Two-minute artisan onboarding
- Required: name, shop name, area, MoMo number, 2+ services
  (name/price/duration), working days + hours. ≤ 7 fields, ≤ 3 steps.
- Output: live booking page at `krado.app/{handle}` + a ready-to-paste
  WhatsApp status / IG bio message.
- Success bar: a first-time artisan onboards in < 2 minutes with someone
  showing them once.

### F2. Deposit-locked booking (the killer feature)
- Client flow: open link → pick style (photo card with price + duration)
  → pick slot → pay deposit via Paystack MoMo → slot **locked**.
- Slot **hold**: selecting a time holds it for 15 minutes (KV TTL) while
  the MoMo prompt is pending; visible countdown.
- Deposit defaults to 25% (artisan-adjustable, floor GHS 5). Deposit counts
  toward the service price. No-show → artisan keeps it. Artisan cancels →
  auto-refund.
- Booking states: `held → locked → completed | no_show |
  cancelled_by_client | cancelled_by_artisan`.

### F3. WhatsApp messaging layer
- Template messages: booking confirmed (to both parties), 2-hour reminder
  (to client), "running late?" quick-replies, rebook nudge.
- All client-side interaction can complete inside WhatsApp; the web page
  is only needed to pick a slot and pay.

### F4. Daily-money dashboard (artisan home)
- Greeting by time of day in chosen language (Maakye / Maaha / Maadwo).
- **Daily goal bar** — artisan sets a target (e.g. GHS 200); bar fills as
  bookings complete. The retention engine.
- Earnings today, clients this week, **susu set-aside**: a fixed amount or
  % auto-tallied per completed booking into a virtual ledger (v1 is a
  ledger + weekly summary, NOT moving real money — see Non-goals).
- "Up next" timeline with deposit status chips (Locked / Hold 14m).

### F5. Rebooking nudge engine
- Nightly cron computes each client's visit cycle (median gap, min 2
  visits). When `today − last_visit ≥ cycle`, surface a nudge card to the
  artisan: one tap sends a pre-written WhatsApp template with their
  booking link; one tap dismisses ("Later").
- Artisan always approves; v1 never messages clients autonomously.

## 4. Non-goals (v1)

- ❌ Marketplace / discovery / search ("find barbers near me")
- ❌ Reviews and ratings
- ❌ Multi-staff shops, chairs, rosters
- ❌ Moving real susu money (regulatory weight — v1 is a ledger only;
  partner/licensing question for v2)
- ❌ Credit scoring or lending (the payment history we accumulate is the
  v2 asset; v1 just accumulates it cleanly)
- ❌ iOS/Android native apps — PWA only
- ❌ Ewe/Ga translations (i18n keys must support them; English + Twi ship)

## 5. Success metrics (Accra pilot, first 90 days)

| Metric | Target |
|---|---|
| Artisans onboarded and active (≥1 booking/wk) | 25 |
| Median onboarding time | < 2 min |
| No-show rate on deposit-locked bookings | < 5% (baseline ~25–30%) |
| Bookings via rebook nudges | ≥ 15% of all bookings by day 90 |
| Artisan day-7 retention (opens dashboard) | ≥ 60% |
| Deposit payment success rate (MoMo) | ≥ 90% of holds convert |

## 6. Monetization (decided now, charged later)

- v1 pilot: **free**. Win trust first.
- v1.5: **GHS 1 flat per locked booking**, absorbed into the deposit
  (visible as "incl. GHS 1 Krado fee"). Per-transaction, not subscription —
  matches daily-cash mental models. No charge on no-shows the artisan keeps.

## 7. Risks

| Risk | Mitigation |
|---|---|
| MoMo prompt friction kills conversion | 15-min hold + WhatsApp "resend prompt" fallback; track funnel drop-off from day one |
| Artisans distrust deposits ("clients won't pay") | Pilot with 5 hand-held shops; lead with no-show pain; deposit floor low (GHS 5) |
| WhatsApp template approval delays | Submit all templates to Meta in week 1, before they block launch |
| Paystack MoMo edge cases (timeouts, reversals) | Webhook-first truth, idempotent processing, manual reconciliation view in admin |
| Clients game holds (hold slots, never pay) | Max 2 concurrent holds per phone number; holds expire in 15 min |

## 8. Open questions

- Deposit default: 25% vs flat GHS 10 — A/B in pilot.
- Should the susu ledger live on the dashboard or the Money tab? (Mockup
  says dashboard; validate with pilot artisans.)
- Handle format: `krado.app/kojo` first-come vs `krado.app/kojoscuts-madina`.

## 9. Epic seed (for CCPM decomposition)

Suggested work streams when parsing to epic: (1) D1 schema + shared
domain package, (2) Hono API + Paystack integration, (3) WhatsApp layer,
(4) Artisan PWA, (5) Public booking page, (6) Cron engines (reminders,
nudges, susu sweep), (7) Onboarding flow, (8) Pilot admin/recon view.
Streams 1–2 block most others; 3 and 4 parallelize after 1.
