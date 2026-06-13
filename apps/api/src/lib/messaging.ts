import { nanoid } from "nanoid";
import type { Bindings } from "../env";

/**
 * Outbound Telegram notification. Telegram can only reach a user who has
 * linked the bot, so this is a no-op (no log row, no enqueue) when chatId is
 * null — the recipient simply isn't reachable yet. When it is, a message_log
 * row records the attempt and the queue consumer flips its status.
 */
export async function notify(
  env: Bindings,
  opts: {
    chatId: string | null | undefined;
    /** message type, stored in message_log.template (e.g. "tg_reminder_2h") */
    type: string;
    text: string;
    booking_id?: string;
  },
): Promise<void> {
  if (!opts.chatId) return;
  const logId = `msg_${nanoid(12)}`;
  await env.DB.prepare(
    "INSERT INTO message_log (id, recipient, template, booking_id) VALUES (?, ?, ?, ?)",
  )
    .bind(logId, opts.chatId, opts.type, opts.booking_id ?? null)
    .run();
  await env.MESSAGES.send({ kind: "telegram", chat_id: opts.chatId, text: opts.text, log_id: logId, booking_id: opts.booking_id });
}
