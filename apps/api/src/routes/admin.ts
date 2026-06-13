import { Hono } from "hono";
import { z } from "zod";
import type { AppEnv } from "../env";
import { adminKey, ADMIN_TTL_SECONDS, requireAdmin } from "../middleware/admin";
import { runPayouts, markPayoutPaid } from "../lib/settlement";

/**
 * Pilot ops console (operator-only, separate auth). Read-mostly: watch the
 * pilot, resolve payment reconciliation, look up bookings for support, pause
 * a shop. Deliberately NOT a full CRM. See docs/PRD.md workstream 8.
 */
export const admin = new Hono<AppEnv>();

const LoginInput = z.object({ passcode: z.string().min(1) });

function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

admin.post("/login", async (c) => {
  const parsed = LoginInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);

  const failKey = "adminloginfail";
  const fails = Number((await c.env.KV.get(failKey)) ?? "0");
  if (fails >= 5) return c.json({ error: "too_many_attempts" }, 429);

  const expected = c.env.ADMIN_PASSCODE ?? "";
  if (!expected || !constantTimeEqual(parsed.data.passcode, expected)) {
    await c.env.KV.put(failKey, String(fails + 1), { expirationTtl: 900 });
    return c.json({ error: "invalid_passcode" }, 401);
  }

  await c.env.KV.delete(failKey);
  const token = crypto.randomUUID() + crypto.randomUUID().replaceAll("-", "");
  await c.env.KV.put(adminKey(token), "1", { expirationTtl: ADMIN_TTL_SECONDS });
  return c.json({ token });
});

admin.use("/*", requireAdmin);

/** One call powers the overview: pilot funnel + money + ops queues. */
admin.get("/overview", async (c) => {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();

  const [artisans, active, statuses, money, sources, recon, claims, fees] = await Promise.all([
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM artisans").first<{ n: number }>(),
    c.env.DB.prepare(
      "SELECT COUNT(DISTINCT artisan_id) AS n FROM bookings WHERE starts_at >= ? AND status IN ('locked','completed')",
    )
      .bind(weekAgo)
      .first<{ n: number }>(),
    c.env.DB.prepare("SELECT status, COUNT(*) AS n FROM bookings GROUP BY status").all<{
      status: string;
      n: number;
    }>(),
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(price),0) AS gmv FROM bookings WHERE status = 'completed'",
    ).first<{ gmv: number }>(),
    c.env.DB.prepare("SELECT source, COUNT(*) AS n FROM bookings GROUP BY source").all<{
      source: string;
      n: number;
    }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM payment_recon WHERE resolved = 0").first<{ n: number }>(),
    c.env.DB.prepare("SELECT COUNT(*) AS n FROM manual_claims WHERE status = 'pending'").first<{ n: number }>(),
    c.env.DB.prepare(
      "SELECT COALESCE(SUM(krado_fee),0) AS f FROM bookings WHERE status IN ('locked','completed')",
    ).first<{ f: number }>(),
  ]);

  const byStatus: Record<string, number> = {};
  for (const r of statuses.results) byStatus[r.status] = r.n;
  const completed = byStatus.completed ?? 0;
  const noShow = byStatus.no_show ?? 0;
  const bySource: Record<string, number> = {};
  for (const r of sources.results) bySource[r.source] = r.n;
  const totalBookings = Object.values(byStatus).reduce((a, b) => a + b, 0);

  return c.json({
    artisans_total: artisans?.n ?? 0,
    artisans_active_week: active?.n ?? 0,
    bookings_total: totalBookings,
    by_status: byStatus,
    no_show_rate: completed + noShow > 0 ? Math.round((noShow / (completed + noShow)) * 100) : 0,
    bookings_via_nudge: bySource.nudge ?? 0,
    bookings_via_link: bySource.link ?? 0,
    bookings_via_manual: bySource.manual ?? 0,
    gmv_completed: money?.gmv ?? 0,
    krado_fees_accrued: fees?.f ?? 0,
    pending_recon: recon?.n ?? 0,
    pending_claims: claims?.n ?? 0,
  });
});

