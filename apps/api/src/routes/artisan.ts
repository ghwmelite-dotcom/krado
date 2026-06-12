import { Hono } from "hono";
import { nanoid } from "nanoid";
import { ArtisanPatch, ServiceInput } from "@krado/shared";
import type { AppEnv } from "../env";
import { requireSession } from "../middleware/session";

export const artisan = new Hono<AppEnv>();

artisan.use("*", requireSession);

artisan.patch("/", async (c) => {
  const parsed = ArtisanPatch.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const patch = parsed.data;
  if (Object.keys(patch).length === 0) return c.json({ error: "empty_patch" }, 400);

  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const [key, value] of Object.entries(patch)) {
    if (key === "hours") {
      sets.push("hours_json = ?");
      binds.push(JSON.stringify(value));
    } else {
      sets.push(`${key} = ?`);
      binds.push(value);
    }
  }
  binds.push(c.var.artisanId);
  await c.env.DB.prepare(`UPDATE artisans SET ${sets.join(", ")} WHERE id = ?`).bind(...binds).run();
  return c.json({ ok: true });
});

artisan.get("/services", async (c) => {
  const { results } = await c.env.DB.prepare(
    "SELECT id, name, price, duration_min, photo_key, position, active FROM services WHERE artisan_id = ? ORDER BY position",
  )
    .bind(c.var.artisanId)
    .all();
  return c.json({ services: results });
});

artisan.post("/services", async (c) => {
  const parsed = ServiceInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input", issues: parsed.error.issues }, 400);
  const id = `svc_${nanoid(12)}`;
  const max = await c.env.DB.prepare("SELECT COALESCE(MAX(position), -1) AS p FROM services WHERE artisan_id = ?")
    .bind(c.var.artisanId)
    .first<{ p: number }>();
  await c.env.DB.prepare(
    "INSERT INTO services (id, artisan_id, name, price, duration_min, position) VALUES (?, ?, ?, ?, ?, ?)",
  )
    .bind(id, c.var.artisanId, parsed.data.name, parsed.data.price, parsed.data.duration_min, (max?.p ?? -1) + 1)
    .run();
  return c.json({ id }, 201);
});

artisan.patch("/services/:id", async (c) => {
  const body = await c.req.json().catch(() => null);
  const update = ServiceInput.partial().safeParse(body);
  if (!update.success || Object.keys(update.data).length === 0) {
    return c.json({ error: "invalid_input" }, 400);
  }
  const sets: string[] = [];
  const binds: unknown[] = [];
  for (const [key, value] of Object.entries(update.data)) {
    sets.push(`${key} = ?`);
    binds.push(value);
  }
  binds.push(c.req.param("id"), c.var.artisanId);
  const res = await c.env.DB.prepare(
    `UPDATE services SET ${sets.join(", ")} WHERE id = ? AND artisan_id = ?`,
  )
    .bind(...binds)
    .run();
  if (res.meta.changes === 0) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

artisan.delete("/services/:id", async (c) => {
  // Soft-delete: bookings reference services; history must survive.
  const res = await c.env.DB.prepare(
    "UPDATE services SET active = 0 WHERE id = ? AND artisan_id = ?",
  )
    .bind(c.req.param("id"), c.var.artisanId)
    .run();
  if (res.meta.changes === 0) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

/** Portfolio photo upload → R2. Body is the raw image; key returned for the service. */
artisan.put("/services/:id/photo", async (c) => {
  const serviceId = c.req.param("id");
  const owned = await c.env.DB.prepare("SELECT id FROM services WHERE id = ? AND artisan_id = ?")
    .bind(serviceId, c.var.artisanId)
    .first();
  if (!owned) return c.json({ error: "not_found" }, 404);

  const contentType = c.req.header("content-type") ?? "";
  if (!/^image\/(jpeg|png|webp)$/.test(contentType)) {
    return c.json({ error: "unsupported_media_type" }, 415);
  }
  const body = await c.req.arrayBuffer();
  if (body.byteLength > 2 * 1024 * 1024) return c.json({ error: "too_large" }, 413);

  const key = `portfolio/${c.var.artisanId}/${serviceId}-${nanoid(8)}`;
  await c.env.MEDIA.put(key, body, { httpMetadata: { contentType } });
  await c.env.DB.prepare("UPDATE services SET photo_key = ? WHERE id = ?").bind(key, serviceId).run();
  return c.json({ photo_key: key });
});
