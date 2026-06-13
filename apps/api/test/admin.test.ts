import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";

async function seed() {
  await env.DB.prepare(
    `INSERT OR REPLACE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json, status)
     VALUES ('art_ad1','kojo','Kojo','Kojo Cuts','Madina','+233244000111','+233244000111','{}','active')`,
  ).run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min) VALUES ('svc_ad','art_ad1','Fade',4000,45)",
  ).run();
  await env.DB.prepare("INSERT OR IGNORE INTO clients (id, phone, name) VALUES ('cl_ad1','+233240000050','Akosua')").run();
  await env.DB.prepare(
    `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, krado_fee, starts_at, status, source)
     VALUES ('bk_ad1','art_ad1','cl_ad1','svc_ad','Fade',4000,45,1000,100, strftime('%Y-%m-%dT%H:%M:%S.000Z','now','-1 hours'),'completed','link'),
            ('bk_ad2','art_ad1','cl_ad1','svc_ad','Fade',4000,45,1000,100, strftime('%Y-%m-%dT%H:%M:%S.000Z','now','-2 hours'),'no_show','nudge')`,
  ).run();
  await env.DB.prepare(
    "INSERT INTO payment_recon (id, reference, amount, phone, artisan_id, reason) VALUES ('rec_1','ref_x',5000,'+233240000099','art_ad1','hold_expired')",
  ).run();
}

async function adminToken(passcode = "test_admin_pass"): Promise<string> {
  const res = await app.request(
    "/api/admin/login",
    { method: "POST", body: JSON.stringify({ passcode }), headers: { "content-type": "application/json" } },
    env,
  );
  const body = (await res.json()) as { token?: string };
  return body.token ?? "";
}

function authed(token: string, path: string, init: RequestInit = {}) {
  return app.request(path, { ...init, headers: { ...(init.headers ?? {}), authorization: `Bearer ${token}` } }, env);
}

describe("admin auth", () => {
  test("wrong passcode is rejected; correct one returns a token", async () => {
    expect((await app.request("/api/admin/login", { method: "POST", body: JSON.stringify({ passcode: "nope" }), headers: { "content-type": "application/json" } }, env)).status).toBe(401);
    expect((await adminToken()).length).toBeGreaterThan(20);
  });

  test("admin routes reject requests without a valid admin token", async () => {
    expect((await app.request("/api/admin/overview", {}, env)).status).toBe(401);
    // an artisan session token must NOT unlock admin
    await env.KV.put("sess:artisan-token-xyz", "art_ad1", { expirationTtl: 3600 });
    expect((await authed("artisan-token-xyz", "/api/admin/overview")).status).toBe(401);
  });
});

describe("admin ops", () => {
  beforeEach(seed);

  test("overview returns pilot funnel, money and queues", async () => {
    const token = await adminToken();
    const res = await authed(token, "/api/admin/overview");
    expect(res.status).toBe(200);
    const o = (await res.json()) as Record<string, number>;
    expect(o.artisans_total).toBeGreaterThanOrEqual(1);
    expect(o.no_show_rate).toBe(50); // 1 completed, 1 no_show
    expect(o.gmv_completed).toBe(4000);
    expect(o.bookings_via_nudge).toBe(1);
    expect(o.krado_fees_accrued).toBe(100); // only the completed booking; no charge on no-shows
    expect(o.pending_recon).toBe(1);
  });

  test("artisan roster includes week activity and can be paused", async () => {
    const token = await adminToken();
    const list = (await (await authed(token, "/api/admin/artisans")).json()) as {
      artisans: Array<{ id: string; week_bookings: number; status: string }>;
    };
    const kojo = list.artisans.find((a) => a.id === "art_ad1")!;
    expect(kojo.week_bookings).toBe(1); // locked+completed only (no_show excluded)

    const res = await authed(token, "/api/admin/artisans/art_ad1/status", {
      method: "POST",
      body: JSON.stringify({ status: "paused" }),
      headers: { "content-type": "application/json" },
    });
    expect(res.status).toBe(200);
    const row = await env.DB.prepare("SELECT status FROM artisans WHERE id = 'art_ad1'").first();
    expect(row).toMatchObject({ status: "paused" });
  });

  test("recon queue lists pending rows and resolves them", async () => {
    const token = await adminToken();
    const before = (await (await authed(token, "/api/admin/recon")).json()) as { recon: Array<{ id: string }> };
    expect(before.recon).toHaveLength(1);

    expect((await authed(token, `/api/admin/recon/${before.recon[0]!.id}/resolve`, { method: "POST" })).status).toBe(200);
    const after = (await (await authed(token, "/api/admin/recon")).json()) as { recon: unknown[] };
    expect(after.recon).toHaveLength(0);
  });

  test("lookup finds a client by phone and returns their bookings", async () => {
    const token = await adminToken();
    const res = await authed(token, "/api/admin/lookup?q=233240000050");
    expect(res.status).toBe(200);
    const body = (await res.json()) as { clients: unknown[]; bookings: unknown[] };
    expect(body.clients).toHaveLength(1);
    expect(body.bookings.length).toBeGreaterThanOrEqual(2);
  });
});
