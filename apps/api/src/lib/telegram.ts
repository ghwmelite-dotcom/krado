import type { Bindings, QueueMessage } from "../env";

const TG_BASE = "https://api.telegram.org";

interface SendOptions {
  /** Inline keyboard, e.g. a "Cancel booking" button. */
  reply_markup?: unknown;
}

/**
 * Send one Telegram message. Without a bot token (local dev) it logs and
 * reports success so flows stay testable end to end.
 */
export async function sendTelegram(
  env: Bindings,
  chatId: string,
  text: string,
  opts: SendOptions = {},
): Promise<{ ok: boolean; messageId?: number }> {
  if (!env.TELEGRAM_BOT_TOKEN) {
    console.log("[dev] telegram send", { chatId, text });
    return { ok: true };
  }
  const res = await fetch(`${TG_BASE}/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, ...opts }),
  });
  if (!res.ok) return { ok: false };
  const body = (await res.json()) as { ok: boolean; result?: { message_id: number } };
  return { ok: body.ok, messageId: body.result?.message_id };
}

/** Queue consumer path: deliver and flip the message_log row. */
export async function deliverQueued(msg: QueueMessage, env: Bindings): Promise<void> {
  const result = await sendTelegram(env, msg.chat_id, msg.text);
  if (!msg.log_id) {
    if (!result.ok) throw new Error("telegram send failed");
    return;
  }
  if (result.ok) {
    await env.DB.prepare("UPDATE message_log SET status = 'sent' WHERE id = ?").bind(msg.log_id).run();
  } else {
    await env.DB.prepare("UPDATE message_log SET status = 'failed' WHERE id = ?").bind(msg.log_id).run();
    throw new Error("telegram send failed"); // let the queue retry
  }
}

/** Deep link a user taps to connect the bot: t.me/<bot>?start=<token>. */
export function deepLink(env: Bindings, token: string): string {
  return `https://t.me/${env.TELEGRAM_BOT_USERNAME}?start=${token}`;
}
