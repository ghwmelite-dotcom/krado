import { Hono } from "hono";
import { canTransition } from "@krado/shared";
import type { AppEnv, Bindings } from "../env";

export const whatsappWebhook = new Hono<AppEnv>();

/** Meta webhook verification handshake. */
whatsappWebhook.get("/", (c) => {
  const mode = c.req.query("hub.mode");
  const token = c.req.query("hub.verify_token");
  const challenge = c.req.query("hub.challenge");
  if (mode === "subscribe" && token && token === c.env.WA_VERIFY_TOKEN) {
    return c.text(challenge ?? "");
  }
  return c.text("forbidden", 403);
});

interface WaStatus {
  id: string;
  status: string; // sent | delivered | read | failed
}

interface WaMessage {
  id: string;
  from: string; // digits, no +
  type: string;
  button?: { payload?: string; text?: string };
}

interface WaWebhook {
  entry?: Array<{
    changes?: Array<{
      value?: { messages?: WaMessage[]; statuses?: WaStatus[] };
    }>;
  }>;
}

whatsappWebhook.post("/", async (c) => {
  const payload = (await c.req.json().catch(() => ({}))) as WaWebhook;

  for (const entry of payload.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value ?? {};
      for (const status of value.statuses ?? []) {
        await handleStatus(c.env, status);
      }
      for (const message of value.messages ?? []) {
        await handleMessage(c.env, message);
      }
    }
  }
  // Always 200 — Meta retries non-200s and we never want a poison loop.
  return c.json({ ok: true });
});

async function seen(env: Bindings, eventId: string): Promise<boolean> {
  try {
    await env.DB.prepare("INSERT INTO webhook_events (provider, event_id) VALUES ('whatsapp', ?)")
      .bind(eventId)
      .run();
    return false;
  } catch {
    return true;
  }
}

async function handleStatus(env: Bindings, status: WaStatus): Promise<void> {
  if (await seen(env, `status:${status.id}:${status.status}`)) return;
  if (!["sent", "delivered", "read", "failed"].includes(status.status)) return;
  await env.DB.prepare("UPDATE message_log SET status = ? WHERE wa_message_id = ?")
    .bind(status.status, status.id)
    .run();
}

async function handleMessage(env: Bindings, message: WaMessage): Promise<void> {
  if (await seen(env, `msg:${message.id}`)) return;

  const payload = message.button?.payload ?? "";
  const [action, bookingId] = payload.split(":");
  if (!bookingId) return;

  const phone = `+${message.from}`;

  if (action === "CANCEL") {
    const booking = await env.DB.prepare(
      `SELECT b.id, b.status, b.starts_at FROM bookings b
       JOIN clients c ON c.id = b.client_id
       WHERE b.id = ? AND c.phone = ?`,
    )
      .bind(bookingId, phone)
      .first<{ id: string; status: string; starts_at: string }>();
    if (!booking) return;

    // Same rule as the web cancel: ≥2h before start, else the deposit is committed.
    const msUntil = new Date(booking.starts_at).getTime() - Date.now();
    if (msUntil < 2 * 3600_000) return;
    if (!canTransition(booking.status as never, "cancelled_by_client")) return;

    await env.DB.prepare(
      "UPDATE bookings SET status = 'cancelled_by_client', updated_at = datetime('now') WHERE id = ?",
    )
      .bind(booking.id)
      .run();
  }

  if (action === "LATE") {
    // "Running late" — recorded against the booking so the dashboard
    // timeline can surface it; no autonomous outbound in v1.
    await env.DB.prepare(
      "INSERT INTO message_log (id, recipient, template, booking_id, status) VALUES (?, ?, 'inbound_running_late', ?, 'delivered')",
    )
      .bind(`msg_in_${message.id.slice(-12)}`, phone, bookingId)
      .run();
  }
}