admin.get("/artisans", async (c) => {
  const weekAgo = new Date(Date.now() - 7 * 86_400_000).toISOString();
  const { results } = await c.env.DB.prepare(
    `SELECT a.id, a.handle, a.shop_name, a.area, a.phone, a.status, a.created_at,
            (a.telegram_chat_id IS NOT NULL) AS telegram_linked,
            (SELECT COUNT(*) FROM bookings b WHERE b.artisan_id = a.id AND b.starts_at >= ?1 AND b.status IN ('locked','completed')) AS week_bookings,
            (SELECT COALESCE(SUM(price),0) FROM bookings b WHERE b.artisan_id = a.id AND b.status = 'completed' AND b.starts_at >= ?1) AS week_gmv,
            (SELECT COALESCE(SUM(net),0) FROM settlement_entries s WHERE s.artisan_id = a.id AND s.payout_id IS NULL) AS balance,
            (SELECT MAX(created_at) FROM bookings b WHERE b.artisan_id = a.id) AS last_booking
     FROM artisans a
     ORDER BY week_bookings DESC, a.created_at DESC`,
  )
    .bind(weekAgo)
    .all();
  return c.json({ artisans: results });
});

const StatusInput = z.object({ status: z.enum(["active", "paused"]) });

admin.post("/artisans/:id/status", async (c) => {
  const parsed = StatusInput.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const res = await c.env.DB.prepare("UPDATE artisans SET status = ? WHERE id = ?")
    .bind(parsed.data.status, c.req.param("id"))
    .run();
  if (res.meta.changes === 0) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true, status: parsed.data.status });
});

admin.get("/recon", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, reference, amount, phone, artisan_id, reason, created_at
     FROM payment_recon WHERE resolved = 0 ORDER BY created_at DESC`,
  ).all();
  return c.json({ recon: results });
});

admin.post("/recon/:id/resolve", async (c) => {
  const res = await c.env.DB.prepare("UPDATE payment_recon SET resolved = 1 WHERE id = ?")
    .bind(c.req.param("id"))
    .run();
  if (res.meta.changes === 0) return c.json({ error: "not_found" }, 404);
  return c.json({ ok: true });
});

/** Payouts: recent batches + each artisan's outstanding balance. */
admin.get("/payouts", async (c) => {
  const [payouts, balances] = await Promise.all([
    c.env.DB.prepare(
      `SELECT p.id, p.amount, p.status, p.momo_number, p.reference, p.created_at, p.settled_at, a.shop_name
       FROM payouts p JOIN artisans a ON a.id = p.artisan_id
       ORDER BY p.created_at DESC LIMIT 50`,
    ).all(),
    c.env.DB.prepare(
      `SELECT a.shop_name, a.id AS artisan_id, SUM(s.net) AS balance
       FROM settlement_entries s JOIN artisans a ON a.id = s.artisan_id
       WHERE s.payout_id IS NULL
       GROUP BY s.artisan_id HAVING balance > 0
       ORDER BY balance DESC`,
    ).all(),
  ]);
  return c.json({ payouts: payouts.results, balances: balances.results });
});

admin.post("/payouts/run", async (c) => {
  const result = await runPayouts(c.env);
  return c.json({ ok: true, ...result });
});

admin.post("/payouts/:id/paid", async (c) => {
  const ok = await markPayoutPaid(c.env, c.req.param("id"));
  return ok ? c.json({ ok: true }) : c.json({ error: "not_found_or_paid" }, 404);
});

/** Support lookup by phone, handle, or Paystack/manual reference. */
admin.get("/lookup", async (c) => {
  const q = (c.req.query("q") ?? "").trim();
  if (q.length < 3) return c.json({ error: "query_too_short" }, 400);
  const like = `%${q}%`;

  const [artisans, clients, payment] = await Promise.all([
    c.env.DB.prepare(
      "SELECT id, handle, shop_name, phone, status FROM artisans WHERE handle LIKE ?1 OR phone LIKE ?1 OR shop_name LIKE ?1 LIMIT 10",
    )
      .bind(like)
      .all(),
    c.env.DB.prepare("SELECT id, phone, name FROM clients WHERE phone LIKE ?1 OR name LIKE ?1 LIMIT 10")
      .bind(like)
      .all(),
    c.env.DB.prepare(
      "SELECT p.id, p.reference, p.kind, p.amount, p.status, p.booking_id FROM payments p WHERE p.reference LIKE ?1 LIMIT 10",
    )
      .bind(like)
      .all(),
  ]);

  // Recent bookings for any matched client.
  let bookings: unknown[] = [];
  const clientIds = (clients.results as Array<{ id: string }>).map((r) => r.id);
  if (clientIds.length) {
    const placeholders = clientIds.map(() => "?").join(",");
    const { results } = await c.env.DB.prepare(
      `SELECT b.id, b.service_name, b.price, b.deposit, b.starts_at, b.status, b.artisan_id
       FROM bookings b WHERE b.client_id IN (${placeholders}) ORDER BY b.starts_at DESC LIMIT 20`,
    )
      .bind(...clientIds)
      .all();
    bookings = results;
  }

  return c.json({
    artisans: artisans.results,
    clients: clients.results,
    payments: payment.results,
    bookings,
  });
});
