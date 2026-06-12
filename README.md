# Krado — booking, payments & daily money for Ghana's artisans

> **Krado** (Twi): *ready, prepared.* "Me krado" — I'm ready.
> Tagline: **"Krado? Lock your slot."**

A WhatsApp-first, MoMo-native booking and daily-money system for Ghanaian
artisans — barbers, hairdressers, seamstresses, makeup artists. Built on the
Cloudflare stack by Hodges & Co. / OHWPStudios.

**v1 in one sentence:** a barber in Madina onboards in under two minutes, gets
a booking link (`krado.app/kojo`), and from then on clients lock slots with a
small MoMo deposit (Paystack prompt or direct MoMo/bank transfer the artisan
confirms) — no-shows die, the day's earnings and susu savings show on one
screen, and quiet WhatsApp nudges bring regulars back on their natural cycle.

## Layout

```
krado/
├── apps/
│   ├── api/          # Hono Worker: REST + webhooks + cron + queue + SSR booking pages
│   └── web/          # React PWA: artisan app (dashboard, bookings, money, styles)
├── packages/
│   ├── shared/       # zod schemas, money (pesewas!), phones (E.164), slot math,
│   │                 # booking state machine, en+tw i18n
│   └── ui/           # Krado design system (kente strip, goal bar, chips…)
└── docs/             # PRD, ARCHITECTURE, DESIGN_SYSTEM, DEPLOYMENT
```

## Quickstart

```bash
npm install
cp apps/api/.dev.vars.example apps/api/.dev.vars
npm run db:migrate && npm run db:seed     # local D1 + demo shop "Kojo's Cuts"
npm run dev                               # API :8787 · PWA :5173 (proxies /api)
```

- Public booking page: http://localhost:8787/kojo
- Artisan app: http://localhost:5173/app (log in with +233244123456 — the OTP
  prints in the wrangler console when WhatsApp creds are unset)

`npm test` runs every workspace (shared domain logic, full API against
miniflare D1/KV, UI components, PWA).

Deploys: push to `main` → GitHub Actions tests, migrates and ships to
`krado.ohwpstudios.org`. See `docs/DEPLOYMENT.md` for one-time setup
(secrets, Paystack + Meta webhooks, template approval).

## Read first

1. `docs/PRD.md` — what we're building and why (v1 scope is strict)
2. `docs/ARCHITECTURE.md` — stack, data flows, integration contracts
3. `docs/DESIGN_SYSTEM.md` — tokens, components, voice (Twi microcopy rules)
