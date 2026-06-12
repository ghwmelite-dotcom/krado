import { Hono } from "hono";
import { HoldInput, depositFor } from "@krado/shared";
import type { AppEnv } from "../env";
import { availableSlots } from "../lib/availability";
import { createHold } from "../lib/holds";

export const bookingPublic = new Hono<AppEnv>();

interface ArtisanRow {
  id: string;
  handle: string;
  shop_name: string;
  area: string;
  language: "en" | "tw";
  deposit_pct: number;
  deposit_floor: number;
  hours_json: string;
  status: string;
}

async function loadArtisan(env: AppEnv["Bindings"], handle: string): Promise<ArtisanRow | null> {
  return env.DB.prepare(
    `SELECT id, handle, shop_name, area, language, deposit_pct, deposit_floor, hours_json, status
     FROM artisans WHERE handle = ? AND status = 'active'`,
  )
    .bind(handle)
    .first<ArtisanRow>();
}

/** Public shop page data: services with computed deposits. */
bookingPublic.get("/:handle", async (c) => {
  const artisan = await loadArtisan(c.env, c.req.param("handle"));
  if (!artisan) return c.json({ error: "not_found" }, 404);

  const { results: services } = await c.env.DB.prepare(
    "SELECT id, name, price, duration_min, photo_key FROM services WHERE artisan_id = ? AND active = 1 ORDER BY position",
  )
    .bind(artisan.id)
    .all<{ id: string; name: string; price: number; duration_min: number; photo_key: string | null }>();

  return c.json({
    handle: artisan.handle,
    shop_name: artisan.shop_name,
    area: artisan.area,
    language: artisan.language,
    services: services.map((s) => ({
      ...s,
      deposit: depositFor(s.price, artisan.deposit_pct, artisan.deposit_floor),
    })),
  });
});

bookingPublic.get("/:handle/slots", async (c) => {
  const artisan = await loadArtisan(c.env, c.req.param("handle"));
  if (!artisan) return c.json({ error: "not_found" }, 404);

  const date = c.req.query("date");
  const serviceId = c.req.query("service");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date) || !serviceId) {
    return c.json({ error: "invalid_query" }, 400);
  }
  const service = await c.env.DB.prepare(
    "SELECT duration_min FROM services WHERE id = ? AND artisan_id = ? AND active = 1",
  )
    .bind(serviceId, artisan.id)
    .first<{ duration_min: number }>();
  if (!service) return c.json({ error: "service_not_found" }, 404);

  const slots = await availableSlots(c.env, artisan, date, service.duration_min);
  return c.json({ date, slots });
});

bookingPublic.post("/:handle/hold", async (c) => {
  const artisan = await loadArtisan(c.env, c.req.param("handle"));
  if (!artisan) return c.json({ error: "not_found" }, 404);

  const parsed = HoldInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const input = parsed.data;

  const service = await c.env.DB.prepare(
    "SELECT id, name, price, duration_min FROM services WHERE id = ? AND artisan_id = ? AND active = 1",
  )
    .bind(input.service_id, artisan.id)
    .first<{ id: string; name: string; price: number; duration_min: number }>();
  if (!service) return c.json({ error: "service_not_found" }, 404);

  // The slot must be genuinely available right now — closed days, locked
  // bookings, live holds and past times all fail here.
  const open = await availableSlots(c.env, artisan, input.date, service.duration_min);
  if (!open.includes(input.slot)) {
    const closed = open.length === 0;
    return c.json({ error: closed ? "day_unavailable" : "slot_unavailable" }, closed ? 422 : 409);
  }

  const result = await createHold(c.env, {
    artisan_id: artisan.id,
    service_id: service.id,
    service_name: service.name,
    date: input.date,
    slot: input.slot,
    phone: input.phone,
    client_name: input.client_name,
    price: service.price,
    duration_min: service.duration_min,
    deposit: depositFor(service.price, artisan.deposit_pct, artisan.deposit_floor),
  });

  if (!result.ok) {
    return result.reason === "too_many_holds"
      ? c.json({ error: "too_many_holds" }, 429)
      : c.json({ error: "slot_unavailable" }, 409);
  }

  const { hold } = result;
  return c.json(
    { hold_token: hold.token, deposit: hold.deposit, price: hold.price, expires_at: hold.expires_at },
    201,
  );
});
