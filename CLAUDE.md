# CLAUDE.md — Krado

WhatsApp-first, MoMo-native booking + daily-money platform for Ghanaian
artisans (v1 wedge: barbers in Accra). Cloudflare-native monorepo.

## Read first
1. `docs/PRD.md` — what we're building and why (v1 scope is strict)
2. `docs/ARCHITECTURE.md` — stack, data flows, integration contracts
3. `docs/DESIGN_SYSTEM.md` — tokens, components, voice (Twi microcopy rules)

## Stack (non-negotiable for v1)
- **API**: Cloudflare Workers + Hono + TypeScript
- **DB**: D1 (SQLite) — migrations in `apps/api/migrations/`, never edit a
  shipped migration; add a new one
- **Cache/holds**: KV — slot holds are KV keys with 900s TTL (see ARCHITECTURE)
- **Media**: R2 — artisan portfolio photos, WhatsApp media
- **Web**: React 18 + Vite + TypeScript PWA, deployed via Workers static
  assets. Offline-first: app shell + last-known dashboard cached
- **Payments**: Paystack (mobile_money channel: MTN, Telecel, AT) — reuse
  patterns from GGE milestone payment work; always verify via webhook +
  signature check, never trust client-side success
- **Messaging**: WhatsApp Business Cloud API (Meta) — template messages for
  confirmations/reminders/nudges
- **Jobs**: Cron Triggers (reminders, nudge engine, susu sweep) + Queues for
  webhook fan-out

## Monorepo layout
```
krado/
├── apps/
│   ├── api/          # Hono Worker: REST + webhooks + cron
│   └── web/          # React PWA: artisan app + public booking pages
├── packages/
│   ├── shared/       # zod schemas, types, currency utils (pesewas!)
│   └── ui/           # Krado design system components
├── docs/
└── schema.sql        # seed for migration 0001
```

## Hard rules
- **Money is integer pesewas everywhere.** `4000` = GHS 40.00. Format only
  at the edge with `formatGHS()` from `packages/shared`. No floats, ever.
- **Phone numbers are identity.** E.164 (`+233...`), normalized at every
  ingress point. One `normalizePhone()` in shared — no ad-hoc regex.
- **Time**: store UTC ISO in D1; render Africa/Accra. Slot math in minutes
  from midnight local.
- **Idempotency**: Paystack and WhatsApp webhooks must be idempotent — key
  on `(provider, event_id)` in `webhook_events` before processing.
- **State machines, not booleans.** Bookings: `held → locked → completed |
  no_show | cancelled_by_client | cancelled_by_artisan`. Enforce
  transitions in one place (`packages/shared/bookings.ts`).
- **2-minute onboarding is a product invariant.** Any onboarding change
  must keep total required fields ≤ 7 and steps ≤ 3.
- **Every client-facing string ships in English + Twi** (`packages/shared/i18n/`).
  Ewe and Ga are post-v1 but key structure must support them now.
- Secrets via `wrangler secret put` only. Never in code, never in
  `wrangler.toml` vars.

## Commands
```bash
npm run dev          # wrangler dev (api) + vite (web), concurrently
npm run db:migrate   # wrangler d1 migrations apply krado-db --local
npm run db:seed      # seed demo artisan "Kojo's Cuts"
npm run test         # vitest
npm run deploy:staging  # krado.ohwpstudios.org (account: ghwmelite)
```

## Deployment
- Account: ghwmelite (`ea2eb3a9813660dfca2a60e594858538`)
- Staging: `krado.ohwpstudios.org` · Prod: `krado.app` (when registered)
- CI: GitHub Actions per the existing multi-account Wrangler pipeline

## Style
- Conventional commits (`feat:`, `fix:`, `chore:`)
- zod-validate every request body and every webhook payload
- Prefer boring code over clever code; this app must be maintainable
  solo during livestreams (Nnoboa builds)
