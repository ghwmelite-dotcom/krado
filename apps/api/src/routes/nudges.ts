import { Hono } from "hono";
import { NudgeAction } from "@krado/shared";
import type { AppEnv } from "../env";
import { requireSession } from "../middleware/session";
import { enqueueTemplate } from "../lib/messaging";

export const nudges = new Hono<AppEnv>();

nudges.use("*", requireSession);

nudges.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT n.id, n.cycle_days, n.due_since, c.name AS client_name, c.phone AS client_phone,
            (SELECT MAX(starts_at) FROM bookings b WHERE b.client_id = n.client_id AND b.artisan_id = n.artisan_id AND b.status = 'completed') AS last_visit
     FROM nudges n JOIN clients c ON c.id = n.client_id
     WHERE n.artisan_id = ? AND n.status = 'pending'
     ORDER BY n.created_at`,
  )
    .bind(c.var.artisanId)
    .all();
  return c.json({ nudges: results });
});

nudges.post("/:id/action", async (c) => {
  const parsed = NudgeAction.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const nudge = await c.env.DB.prepare(
    `SELECT n.id, n.status, c.phone AS client_phone, c.name AS client_name,
            a.handle, a.shop_name, a.language
     FROM nudges n
     JOIN clients c ON c.id = n.client_id
     JOIN artisans a ON a.id = n.artisan_id
     WHERE n.id = ? AND n.artisan_id = ?`,
  )
    .bind(c.req.param("id"), c.var.artisanId)
    .first<{
      id: string;
      status: string;
      client_phone: string;
      client_name: string | null;
      handle: string;
      shop_name: string;
      language: "en" | "tw";
    }>();
  if (!nudge) return c.json({ error: "not_found" }, 404);
  if (nudge.status !== "pending") return c.json({ error: "already_resolved" }, 409);

  if (parsed.data.action === "dismiss") {
    await c.env.DB.prepare("UPDATE nudges SET status = 'dismissed' WHERE id = ?").bind(nudge.id).run();
    return c.json({ ok: true, status: "dismissed" });
  }

  // One tap: pre-written template with the booking link. The artisan
  // approved this send — v1 never messages clients autonomously.
  await enqueueTemplate(c.env, {
    template: "wa_rebook_nudge",
    language: nudge.language,
    recipient: nudge.client_phone,
    params: [nudge.client_name ?? "there", nudge.shop_name, `${c.env.APP_BASE_URL}/${nudge.handle}`],
  });
  await c.env.DB.prepare("UPDATE nudges SET status = 'sent' WHERE id = ?").bind(nudge.id).run();
  return c.json({ ok: true, status: "sent" });
});
