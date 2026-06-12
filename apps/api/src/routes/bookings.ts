import { Hono } from "hono";
import { nanoid } from "nanoid";
import {
  BookingStatusUpdate,
  assertTransition,
  canTransition,
  formatGHS,
  accraDateOf,
  type BookingStatus,
} from "@krado/shared";
import type { AppEnv, Bindings } from "../env";
import { requireSession } from "../middleware/session";
import { refundTransaction, hmacSha512Hex } from "../lib/paystack";
import { enqueueTemplate } from "../lib/messaging";

export const bookings = new Hono<AppEnv>();

interface BookingRow {
  id: string;
  artisan_id: string;
  client_id: string;
  service_name: string;
  price: number;
  deposit: number;
  starts_at: string;
  status: BookingStatus;
}

/** Signed client-cancel links: HMAC of the booking id, no account needed. */
export async function clientCancelSig(signingKey: string, bookingId: string): Promise<string> {
  return (await hmacSha512Hex(signingKey, `client-cancel:${bookingId}`)).slice(0, 32);
}

bookings.get("/", requireSession, async (c) => {
  const date = c.req.query("date") ?? accraDateOf(new Date().toISOString());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return c.json({ error: "invalid_date" }, 400);

  const { results } = await c.env.DB.prepare(
    `SELECT b.id, b.service_name, b.price, b.deposit, b.starts_at, b.status, b.source,
            c.phone AS client_phone, c.name AS client_name
     FROM bookings b JOIN clients c ON c.id = b.client_id
     WHERE b.artisan_id = ? AND b.starts_at >= ? AND b.starts_at < ?
     ORDER BY b.starts_at`,
  )
    .bind(c.var.artisanId, `${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`)
    .all();
  return c.json({ date, bookings: results });
});

bookings.post("/:id/status", requireSession, async (c) => {
  const parsed = BookingStatusUpdate.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const target = parsed.data.status;

  const booking = await c.env.DB.prepare(
    "SELECT id, artisan_id, client_id, service_name, price, deposit, starts_at, status FROM bookings WHERE id = ? AND artisan_id = ?",
  )
    .bind(c.req.param("id"), c.var.artisanId)
    .first<BookingRow>();
  if (!booking) return c.json({ error: "not_found" }, 404);

  // Artisans mark done / no-show / cancel; client cancellations come
  // through the signed client route, never this one.
  if (target === "cancelled_by_client" || target === "locked") {
    return c.json({ error: "illegal_transition" }, 422);
  }
  if (!canTransition(booking.status, target)) return c.json({ error: "illegal_transition" }, 422);

  await applyTransition(c.env, booking, target);
  return c.json({ ok: true, status: target });
});

bookings.post("/:id/client-cancel", async (c) => {
  const booking = await c.env.DB.prepare(
    "SELECT id, artisan_id, client_id, service_name, price, deposit, starts_at, status FROM bookings WHERE id = ?",
  )
    .bind(c.req.param("id"))
    .first<BookingRow>();
  if (!booking) return c.json({ error: "not_found" }, 404);

  const expected = await clientCancelSig(c.env.SESSION_SIGNING_KEY ?? "", booking.id);
  if (c.req.query("sig") !== expected) return c.json({ error: "forbidden" }, 403);

  // PRD: client may cancel ≥ 2h before start; later than that the deposit
  // is committed (that's the whole point of deposit-locked slots).
  const msUntil = new Date(booking.starts_at).getTime() - Date.now();
  if (msUntil < 2 * 3600_000) return c.json({ error: "too_late_to_cancel" }, 422);

  if (!canTransition(booking.status, "cancelled_by_client")) {
    return c.json({ error: "illegal_transition" }, 422);
  }
  await applyTransition(c.env, booking, "cancelled_by_client");
  return c.json({ ok: true });
});

async function applyTransition(env: Bindings, booking: BookingRow, target: BookingStatus): Promise<void> {
  assertTransition(booking.status, target);

  await env.DB.prepare("UPDATE bookings SET status = ?, updated_at = datetime('now') WHERE id = ?")
    .bind(target, booking.id)
    .run();

  if (target === "completed") {
    await tallySusu(env, booking);
  }

  if (target === "cancelled_by_artisan") {
    await refundDeposit(env, booking);
  }
}

async function tallySusu(env: Bindings, booking: BookingRow): Promise<void> {
  const artisan = await env.DB.prepare("SELECT susu_mode, susu_value FROM artisans WHERE id = ?")
    .bind(booking.artisan_id)
    .first<{ susu_mode: "flat" | "pct" | "off"; susu_value: number }>();
  if (!artisan || artisan.susu_mode === "off") return;

  const amount =
    artisan.susu_mode === "flat"
      ? artisan.susu_value
      : Math.round((booking.price * artisan.susu_value) / 100);
  if (amount <= 0) return;

  await env.DB.prepare(
    "INSERT INTO susu_ledger (id, artisan_id, booking_id, amount, day) VALUES (?, ?, ?, ?, ?)",
  )
    .bind(`ssu_${nanoid(12)}`, booking.artisan_id, booking.id, amount, accraDateOf(new Date().toISOString()))
    .run();
}

async function refundDeposit(env: Bindings, booking: BookingRow): Promise<void> {
  const deposit = await env.DB.prepare(
    "SELECT reference FROM payments WHERE booking_id = ? AND kind = 'deposit' AND status = 'success'",
  )
    .bind(booking.id)
    .first<{ reference: string }>();
  if (!deposit) return; // nothing to refund (shouldn't happen for locked bookings)

  await refundTransaction(env, deposit.reference);
  await env.DB.prepare(
    "INSERT INTO payments (id, booking_id, reference, kind, amount, status) VALUES (?, ?, ?, 'refund', ?, 'success')",
  )
    .bind(`pay_${nanoid(12)}`, booking.id, `refund:${deposit.reference}`, booking.deposit)
    .run();

  const [artisan, client] = await Promise.all([
    env.DB.prepare("SELECT shop_name, language FROM artisans WHERE id = ?")
      .bind(booking.artisan_id)
      .first<{ shop_name: string; language: "en" | "tw" }>(),
    env.DB.prepare("SELECT phone FROM clients WHERE id = ?")
      .bind(booking.client_id)
      .first<{ phone: string }>(),
  ]);
  if (!artisan || !client) return;

  await enqueueTemplate(env, {
    template: "wa_refund_notice",
    language: artisan.language,
    recipient: client.phone,
    params: [artisan.shop_name, booking.service_name, formatGHS(booking.deposit)],
    booking_id: booking.id,
  });
}
