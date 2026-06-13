import { Hono } from "hono";
import { canTransition, t } from "@krado/shared";
import type { AppEnv, Bindings } from "../env";
import { sendTelegram } from "../lib/telegram";

export const telegramWebhook = new Hono<AppEnv>();

interface TgUser {
  id: number;
  first_name?: string;
}
interface TgUpdate {
  update_id: number;
  message?: {
    chat: { id: number };
    from?: TgUser;
    text?: string;
  };
  callback_query?: {
    id: string;
    from: TgUser;
    message?: { chat: { id: number } };
    data?: string;
  };
}

interface LinkToken {
  kind: "artisan" | "client";
  artisan_id?: string;
  phone?: string; // client tokens link by phone
}

telegramWebhook.post("/", async (c) => {
  // Telegram echoes the secret we set on setWebhook in this header.
  const secret = c.req.header("x-telegram-bot-api-secret-token");
  if (c.env.TELEGRAM_WEBHOOK_SECRET && secret !== c.env.TELEGRAM_WEBHOOK_SECRET) {
    return c.json({ error: "forbidden" }, 403);
  }

  const update = (await c.req.json().catch(() => ({}))) as TgUpdate;

  // Idempotency by Telegram update_id.
  if (update.update_id != null) {
    try {
      await c.env.DB.prepare("INSERT INTO webhook_events (provider, event_id) VALUES ('telegram', ?)")
        .bind(String(update.update_id))
        .run();
    } catch {
      return c.json({ ok: true, duplicate: true });
    }
  }

  if (update.message?.text) {
    await handleMessage(c.env, update.message.chat.id, update.message.from, update.message.text);
  } else if (update.callback_query) {
    await handleCallback(c.env, update.callback_query);
  }
  return c.json({ ok: true });
});

async function handleMessage(
  env: Bindings,
  chatId: number,
  from: TgUser | undefined,
  text: string,
): Promise<void> {
  const startMatch = text.match(/^\/start(?:\s+(\S+))?/);
  if (!startMatch) return;

  const token = startMatch[1];
  if (!token) {
    await sendTelegram(env, String(chatId), t("en", "tg_start_help", { base: env.APP_BASE_URL }));
    return;
  }

  const raw = await env.KV.get(`tglink:${token}`);
  if (!raw) {
    await sendTelegram(env, String(chatId), t("en", "tg_start_help", { base: env.APP_BASE_URL }));
    return;
  }
  const link = JSON.parse(raw) as LinkToken;

  if (link.kind === "artisan" && link.artisan_id) {
    const artisan = await env.DB.prepare("SELECT name, language FROM artisans WHERE id = ?")
      .bind(link.artisan_id)
      .first<{ name: string; language: "en" | "tw" }>();
    await env.DB.prepare("UPDATE artisans SET telegram_chat_id = ? WHERE id = ?")
      .bind(String(chatId), link.artisan_id)
      .run();
    await env.KV.delete(`tglink:${token}`);
    await sendTelegram(
      env,
      String(chatId),
      t(artisan?.language ?? "en", "tg_artisan_linked", { name: artisan?.name ?? from?.first_name ?? "" }),
    );
    return;
  }

  if (link.kind === "client" && link.phone) {
    // Link by phone — the client row may not exist until their first booking
    // locks, so create a lightweight row if needed.
    let client = await env.DB.prepare("SELECT id FROM clients WHERE phone = ?")
      .bind(link.phone)
      .first<{ id: string }>();
    if (!client) {
      const { nanoid } = await import("nanoid");
      client = { id: `cl_${nanoid(12)}` };
      await env.DB.prepare("INSERT INTO clients (id, phone) VALUES (?, ?)").bind(client.id, link.phone).run();
    }
    await env.DB.prepare("UPDATE clients SET telegram_chat_id = ? WHERE id = ?")
      .bind(String(chatId), client.id)
      .run();

    // Greet, naming the shop they were booking with if we know it.
    const shop = await env.DB.prepare(
      `SELECT a.shop_name FROM bookings b JOIN artisans a ON a.id = b.artisan_id
       WHERE b.client_id = ? ORDER BY b.created_at DESC LIMIT 1`,
    )
      .bind(client.id)
      .first<{ shop_name: string }>();
    await sendTelegram(env, String(chatId), t("en", "tg_client_linked", { shop: shop?.shop_name ?? "your shop" }));
    return;
  }
}

async function handleCallback(env: Bindings, cb: NonNullable<TgUpdate["callback_query"]>): Promise<void> {
  const [action, bookingId] = (cb.data ?? "").split(":");
  if (action !== "cancel" || !bookingId) {
    await answerCallback(env, cb.id);
    return;
  }

  const chatId = cb.message?.chat.id;
  const booking = await env.DB.prepare(
    `SELECT b.id, b.status, b.starts_at FROM bookings b
     JOIN clients c ON c.id = b.client_id
     WHERE b.id = ? AND c.telegram_chat_id = ?`,
  )
    .bind(bookingId, String(chatId))
    .first<{ id: string; status: string; starts_at: string }>();

  if (booking && new Date(booking.starts_at).getTime() - Date.now() >= 2 * 3600_000) {
    if (canTransition(booking.status as never, "cancelled_by_client")) {
      await env.DB.prepare(
        "UPDATE bookings SET status = 'cancelled_by_client', updated_at = datetime('now') WHERE id = ?",
      )
        .bind(booking.id)
        .run();
    }
  }
  await answerCallback(env, cb.id);
}

async function answerCallback(env: Bindings, callbackId: string): Promise<void> {
  if (!env.TELEGRAM_BOT_TOKEN) return;
  await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ callback_query_id: callbackId }),
  }).catch(() => {});
}
