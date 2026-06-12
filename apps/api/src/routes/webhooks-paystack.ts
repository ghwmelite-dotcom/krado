import { Hono } from "hono";
import { nanoid } from "nanoid";
import { formatGHS, minutesToLabel, slotToUtcIso } from "@krado/shared";
import type { AppEnv, Bindings } from "../env";
import { verifySignature, verifyTransaction } from "../lib/paystack";
import { getHoldByToken, deleteHold, type HoldRecord } from "../lib/holds";
import { enqueueTemplate } from "../lib/messaging";

export const paystackWebhook = new Hono<AppEnv>();

interface PaystackEvent {
  event: string;
  data: {
    reference: string;
    amount: number;
    channel?: string;
    metadata?: { hold_token?: string };
  };
}

paystackWebhook.post("/", async (c) => {
  const rawBody = await c.req.text();
  const ok = await verifySignature(
    c.env.PAYSTACK_WEBHOOK_SECRET ?? "",
    rawBody,
    c.req.header("x-paystack-signature"),
  );
  if (!ok) return c.json({ error: "invalid_signature" }, 401);

  const event = JSON.parse(rawBody) as PaystackEvent;
  if (event.event !== "charge.success") return c.json({ ok: true, ignored: event.event });

  // Idempotency gate: (provider, event_id) PK — a conflict means we already
  // processed this delivery, so acknowledge and stop.
  const eventId = `${event.event}:${event.data.reference}`;
  try {
    await c.env.DB.prepare("INSERT INTO webhook_events (provider, event_id) VALUES ('paystack', ?)")
      .bind(eventId)
      .run();
  } catch {
    return c.json({ ok: true, duplicate: true });
  }

  // Never trust the webhook payload's amount — re-verify against the API.
  const verified = await verifyTransaction(c.env, event.data.reference);
  if (verified.status !== "success") return c.json({ ok: true, ignored: "not_success" });

  const holdToken = event.data.metadata?.hold_token;
  const hold = holdToken ? await getHoldByToken(c.env, holdToken) : null;

  if (!hold) {
    await flagRecon(c.env, verified.reference, verified.amount, null, "hold_expired", verified.raw);
    return c.json({ ok: true, recon: "hold_expired" });
  }
  if (verified.amount !== hold.deposit) {
    await flagRecon(c.env, verified.reference, verified.amount, hold, "amount_mismatch", verified.raw);
    return c.json({ ok: true, recon: "amount_mismatch" });
  }

  await lockBooking(c.env, hold, verified.reference, verified.channel, verified.raw);
  return c.json({ ok: true });
});

async function flagRecon(
  env: Bindings,
  reference: string,
  amount: number,
  hold: HoldRecord | null,
  reason: "hold_expired" | "amount_mismatch",
  raw: string,
): Promise<void> {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO payment_recon (id, reference, amount, phone, artisan_id, reason, raw_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(`rec_${nanoid(12)}`, reference, amount, hold?.phone ?? null, hold?.artisan_id ?? null, reason, raw)
    .run();
}

/** The moment the deposit clears: hold → locked booking, in one batch. */
async function lockBooking(
  env: Bindings,
  hold: HoldRecord,
  reference: string,
  channel: string | undefined,
  rawVerify: string,
): Promise<void> {
  // Phone-first client upsert
  let client = await env.DB.prepare("SELECT id FROM clients WHERE phone = ?")
    .bind(hold.phone)
    .first<{ id: string }>();
  if (!client) {
    client = { id: `cl_${nanoid(12)}` };
    await env.DB.prepare("INSERT INTO clients (id, phone, name) VALUES (?, ?, ?)")
      .bind(client.id, hold.phone, hold.client_name ?? null)
      .run();
  } else if (hold.client_name) {
    await env.DB.prepare("UPDATE clients SET name = COALESCE(name, ?) WHERE id = ?")
      .bind(hold.client_name, client.id)
      .run();
  }

  const bookingId = `bk_${nanoid(12)}`;
  const startsAt = slotToUtcIso(hold.date, hold.slot);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'locked')`,
    ).bind(
      bookingId,
      hold.artisan_id,
      client.id,
      hold.service_id,
      hold.service_name,
      hold.price,
      hold.duration_min,
      hold.deposit,
      startsAt,
    ),
    env.DB.prepare(
      `INSERT INTO payments (id, booking_id, reference, kind, amount, channel, status, raw_json)
       VALUES (?, ?, ?, 'deposit', ?, ?, 'success', ?)`,
    ).bind(`pay_${nanoid(12)}`, bookingId, reference, hold.deposit, channel ?? null, rawVerify),
  ]);

  await deleteHold(env, hold);

  const artisan = await env.DB.prepare("SELECT shop_name, phone, language FROM artisans WHERE id = ?")
    .bind(hold.artisan_id)
    .first<{ shop_name: string; phone: string; language: "en" | "tw" }>();
  if (!artisan) return;

  const timeLabel = `${hold.date} ${minutesToLabel(hold.slot)}`;
  const balance = hold.price - hold.deposit;

  await enqueueTemplate(env, {
    template: "wa_booking_confirmed_client",
    language: artisan.language,
    recipient: hold.phone,
    params: [artisan.shop_name, timeLabel, formatGHS(hold.deposit), formatGHS(balance)],
    booking_id: bookingId,
  });
  await enqueueTemplate(env, {
    template: "wa_booking_confirmed_artisan",
    language: artisan.language,
    recipient: artisan.phone,
    params: [hold.client_name ?? hold.phone, hold.service_name, timeLabel, formatGHS(hold.deposit)],
    booking_id: bookingId,
  });
}
