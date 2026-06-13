# Deployment — Krado

Account: ghwmelite (`ea2eb3a9813660dfca2a60e594858538`) · Staging: `krado.ohwpstudios.org`

## Cloudflare resources (already created)

| Resource | Name | ID |
|---|---|---|
| D1 | `krado-db` | `2a333e27-55f7-4ce0-b9bd-87fa78edcdfb` |
| KV | `KRADO_KV` | `26c7e78bb4164e5cb091565a9a508dc1` |
| R2 | `krado-media` | — |
| Queue | `krado-messages` | — |

All wired in `apps/api/wrangler.toml`.

## One-time setup before first deploy

1. **Secrets** (run in `apps/api/`, each prompts for the value):
   ```bash
   wrangler secret put PAYSTACK_SECRET_KEY      # sk_live_… (or sk_test_ for staging)
   wrangler secret put PAYSTACK_WEBHOOK_SECRET  # same value as secret key unless using a dedicated webhook secret
   wrangler secret put TELEGRAM_BOT_TOKEN       # from @BotFather
   wrangler secret put TELEGRAM_WEBHOOK_SECRET  # any random string; passed to setWebhook (step 4)
   wrangler secret put SESSION_SIGNING_KEY      # long random string
   ```
   Auth needs no messaging secret — artisans log in with phone + 4-digit PIN
   (hashed with PBKDF2). The PIN is set during onboarding.
2. **GitHub Actions secret**: repo → Settings → Secrets → Actions →
   `CLOUDFLARE_API_TOKEN` (token with Workers Scripts:Edit, D1:Edit, Workers KV:Edit,
   Workers R2:Edit, Queues:Edit on the ghwmelite account). CI then tests +
   migrates + deploys on every push to `main`.
3. **Paystack dashboard**: set webhook URL to
   `https://krado.ohwpstudios.org/api/webhooks/paystack`.
4. **Telegram bot** (no template approval — free-form messages):
   - Create the bot via [@BotFather](https://t.me/BotFather); set `TELEGRAM_BOT_TOKEN`.
   - Set `TELEGRAM_BOT_USERNAME` (no `@`) in `wrangler.toml [vars]` to the bot's username.
   - Register the webhook (once), passing the secret you set above:
     ```bash
     curl "https://api.telegram.org/bot<TOKEN>/setWebhook" \
       -d "url=https://krado.ohwpstudios.org/api/webhooks/telegram" \
       -d "secret_token=<TELEGRAM_WEBHOOK_SECRET>"
     ```
   - Artisans connect by tapping the deep link shown at the end of onboarding
     (or in Settings); clients opt in via the link shown after they lock a slot.
     Telegram can only message users who have tapped Start on the bot.

## Manual deploy

```bash
npm run build -w apps/web                       # PWA → apps/web/dist
cd apps/api
npx wrangler d1 migrations apply krado-db --remote
npx wrangler deploy                              # → krado.ohwpstudios.org
```

`npm run deploy:staging` from the repo root does the same.

## Local dev

```bash
cp apps/api/.dev.vars.example apps/api/.dev.vars
npm run db:migrate && npm run db:seed
npm run dev      # wrangler dev :8787 (API + SSR) + vite :5173 (PWA, proxies /api)
```

Without Telegram/Paystack secrets locally, Telegram sends are logged to the
console instead of delivered, and the manual-payment flow works end to end.
