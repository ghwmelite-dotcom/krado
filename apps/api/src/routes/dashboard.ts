import { Hono } from "hono";
import { accraDateOf } from "@krado/shared";
import type { AppEnv } from "../env";
import { requireSession } from "../middleware/session";

export const dashboard = new Hono<AppEnv>();

/** One payload powers the artisan home screen; the PWA caches it offline. */
dashboard.get("/", requireSession, async (c) => {
  const artisanId = c.var.artisanId;
  const today = accraDateOf(new Date().toISOString());
  const dayStart = `${today}T00:00:00.000Z`;
  const dayEnd = `${today}T23:59:59.999Z`;
  const weekStart = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const nowIso = new Date().toISOString();

  const [artisan, earned, susuToday, susuWeek, clientsWeek, upNext, pendingNudges, manualClaims] =
    await Promise.all([
      c.env.DB.prepare(
        "SELECT name, shop_name, handle, language, daily_goal, susu_mode, susu_value FROM artisans WHERE id = ?",
      )
        .bind(artisanId)
        .first(),
      c.env.DB.prepare(
        "SELECT COALESCE(SUM(price), 0) AS v FROM bookings WHERE artisan_id = ? AND status = 'completed' AND starts_at >= ? AND starts_at < ?",
      )
        .bind(artisanId, dayStart, dayEnd)
        .first<{ v: number }>(),
      c.env.DB.prepare("SELECT COALESCE(SUM(amount), 0) AS v FROM susu_ledger WHERE artisan_id = ? AND day = ?")
        .bind(artisanId, today)
        .first<{ v: number }>(),
      c.env.DB.prepare("SELECT COALESCE(SUM(amount), 0) AS v FROM susu_ledger WHERE artisan_id = ? AND day > ?")
        .bind(artisanId, weekStart.slice(0, 10))
        .first<{ v: number }>(),
      c.env.DB.prepare(
        "SELECT COUNT(DISTINCT client_id) AS v FROM bookings WHERE artisan_id = ? AND status IN ('locked','completed') AND starts_at >= ?",
      )
        .bind(artisanId, weekStart)
        .first<{ v: number }>(),
      c.env.DB.prepare(
        `SELECT b.id, b.service_name, b.price, b.deposit, b.starts_at, b.status,
                c.name AS client_name, c.phone AS client_phone
         FROM bookings b JOIN clients c ON c.id = b.client_id
         WHERE b.artisan_id = ? AND b.status = 'locked' AND b.starts_at >= ?
         ORDER BY b.starts_at LIMIT 8`,
      )
        .bind(artisanId, nowIso)
        .all(),
      c.env.DB.prepare(
        `SELECT n.id, n.cycle_days, c.name AS client_name, c.phone AS client_phone
         FROM nudges n JOIN clients c ON c.id = n.client_id
         WHERE n.artisan_id = ? AND n.status = 'pending' ORDER BY n.created_at LIMIT 1`,
      )
        .bind(artisanId)
        .all(),
      c.env.DB.prepare("SELECT COUNT(*) AS v FROM manual_claims WHERE artisan_id = ? AND status = 'pending'")
        .bind(artisanId)
        .first<{ v: number }>(),
    ]);

  if (!artisan) return c.json({ error: "unauthorized" }, 401);

  return c.json({
    artisan,
    date: today,
    daily_goal: (artisan as { daily_goal: number }).daily_goal,
    earned_today: earned?.v ?? 0,
    susu_today: susuToday?.v ?? 0,
    susu_week: susuWeek?.v ?? 0,
    clients_week: clientsWeek?.v ?? 0,
    up_next: upNext.results,
    pending_nudges: pendingNudges.results,
    pending_manual_claims: manualClaims?.v ?? 0,
  });
});
