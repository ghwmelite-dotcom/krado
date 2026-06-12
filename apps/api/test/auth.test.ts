import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";

const PHONE = "+233244123456";

async function seedArtisan() {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json)
     VALUES ('art_1', 'kojo', 'Kojo', "Kojo's Cuts", 'Madina', ?, ?, '{}')`,
  )
    .bind(PHONE, PHONE)
    .run();
}

async function requestOtp(phone = "0244123456") {
  return app.request(
    "/api/auth/otp",
    { method: "POST", body: JSON.stringify({ phone }), headers: { "content-type": "application/json" } },
    env,
  );
}

describe("auth: OTP + sessions", () => {
  beforeEach(seedArtisan);

  test("issue OTP stores a 6-digit code in KV with TTL", async () => {
    const res = await requestOtp();
    expect(res.status).toBe(200);
    const code = await env.KV.get(`otp:${PHONE}`);
    expect(code).toMatch(/^\d{6}$/);
  });

  test("verify with correct code returns session token; token authorizes /api/me", async () => {
    await requestOtp();
    const code = (await env.KV.get(`otp:${PHONE}`))!;
    const res = await app.request(
      "/api/auth/verify",
      { method: "POST", body: JSON.stringify({ phone: "0244123456", code }), headers: { "content-type": "application/json" } },
      env,
    );
    expect(res.status).toBe(200);
    const { token } = (await res.json()) as { token: string };
    expect(token.length).toBeGreaterThan(20);

    const me = await app.request("/api/me", { headers: { authorization: `Bearer ${token}` } }, env);
    expect(me.status).toBe(200);
    const body = (await me.json()) as { artisan: { handle: string } };
    expect(body.artisan.handle).toBe("kojo");
  });

  test("wrong code rejected; OTP is single-use", async () => {
    await requestOtp();
    const code = (await env.KV.get(`otp:${PHONE}`))!;

    const bad = await app.request(
      "/api/auth/verify",
      { method: "POST", body: JSON.stringify({ phone: "0244123456", code: "000000" }), headers: { "content-type": "application/json" } },
      env,
    );
    expect(bad.status).toBe(401);

    const ok = await app.request(
      "/api/auth/verify",
      { method: "POST", body: JSON.stringify({ phone: "0244123456", code }), headers: { "content-type": "application/json" } },
      env,
    );
    expect(ok.status).toBe(200);

    const replay = await app.request(
      "/api/auth/verify",
      { method: "POST", body: JSON.stringify({ phone: "0244123456", code }), headers: { "content-type": "application/json" } },
      env,
    );
    expect(replay.status).toBe(401);
  });

  test("unknown phone cannot request OTP (no artisan enumeration of success)", async () => {
    const res = await requestOtp("0209999999");
    // Always 200 to avoid enumeration, but no code stored
    expect(res.status).toBe(200);
    expect(await env.KV.get("otp:+233209999999")).toBeNull();
  });

  test("requests without a session are rejected", async () => {
    const res = await app.request("/api/me", {}, env);
    expect(res.status).toBe(401);
  });
});
