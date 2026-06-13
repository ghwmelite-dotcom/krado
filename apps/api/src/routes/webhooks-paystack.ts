import { Hono } from "hono";
import { nanoid } from "nanoid";
import type { AppEnv, Bindings } from "../env";
import { verifySignature, verifyTransaction } from "../lib/paystack";
import { getHoldByToken, type HoldRecord } from "../lib/holds";
import { lockBooking } from "../lib/locking";
import { markPayoutPaid, markPayoutFailed } from "../lib/settlement";

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
  const handled = ["charge.success", "transfer.success", "transfer.failed", "transfer.reversed"];
  if (!handled.includes(event.event)) return c.json({ ok: true, ignored: event.event });

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

  // Outbound payout (transfer) status — settle or release the payout.
  if (event.event.startsWith("transfer.")) {
    const payout = await c.env.DB.prepare("SELECT id FROM payouts WHERE reference = ?")
      .bind(event.data.reference)
      .first<{ id: string }>();
    if (payout) {
      if (event.event === "transfer.success") await markPayoutPaid(c.env, payout.id);
      else await markPayoutFailed(c.env, payout.id, event.event);
    }
    return c.json({ ok: true });
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

  await lockBooking(c.env, hold, {
    provider: "paystack",
    reference: verified.reference,
    channel: verified.channel ?? null,
    raw_json: verified.raw,
  });
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

