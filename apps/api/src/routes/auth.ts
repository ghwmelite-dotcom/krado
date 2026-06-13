import { Hono } from "hono";
import { LoginInput, t } from "@krado/shared";
import type { AppEnv } from "../env";
import { sessionKey, SESSION_TTL_SECONDS, requireSession } from "../middleware/session";
import { verifyPin } from "../lib/pin";

const MAX_ATTEMPTS = 5;
const ATTEMPT_WINDOW_S = 900; // 15 minutes

export const auth = new Hono<AppEnv>();

auth.post("/login", async (c) => {
  const parsed = LoginInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const { phone, pin } = parsed.data;

  // Rate-limit by phone so a 4-digit PIN can't be brute-forced.
  const failKey = `loginfail:${phone}`;
  const fails = Number((await c.env.KV.get(failKey)) ?? "0");
  if (fails >= MAX_ATTEMPTS) return c.json({ error: "too_many_attempts" }, 429);

  const artisan = await c.env.DB.prepare("SELECT id, pin_hash, pin_salt FROM artisans WHERE phone = ?")
    .bind(phone)
    .first<{ id: string; pin_hash: string | null; pin_salt: string | null }>();

  const ok =
    artisan?.pin_hash && artisan.pin_salt
      ? await verifyPin(pin, artisan.pin_hash, artisan.pin_salt)
      : false;

  if (!ok || !artisan) {
    await c.env.KV.put(failKey, String(fails + 1), { expirationTtl: ATTEMPT_WINDOW_S });
    return c.json({ error: "invalid_credentials", message: t("en", "login_wrong_pin") }, 401);
  }

  await c.env.KV.delete(failKey);
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  await c.env.KV.put(sessionKey(token), artisan.id, { expirationTtl: SESSION_TTL_SECONDS });
  return c.json({ token });
});

export const me = new Hono<AppEnv>();

me.get("/", requireSession, async (c) => {
  const artisan = await c.env.DB.prepare(
    `SELECT id, handle, name, shop_name, area, phone, momo_number, language,
            daily_goal, deposit_pct, deposit_floor, susu_mode, susu_value, hours_json, status,
            accept_manual, bank_details, telegram_chat_id
     FROM artisans WHERE id = ?`,
  )
    .bind(c.var.artisanId)
    .first();
  if (!artisan) return c.json({ error: "unauthorized" }, 401);
  return c.json({ artisan });
});
