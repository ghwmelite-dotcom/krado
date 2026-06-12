import { accraMinutesOf, minutesToLabel } from "@krado/shared";
import type { Bindings } from "../env";
import { enqueueTemplate } from "../lib/messaging";

/**
 * Every 5 minutes: clients with locked bookings starting in 115–125 minutes
 * get one wa_reminder_2h. The message_log check makes re-runs safe.
 */
export async function sendReminders(env: Bindings): Promise<void> {
  const from = new Date(Date.now() + 115 * 60_000).toISOString();
  const to = new Date(Date.now() + 125 * 60_000).toISOString();

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.service_name, b.starts_at, c.phone AS client_phone,
            a.shop_name, a.language
     FROM bookings b
     JOIN clients c ON c.id = b.client_id
     JOIN artisans a ON a.id = b.artisan_id
     WHERE b.status = 'locked' AND b.starts_at >= ? AND b.starts_at < ?
       AND NOT EXISTS (
         SELECT 1 FROM message_log m
         WHERE m.booking_id = b.id AND m.template = 'wa_reminder_2h'
       )`,
  )
    .bind(from, to)
    .all<{
      id: string;
      service_name: string;
      starts_at: string;
      client_phone: string;
      shop_name: string;
      language: "en" | "tw";
    }>();

  for (const b of results) {
    await enqueueTemplate(env, {
      template: "wa_reminder_2h",
      language: b.language,
      recipient: b.client_phone,
      params: [b.service_name, b.shop_name, `${minutesToLabel(accraMinutesOf(b.starts_at))}`],
      booking_id: b.id,
    });
  }
  if (results.length) console.log(`reminders: queued ${results.length}`);
}
