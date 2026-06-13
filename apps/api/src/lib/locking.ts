import { nanoid } from "nanoid";
import { formatGHS, minutesToLabel, slotToUtcIso, splitDeposit, t } from "@krado/shared";
import type { Bindings } from "../env";
import { deleteHold, type HoldRecord } from "./holds";
import { notify } from "./messaging";

export interface PaymentInfo {
  provider: "paystack" | "manual";
  reference: string;
  channel: string | null; // 'mtn' | 'telecel' | 'at' | 'momo' | 'bank' | mobile_money
  raw_json?: string;
}

/**
 * The moment a deposit is confirmed — by Paystack webhook or by the artisan
 * confirming a manual transfer — the hold becomes a locked booking, the
 * payment is recorded, and both parties get WhatsApp confirmations.
 */
export async function lockBooking(env: Bindings, hold: HoldRecord, payment: PaymentInfo): Promise<string> {
  // Phone-first client upsert
  let client = await env.DB.prepare("SELECT id, telegram_chat_id FROM clients WHERE phone = ?")
    .bind(hold.phone)
    .first<{ id: string; telegram_chat_id: string | null }>();
  if (!client) {
    client = { id: `cl_${nanoid(12)}`, telegram_chat_id: null };
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

  // Phase-1 fee, absorbed into the deposit (0 when KRADO_FEE_PESEWAS unset).
  // Recorded per booking; settlement (and the no-show waiver) comes with payouts.
  const { krado_fee } = splitDeposit(hold.deposit, Number(env.KRADO_FEE_PESEWAS ?? "0") || 0);

  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, krado_fee, starts_at, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'locked')`,
    ).bind(
      bookingId,
      hold.artisan_id,
      client.id,
      hold.service_id,
      hold.service_name,
      hold.price,
      hold.duration_min,
      hold.deposit,
      krado_fee,
      startsAt,
    ),
    env.DB.prepare(
      `INSERT INTO payments (id, booking_id, provider, reference, kind, amount, channel, status, raw_json)
       VALUES (?, ?, ?, ?, 'deposit', ?, ?, 'success', ?)`,
    ).bind(
      `pay_${nanoid(12)}`,
      bookingId,
      payment.provider,
      payment.reference,
      hold.deposit,
      payment.channel,
      payment.raw_json ?? null,
    ),
  ]);

  await deleteHold(env, hold);
  const { bumpCounter } = await import("./metrics");
  await bumpCounter(env, "holds_locked"); // funnel numerator

  const artisan = await env.DB.prepare(
    "SELECT shop_name, language, telegram_chat_id FROM artisans WHERE id = ?",
  )
    .bind(hold.artisan_id)
    .first<{ shop_name: string; language: "en" | "tw"; telegram_chat_id: string | null }>();
  if (!artisan) return bookingId;

  const timeLabel = `${hold.date} ${minutesToLabel(hold.slot)}`;
  const balance = hold.price - hold.deposit;

  // Client gets a confirmation only if they've linked Telegram (opt-in);
  // they always saw the on-screen confirmation on the booking page.
  await notify(env, {
    chatId: client.telegram_chat_id,
    type: "tg_booking_confirmed_client",
    text: t(artisan.language, "tg_booking_confirmed_client", {
      shop: artisan.shop_name,
      time: timeLabel,
      deposit: formatGHS(hold.deposit),
      balance: formatGHS(balance),
    }),
    booking_id: bookingId,
  });
  // "incl. GHS 1 Krado fee" only appears once the fee is switched on.
  const depositText =
    krado_fee > 0
      ? `${formatGHS(hold.deposit)} (${t(artisan.language, "fee_note", { fee: formatGHS(krado_fee) })})`
      : formatGHS(hold.deposit);
  await notify(env, {
    chatId: artisan.telegram_chat_id,
    type: "tg_booking_confirmed_artisan",
    text: t(artisan.language, "tg_booking_confirmed_artisan", {
      client: hold.client_name ?? hold.phone,
      service: hold.service_name,
      time: timeLabel,
      deposit: depositText,
    }),
    booking_id: bookingId,
  });
  return bookingId;
}

/** Is this hold's slot still lockable (no booking landed on it meanwhile)? */
export async function slotStillFree(env: Bindings, hold: HoldRecord): Promise<boolean> {
  const start = hold.slot;
  const end = hold.slot + hold.duration_min;
  const clash = await env.DB.prepare(
    `SELECT b.id, b.starts_at, b.duration_min FROM bookings b
     WHERE b.artisan_id = ? AND b.status = 'locked' AND b.starts_at >= ? AND b.starts_at < ?`,
  )
    .bind(hold.artisan_id, `${hold.date}T00:00:00.000Z`, `${hold.date}T23:59:59.999Z`)
    .all<{ starts_at: string; duration_min: number }>();
  return !clash.results.some((b) => {
    const bStart = new Date(b.starts_at).getUTCHours() * 60 + new Date(b.starts_at).getUTCMinutes();
    return start < bStart + b.duration_min && end > bStart;
  });
}
