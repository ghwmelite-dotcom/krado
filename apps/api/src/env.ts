export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  MEDIA: R2Bucket;
  MESSAGES: Queue<QueueMessage>;
  ASSETS?: Fetcher;
  APP_BASE_URL: string;
  TELEGRAM_BOT_USERNAME: string; // for building t.me deep links (no @)
  /** Krado per-booking fee in pesewas, absorbed into the deposit. "0" = off. */
  KRADO_FEE_PESEWAS?: string;

  // Secrets — set via `wrangler secret put`, absent in some local/dev modes
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_WEBHOOK_SECRET?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_WEBHOOK_SECRET?: string;
  SESSION_SIGNING_KEY?: string;
  ADMIN_PASSCODE?: string;
}

/** A queued outbound Telegram message — text is fully rendered at enqueue time. */
export interface QueueMessage {
  kind: "telegram";
  chat_id: string;
  text: string;
  booking_id?: string;
  /** message_log row created at enqueue time; consumer updates its status */
  log_id?: string;
}

export type AppEnv = { Bindings: Bindings; Variables: { artisanId?: string } };
