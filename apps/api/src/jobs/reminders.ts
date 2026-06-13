import { accraMinutesOf, minutesToLabel, t } from "@krado/shared";
import type { Bindings } from "../env";
import { notify } from "../lib/messaging";

/**
 * Every 5 minutes: clients with locked bookings starting in 115–125 minutes
 * who have linked Telegram get one reminder. The message_log check makes
 * re-runs safe; clients without Telegram are simply skipped.
 */
export async function sendReminders(env: Bindings): Promise<void> {
  const from = new Date(Date.now() + 115 * 60_000).toISOString();
  const to = new Date(Date.now() + 125 * 60_000).toISOString();

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.service_name, b.starts_at, c.telegram_chat_id AS chat_id,
            a.shop_name, a.language
     FROM bookings b
     JOIN clients c ON c.id = b.client_id
     JOIN artisans a ON a.id = b.artisan_id
     WHERE b.status = 'locked' AND b.starts_at >= ? AND b.starts_at < ?
       AND c.telegram_chat_id IS NOT NULL
       AND NOT EXISTS (
         SELECT 1 FROM message_log m
         WHERE m.booking_id = b.id AND m.template = 'tg_reminder_2h'
       )`,
  )
    .bind(from, to)
    .all<{
      id: string;
      service_name: string;
      starts_at: string;
      chat_id: string;
      shop_name: string;
      language: "en" | "tw";
    }>();

  for (const b of results) {
    await notify(env, {
      chatId: b.chat_id,
      type: "tg_reminder_2h",
      text: t(b.language, "tg_reminder_2h", {
        service: b.service_name,
        shop: b.shop_name,
        time: minutesToLabel(accraMinutesOf(b.starts_at)),
      }),
      booking_id: b.id,
    });
  }
  if (results.length) console.log(`reminders: queued ${results.length}`);
}
