import { Hono } from "hono";
import { nanoid } from "nanoid";
import { OnboardInput, t } from "@krado/shared";
import type { AppEnv } from "../env";
import { sessionKey, SESSION_TTL_SECONDS } from "../middleware/session";

export const onboard = new Hono<AppEnv>();

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/['’]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 30) || "shop"
  );
}

onboard.post("/", async (c) => {
  const parsed = OnboardInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) {
    return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  }
  const input = parsed.data;

  const existing = await c.env.DB.prepare("SELECT id FROM artisans WHERE phone = ?")
    .bind(input.phone)
    .first();
  if (existing) return c.json({ error: "phone_in_use" }, 409);

  // First-come handles: base slug, then -2, -3, …
  const base = slugify(input.shop_name);
  const taken = await c.env.DB.prepare("SELECT handle FROM artisans WHERE handle = ? OR handle LIKE ?")
    .bind(base, `${base}-%`)
    .all<{ handle: string }>();
  const takenSet = new Set(taken.results.map((r) => r.handle));
  let handle = base;
  for (let n = 2; takenSet.has(handle); n++) handle = `${base}-${n}`;

  const artisanId = `art_${nanoid(12)}`;
  const language = input.language ?? "en";

  const stmts = [
    c.env.DB.prepare(
      `INSERT INTO artisans (id, handle, name, shop_name, area, phone, momo_number, language, hours_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      artisanId,
      handle,
      input.name,
      input.shop_name,
      input.area,
      input.phone,
      input.momo_number,
      language,
      JSON.stringify(input.hours),
    ),
    ...input.services.map((s, i) =>
      c.env.DB.prepare(
        "INSERT INTO services (id, artisan_id, name, price, duration_min, position) VALUES (?, ?, ?, ?, ?, ?)",
      ).bind(`svc_${nanoid(12)}`, artisanId, s.name, s.price, s.duration_min, i),
    ),
  ];
  await c.env.DB.batch(stmts);

  // Onboarding ends logged in — no second hoop on a 2-minute flow.
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  await c.env.KV.put(sessionKey(token), artisanId, { expirationTtl: SESSION_TTL_SECONDS });

  const link = `${c.env.APP_BASE_URL}/${handle}`;
  return c.json(
    {
      handle,
      link,
      token,
      share_message: t(language, "onboard_share_message", { shop: input.shop_name, link }),
    },
    201,
  );
});
