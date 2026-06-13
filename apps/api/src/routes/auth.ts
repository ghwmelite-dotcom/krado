import { Hono } from "hono";
import { OtpRequest, OtpVerify, t } from "@krado/shared";
import type { AppEnv } from "../env";
import { sessionKey, SESSION_TTL_SECONDS, requireSession } from "../middleware/session";

const OTP_TTL_S = 600; // 10 minutes

export const auth = new Hono<AppEnv>();

auth.post("/otp", async (c) => {
  const parsed = OtpRequest.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_phone" }, 400);
  const { phone } = parsed.data;

  // Only known artisans get codes — but always answer 200 so the endpoint
  // can't be used to enumerate who is on Krado.
  const artisan = await c.env.DB.prepare("SELECT id, language FROM artisans WHERE phone = ?")
    .bind(phone)
    .first<{ id: string; language: "en" | "tw" }>();

  if (artisan) {
    const code = String(Math.floor(100000 + Math.random() * 900000));
    await c.env.KV.put(`otp:${phone}`, code, { expirationTtl: OTP_TTL_S });
    await c.env.MESSAGES.send({
      kind: "whatsapp_template",
      template: "wa_otp",
      language: artisan.language ?? "en",
      recipient: phone,
      params: [code],
    });
  }
  return c.json({ ok: true });
});

auth.post("/verify", async (c) => {
  const parsed = OtpVerify.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const { phone, code } = parsed.data;

  const stored = await c.env.KV.get(`otp:${phone}`);
  if (!stored || stored !== code) return c.json({ error: "invalid_code", message: t("en", "login_invalid_code") }, 401);

  const artisan = await c.env.DB.prepare("SELECT id FROM artisans WHERE phone = ?")
    .bind(phone)
    .first<{ id: string }>();
  if (!artisan) return c.json({ error: "invalid_code" }, 401);

  await c.env.KV.delete(`otp:${phone}`); // single-use

  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  await c.env.KV.put(sessionKey(token), artisan.id, { expirationTtl: SESSION_TTL_SECONDS });
  return c.json({ token });
});

export const me = new Hono<AppEnv>();

me.get("/", requireSession, async (c) => {
  const artisan = await c.env.DB.prepare(
    `SELECT id, handle, name, shop_name, area, phone, momo_number, language,
            daily_goal, deposit_pct, deposit_floor, susu_mode, susu_value, hours_json, status,
            accept_manual, bank_details
     FROM artisans WHERE id = ?`,
  )
    .bind(c.var.artisanId)
    .first();
  if (!artisan) return c.json({ error: "unauthorized" }, 401);
  return c.json({ artisan });
});
