import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";

const TOKEN = "test-session-token-dash-12345678901";

describe("GET /api/dashboard", () => {
  beforeEach(async () => {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json, daily_goal)
       VALUES ('art_d', 'kofi', 'Kofi', 'Kofi Klippers', 'Adenta', '+233244000777', '+233244000777', '{}', 20000)`,
    ).run();
    await env.DB.prepare("INSERT OR IGNORE INTO clients (id, phone, name) VALUES ('cl_d', '+233240000060', 'Yaa')").run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min) VALUES ('svc_d', 'art_d', 'Fade', 4000, 45)",
    ).run();
    await env.KV.put(`sess:${TOKEN}`, "art_d", { expirationTtl: 3600 });

    const today = new Date().toISOString();
    const later = new Date(Date.now() + 4 * 3600_000).toISOString();
    await env.DB.prepare(
      `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status)
       VALUES ('bk_done', 'art_d', 'cl_d', 'svc_d', 'Fade', 4000, 45, 1000, ?, 'completed'),
              ('bk_next', 'art_d', 'cl_d', 'svc_d', 'Fade', 4000, 45, 1000, ?, 'locked')`,
    )
      .bind(today, later)
      .run();
    await env.DB.prepare(
      "INSERT INTO susu_ledger (id, artisan_id, booking_id, amount, day) VALUES ('ssu_d', 'art_d', 'bk_done', 500, ?)",
    )
      .bind(today.slice(0, 10))
      .run();
  });

  test("returns goal, earnings, susu, week clients and the up-next timeline", async () => {
    const res = await app.request("/api/dashboard", { headers: { authorization: `Bearer ${TOKEN}` } }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      daily_goal: number;
      earned_today: number;
      susu_week: number;
      clients_week: number;
      up_next: Array<{ id: string; status: string }>;
      pending_nudges: unknown[];
      pending_manual_claims: number;
    };
    expect(body.daily_goal).toBe(20000);
    expect(body.earned_today).toBe(4000); // completed booking price
    expect(body.susu_week).toBe(500);
    expect(body.clients_week).toBe(1);
    expect(body.up_next.map((b) => b.id)).toEqual(["bk_next"]);
  });

  test("requires a session", async () => {
    expect((await app.request("/api/dashboard", {}, env)).status).toBe(401);
  });
});
