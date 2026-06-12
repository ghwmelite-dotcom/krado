# ARCHITECTURE — Krado v1

## Stack map

```
Client (WhatsApp) ──── Meta WhatsApp Cloud API ──┐
                                                  │ webhooks
Client (browser) ── krado.app/{handle} ──┐        ▼
                                         │   ┌─────────────────────┐
Artisan (PWA) ── krado.app/app ──────────┼──▶│  Worker: apps/api   │
                                         │   │  Hono + TypeScript  │
Paystack ── payment webhooks ────────────┘   └──────────┬──────────┘
                                                        │
                    ┌────────────┬───────────┬──────────┼───────────┐
                    ▼            ▼           ▼          ▼           ▼
                   D1           KV          R2       Queues    Cron Triggers
               (source of   (slot holds, (portfolio (webhook   (reminders,
                truth)       sessions,    photos)    fan-out)   nudges, susu)
                             rate limits)
```

One Worker serves the API, the webhooks, and the static PWA assets
(Workers static assets). Public booking pages are server-rendered by Hono
(fast first paint on cheap Androids); the artisan app is the React PWA.

## Data model (D1) — see schema.sql

Core tables: `artisans`, `services`, `clients`, `bookings`, `payments`,
`susu_ledger`, `nudges`, `webhook_events`, `message_log`.

Key decisions:
- **Money = integer pesewas** in every table and every API payload.
- **Clients are phone-first**: `clients.phone` (E.164) is unique; name is
  optional and back-filled from WhatsApp profile or artisan edits.
- **Bookings carry denormalized price + duration** at time of booking —
  artisans change prices; history must not.
- `webhook_events (provider, event_id)` UNIQUE → idempotency gate.

## Booking state machine

```
held ──pay ok──▶ locked ──completed──▶ completed
  │                │ ├──no-show (artisan marks)──▶ no_show
  │                │ └──client cancels ≥2h before──▶ cancelled_by_client
  │                └──artisan cancels──▶ cancelled_by_artisan (auto-refund)
  └──15 min TTL expiry / pay fail──▶ (hold deleted, slot freed)
```

- **Hold** = KV key `hold:{artisan_id}:{date}:{slot}` → `{phone, service_id,
  exp}`, TTL 900s. D1 row is created only on `locked` (payment confirmed).
  Availability = working hours − locked bookings − live KV holds.
- Max 2 concurrent holds per client phone (KV counter, TTL 900s).

## Paystack (MoMo) flow

1. `POST /api/bookings/hold` → create KV hold, return hold token.
2. `POST /api/bookings/{hold}/pay` → Paystack `transaction/initialize`
   with `channels: ["mobile_money"]`, `amount` in pesewas, metadata
   `{hold_token}`. Client gets the MoMo prompt on their phone.
3. **Webhook is the only truth.** `charge.success` → verify
   `x-paystack-signature` (HMAC-SHA512) → idempotency check → re-verify
   via `GET /transaction/verify/{reference}` → promote hold to `locked`
   booking in D1 → enqueue WhatsApp confirmations.
4. Refunds (artisan cancel): Paystack refund API; booking →
   `cancelled_by_artisan`; client notified via WhatsApp.

Reuse the GGE Paystack patterns: signature middleware, verify-after-webhook,
pesewa-only amounts.

## WhatsApp Cloud API

- Business-initiated messages require **pre-approved templates** — submit
  in week 1: `booking_confirmed_client`, `booking_confirmed_artisan`,
  `reminder_2h`, `rebook_nudge`, `refund_notice` (each in en + tw).
- Inbound webhook handles quick-replies ("Running late", "Cancel") within
  the free 24-hour customer-service window.
- All sends go through `message_log` (template, recipient, status from
  delivery webhooks) — this also feeds pilot analytics.
- Send via Queues consumer (retry with backoff), never inline in request
  handlers.

## Cron triggers

| Schedule | Job |
|---|---|
| `*/5 * * * *` | 2-hour reminders (bookings starting in 115–125 min) |
| `0 20 * * *` | Nudge engine: compute client cycles, insert `nudges` rows for artisan approval |
| `0 21 * * *` | Susu sweep: tally day's completed bookings → `susu_ledger`; weekly summary on Sundays |

## PWA (apps/web)

- React 18 + Vite + TS. Routes: `/app` (dashboard), `/app/bookings`,
  `/app/money`, `/app/styles`, `/app/onboarding`, plus SSR public
  `/{handle}` from the Worker.
- Offline: cache app shell + last dashboard payload (stale-while-
  revalidate). Booking actions require network; queue nudge-dismissals.
- Auth: phone + WhatsApp OTP (send code via template, 6 digits, 10-min
  expiry) → session in KV (30-day rolling). No passwords, ever.
- Target budget: < 150KB JS gzipped on the public booking page. It must
  feel instant on a GHS 800 Android over 3G.

## Environments

| Env | URL | Cloudflare account |
|---|---|---|
| local | wrangler dev + vite | — |
| staging | krado.ohwpstudios.org | ghwmelite |
| prod | krado.app | ghwmelite (move to dedicated account at scale) |

Secrets (per env, via `wrangler secret put`): `PAYSTACK_SECRET_KEY`,
`PAYSTACK_WEBHOOK_SECRET`, `WA_ACCESS_TOKEN`, `WA_PHONE_NUMBER_ID`,
`WA_VERIFY_TOKEN`, `SESSION_SIGNING_KEY`.
