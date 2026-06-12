import { accraDateOf, formatGHS } from "@krado/shared";
import { nanoid } from "nanoid";
import type { Bindings } from "../env";
import { enqueueTemplate } from "../lib/messaging";

/**
 * Nightly (21:00 UTC) backstop: any completed booking from today that is
 * missing its susu_ledger row gets tallied (covers crashes between the
 * status update and the inline tally). Sundays also send the weekly summary.
 */
export async function susuSweep(env: Bindings): Promise<void> {
  const today = accraDateOf(new Date().toISOString());

  const { results } = await env.DB.prepare(
    `SELECT b.id, b.artisan_id, b.price, a.susu_mode, a.susu_value
     FROM bookings b JOIN artisans a ON a.id = b.artisan_id
     WHERE b.status = 'completed' AND a.susu_mode != 'off'
       AND b.starts_at >= ? AND b.starts_at < ?
       AND NOT EXISTS (SELECT 1 FROM susu_ledger s WHERE s.booking_id = b.id)`,
  )
    .bind(`${today}T00:00:00.000Z`, `${today}T23:59:59.999Z`)
    .all<{ id: string; artisan_id: string; price: number; susu_mode: "flat" | "pct"; susu_value: number }>();

  for (const b of results) {
    const amount = b.susu_mode === "flat" ? b.susu_value : Math.round((b.price * b.susu_value) / 100);
    if (amount <= 0) continue;
    await env.DB.prepare(
      "INSERT INTO susu_ledger (id, artisan_id, booking_id, amount, day) VALUES (?, ?, ?, ?, ?)",
    )
      .bind(`ssu_${nanoid(12)}`, b.artisan_id, b.id, amount, today)
      .run();
  }

  // Weekly summary on Sundays (Accra = UTC)
  if (new Date().getUTCDay() === 0) {
    await sendWeeklySummaries(env, today);
  }
}

async function sendWeeklySummaries(env: Bindings, today: string): Promise<void> {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString().slice(0, 10);
  const { results } = await env.DB.prepare(
    `SELECT s.artisan_id, SUM(s.amount) AS total, COUNT(*) AS n, a.phone, a.language
     FROM susu_ledger s JOIN artisans a ON a.id = s.artisan_id
     WHERE s.day > ? AND s.day <= ?
     GROUP BY s.artisan_id`,
  )
    .bind(weekAgo, today)
    .all<{ artisan_id: string; total: number; n: number; phone: string; language: "en" | "tw" }>();

  for (const r of results) {
    await enqueueTemplate(env, {
      template: "wa_weekly_susu",
      language: r.language,
      recipient: r.phone,
      params: [formatGHS(r.total), String(r.n)],
    });
  }
}
