export interface Bindings {
  DB: D1Database;
  KV: KVNamespace;
  MEDIA: R2Bucket;
  MESSAGES: Queue<QueueMessage>;
  ASSETS?: Fetcher;
  APP_BASE_URL: string;

  // Secrets — set via `wrangler secret put`, absent in some local/dev modes
  PAYSTACK_SECRET_KEY?: string;
  PAYSTACK_WEBHOOK_SECRET?: string;
  WA_ACCESS_TOKEN?: string;
  WA_PHONE_NUMBER_ID?: string;
  WA_VERIFY_TOKEN?: string;
  SESSION_SIGNING_KEY?: string;
}

/** A queued outbound WhatsApp template send. */
export interface QueueMessage {
  kind: "whatsapp_template";
  template: string;
  language: "en" | "tw";
  recipient: string; // E.164
  /** Positional template params ({{1}}, {{2}}, …) */
  params: string[];
  booking_id?: string;
  /** message_log row created at enqueue time; consumer updates it */
  log_id?: string;
}

export type AppEnv = { Bindings: Bindings; Variables: { artisanId?: string } };
