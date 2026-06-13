import { applyD1Migrations, env } from "cloudflare:test";

declare module "cloudflare:test" {
  interface ProvidedEnv {
    DB: D1Database;
    KV: KVNamespace;
    MEDIA: R2Bucket;
    TEST_MIGRATIONS: D1Migration[];
    PAYSTACK_SECRET_KEY: string;
    PAYSTACK_WEBHOOK_SECRET: string;
    SESSION_SIGNING_KEY: string;
    TELEGRAM_BOT_USERNAME: string;
    TELEGRAM_BOT_TOKEN?: string;
    TELEGRAM_WEBHOOK_SECRET?: string;
    MESSAGES: Queue;
  }
}

await applyD1Migrations(env.DB, env.TEST_MIGRATIONS);
