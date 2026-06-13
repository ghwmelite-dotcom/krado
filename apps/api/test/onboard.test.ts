import { describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";

const payload = {
  name: "Kojo Mensah",
  shop_name: "Kojo's Cuts",
  area: "Madina, Accra",
  phone: "0244111222",
  pin: "4321",
  services: [
    { name: "Low fade", price: 4000, duration_min: 45 },
    { name: "Trim", price: 2500, duration_min: 30 },
  ],
  hours: { mon: [540, 1020], tue: [540, 1020], wed: null, thu: [540, 1020], fri: [540, 1020], sat: [480, 1140], sun: null },
};

function post(body: unknown) {
  return app.request(
    "/api/onboard",
    { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } },
    env,
  );
}

describe("POST /api/onboard", () => {
  test("creates artisan + services, returns handle, link, session and share message", async () => {
    const res = await post(payload);
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      handle: string;
      link: string;
      token: string;
      share_message: string;
      telegram_link: string;
    };
    expect(body.handle).toBe("kojos-cuts");
    expect(body.link).toContain("/kojos-cuts");
    expect(body.share_message).toContain(body.link);
    expect(body.token.length).toBeGreaterThan(20);
    expect(body.telegram_link).toContain("t.me/");

    // PIN is stored hashed, never plaintext
    const stored = await env.DB.prepare(
      "SELECT pin_hash, pin_salt, momo_number, phone FROM artisans WHERE handle = 'kojos-cuts'",
    ).first<{ pin_hash: string; pin_salt: string; momo_number: string; phone: string }>();
    expect(stored?.pin_hash).toBeTruthy();
    expect(stored?.pin_hash).not.toContain("4321");
    expect(stored?.momo_number).toBe(stored?.phone); // defaulted to login phone

    const services = await env.DB.prepare(
      "SELECT name, price FROM services WHERE artisan_id = (SELECT id FROM artisans WHERE handle = 'kojos-cuts') ORDER BY position",
    ).all<{ name: string; price: number }>();
    expect(services.results).toEqual([
      { name: "Low fade", price: 4000 },
      { name: "Trim", price: 2500 },
    ]);
  });

  test("duplicate shop name gets a numbered handle (first-come-first-served)", async () => {
    await post(payload);
    const res = await post({ ...payload, phone: "0244333444", momo_number: "0244333444" });
    expect(res.status).toBe(201);
    const body = (await res.json()) as { handle: string };
    expect(body.handle).toBe("kojos-cuts-2");
  });

  test("duplicate phone is rejected with a clear error", async () => {
    await post(payload);
    const res = await post({ ...payload, shop_name: "Other Shop" });
    expect(res.status).toBe(409);
  });

  test("fewer than 2 services is rejected", async () => {
    const res = await post({ ...payload, phone: "0244555666", services: [payload.services[0]] });
    expect(res.status).toBe(400);
  });
});
