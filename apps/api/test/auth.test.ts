import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";
import { hashPin } from "../src/lib/pin";

const PHONE = "+233244123456";

async function seedArtisan(pin = "1234") {
  const { hash, salt } = await hashPin(pin);
  await env.DB.prepare(
    `INSERT OR REPLACE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json, pin_hash, pin_salt)
     VALUES ('art_1', 'kojo', 'Kojo', "Kojo's Cuts", 'Madina', ?, ?, '{}', ?, ?)`,
  )
    .bind(PHONE, PHONE, hash, salt)
    .run();
}

function login(phone: string, pin: string) {
  return app.request(
    "/api/auth/login",
    { method: "POST", body: JSON.stringify({ phone, pin }), headers: { "content-type": "application/json" } },
    env,
  );
}

describe("auth: phone + PIN", () => {
  beforeEach(() => seedArtisan());

  test("correct phone + PIN returns a session token that authorizes /api/me", async () => {
    const res = await login("0244123456", "1234");
    expect(res.status).toBe(200);
    const { token } = (await res.json()) as { token: string };
    expect(token.length).toBeGreaterThan(20);

    const me = await app.request("/api/me", { headers: { authorization: `Bearer ${token}` } }, env);
    expect(me.status).toBe(200);
    const body = (await me.json()) as { artisan: { handle: string } };
    expect(body.artisan.handle).toBe("kojo");
  });

  test("wrong PIN is rejected 401", async () => {
    const res = await login("0244123456", "9999");
    expect(res.status).toBe(401);
  });

  test("unknown phone is rejected 401 (no account enumeration via status)", async () => {
    const res = await login("0209999999", "1234");
    expect(res.status).toBe(401);
  });

  test("PIN is brute-force rate-limited after 5 wrong attempts", async () => {
    for (let i = 0; i < 5; i++) {
      const r = await login("0244123456", "0000");
      expect(r.status).toBe(401);
    }
    // 6th attempt is blocked even with the correct PIN
    const blocked = await login("0244123456", "1234");
    expect(blocked.status).toBe(429);
  });

  test("a successful login clears the failure counter", async () => {
    await login("0244123456", "0000");
    await login("0244123456", "0000");
    const ok = await login("0244123456", "1234");
    expect(ok.status).toBe(200);
    expect(await env.KV.get(`loginfail:${PHONE}`)).toBeNull();
  });

  test("requests without a session are rejected", async () => {
    const res = await app.request("/api/me", {}, env);
    expect(res.status).toBe(401);
  });
});
