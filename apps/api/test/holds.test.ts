import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";

// A Tuesday well in the future so "past time today" filtering never kicks in.
const DATE = "2027-03-02";

async function seed() {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json)
     VALUES ('art_h', 'kojo', 'Kojo', "Kojo's Cuts", 'Madina', '+233244000111', '+233244000111',
             '{"mon":[540,1020],"tue":[540,1020],"wed":[540,1020],"thu":[540,1020],"fri":[540,1020],"sat":[480,1140],"sun":null}')`,
  ).run();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min, position)
     VALUES ('svc_h', 'art_h', 'Low fade', 4000, 45, 0)`,
  ).run();
}

function getSlots() {
  return app.request(`/api/p/kojo/slots?date=${DATE}&service=svc_h`, {}, env);
}

function postHold(body: Record<string, unknown>) {
  return app.request(
    "/api/p/kojo/hold",
    { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } },
    env,
  );
}

describe("public booking: availability + holds", () => {
  beforeEach(seed);

  test("GET /api/p/:handle returns shop page data", async () => {
    const res = await app.request("/api/p/kojo", {}, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { shop_name: string; services: Array<{ id: string; deposit: number }> };
    expect(body.shop_name).toBe("Kojo's Cuts");
    expect(body.services[0]!.deposit).toBe(1000); // 25% of GHS 40
  });

  test("slots reflect working hours and service duration", async () => {
    const res = await getSlots();
    const { slots } = (await res.json()) as { slots: number[] };
    expect(slots[0]).toBe(540);
    expect(slots).toContain(960);
    expect(slots).not.toContain(990); // 16:30 + 45min > 17:00
  });

  test("a hold removes the slot, returns token + deposit + expiry", async () => {
    const res = await postHold({ service_id: "svc_h", date: DATE, slot: 600, phone: "0240000001" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { hold_token: string; deposit: number; expires_at: string };
    expect(body.deposit).toBe(1000);
    expect(new Date(body.expires_at).getTime()).toBeGreaterThan(Date.now());

    const { slots } = (await (await getSlots()).json()) as { slots: number[] };
    expect(slots).not.toContain(600);

    // funnel: the hold bumped holds_created
    const c = await env.DB.prepare("SELECT COALESCE(SUM(count),0) AS n FROM metric_counters WHERE name = 'holds_created'").first<{
      n: number;
    }>();
    expect(c!.n).toBeGreaterThanOrEqual(1);
  });

  test("double-hold of the same slot is rejected 409", async () => {
    await postHold({ service_id: "svc_h", date: DATE, slot: 600, phone: "0240000001" });
    const res = await postHold({ service_id: "svc_h", date: DATE, slot: 600, phone: "0240000002" });
    expect(res.status).toBe(409);
  });

  test("third concurrent hold for the same phone is rejected 429", async () => {
    await postHold({ service_id: "svc_h", date: DATE, slot: 600, phone: "0240000003" });
    await postHold({ service_id: "svc_h", date: DATE, slot: 720, phone: "0240000003" });
    const res = await postHold({ service_id: "svc_h", date: DATE, slot: 840, phone: "0240000003" });
    expect(res.status).toBe(429);
  });

  test("hold on a closed day is rejected", async () => {
    const sunday = "2027-03-07";
    const res = await postHold({ service_id: "svc_h", date: sunday, slot: 600, phone: "0240000004" });
    expect(res.status).toBe(422);
  });

  test("hold overlapping a locked booking is rejected", async () => {
    await env.DB.prepare("INSERT OR IGNORE INTO clients (id, phone) VALUES ('cl_x', '+233240000009')").run();
    await env.DB.prepare(
      `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status)
       VALUES ('bk_x', 'art_h', 'cl_x', 'svc_h', 'Low fade', 4000, 45, 1000, '${DATE}T10:00:00.000Z', 'locked')`,
    ).run();
    const res = await postHold({ service_id: "svc_h", date: DATE, slot: 630, phone: "0240000005" });
    expect(res.status).toBe(409);

    const { slots } = (await (await getSlots()).json()) as { slots: number[] };
    expect(slots).not.toContain(600);
    expect(slots).not.toContain(630);
  });
});
