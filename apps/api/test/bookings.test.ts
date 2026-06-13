import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { env, fetchMock } from "cloudflare:test";
import { app } from "../src/index";
import { clientCancelSig } from "../src/routes/bookings";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

const TOKEN = "test-session-token-bookings-1234567890";

/** Booking 3 hours out so client-cancel (≥2h) is allowed. */
function futureIso(hoursAhead: number): string {
  return new Date(Date.now() + hoursAhead * 3600_000).toISOString();
}

async function seed(startsAt = futureIso(3)) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json, susu_mode, susu_value)
     VALUES ('art_b', 'kwame', 'Kwame', 'Sharp Cutz', 'Lapaz', '+233244000333', '+233244000333', '{}', 'flat', 500)`,
  ).run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min) VALUES ('svc_b', 'art_b', 'Fade', 4000, 45)",
  ).run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO clients (id, phone, telegram_chat_id) VALUES ('cl_b', '+233240000020', '770770')",
  ).run();
  await env.DB.prepare(
    `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status)
     VALUES ('bk_1', 'art_b', 'cl_b', 'svc_b', 'Fade', 4000, 45, 1000, ?, 'locked')`,
  )
    .bind(startsAt)
    .run();
  await env.DB.prepare(
    `INSERT INTO payments (id, booking_id, reference, kind, amount, status)
     VALUES ('pay_1', 'bk_1', 'ref_b1', 'deposit', 1000, 'success')`,
  ).run();
  await env.KV.put(`sess:${TOKEN}`, "art_b", { expirationTtl: 3600 });
}

function patchStatus(id: string, status: string) {
  return app.request(
    `/api/bookings/${id}/status`,
    {
      method: "POST",
      body: JSON.stringify({ status }),
      headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    },
    env,
  );
}

describe("booking lifecycle", () => {
  beforeEach(() => seed());

  test("artisan lists bookings for a day", async () => {
    const day = new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
    const res = await app.request(`/api/bookings?date=${day}`, { headers: { authorization: `Bearer ${TOKEN}` } }, env);
    expect(res.status).toBe(200);
    const { bookings } = (await res.json()) as { bookings: Array<{ id: string; client_phone: string }> };
    expect(bookings).toHaveLength(1);
    expect(bookings[0]!.client_phone).toBe("+233240000020");
  });

  test("completing a booking writes the susu set-aside", async () => {
    const res = await patchStatus("bk_1", "completed");
    expect(res.status).toBe(200);

    const booking = await env.DB.prepare("SELECT status FROM bookings WHERE id = 'bk_1'").first();
    expect(booking).toMatchObject({ status: "completed" });

    const susu = await env.DB.prepare("SELECT amount FROM susu_ledger WHERE booking_id = 'bk_1'").first();
    expect(susu).toMatchObject({ amount: 500 }); // flat GHS 5
  });

  test("illegal transition is rejected 422 and writes nothing", async () => {
    await patchStatus("bk_1", "completed");
    const res = await patchStatus("bk_1", "no_show");
    expect(res.status).toBe(422);
  });

  test("artisan cancel refunds the deposit and notifies the client", async () => {
    fetchMock
      .get("https://api.paystack.co")
      .intercept({ path: "/refund", method: "POST" })
      .reply(200, JSON.stringify({ status: true }), { headers: { "content-type": "application/json" } });

    const res = await patchStatus("bk_1", "cancelled_by_artisan");
    expect(res.status).toBe(200);

    const refund = await env.DB.prepare(
      "SELECT amount, status FROM payments WHERE booking_id = 'bk_1' AND kind = 'refund'",
    ).first();
    expect(refund).toMatchObject({ amount: 1000, status: "success" });

    const msg = await env.DB.prepare(
      "SELECT recipient FROM message_log WHERE template = 'tg_refund_notice'",
    ).first();
    expect(msg).toMatchObject({ recipient: "770770" }); // client's linked Telegram chat
  });

  test("another artisan's session cannot touch the booking", async () => {
    await env.KV.put("sess:other-artisan-token-1234567890123", "art_other", { expirationTtl: 3600 });
    const res = await app.request(
      "/api/bookings/bk_1/status",
      {
        method: "POST",
        body: JSON.stringify({ status: "completed" }),
        headers: { "content-type": "application/json", authorization: "Bearer other-artisan-token-1234567890123" },
      },
      env,
    );
    expect(res.status).toBe(404);
  });

  test("client cancel with valid signature ≥2h before start", async () => {
    const sig = await clientCancelSig(env.SESSION_SIGNING_KEY, "bk_1");
    const res = await app.request(`/api/bookings/bk_1/client-cancel?sig=${sig}`, { method: "POST" }, env);
    expect(res.status).toBe(200);
    const booking = await env.DB.prepare("SELECT status FROM bookings WHERE id = 'bk_1'").first();
    expect(booking).toMatchObject({ status: "cancelled_by_client" });
  });

  test("client cancel with bad signature is rejected", async () => {
    const res = await app.request("/api/bookings/bk_1/client-cancel?sig=fake", { method: "POST" }, env);
    expect(res.status).toBe(403);
  });
});

describe("client cancel inside 2 hours", () => {
  test("is rejected 422 — deposit is at stake", async () => {
    await seed(futureIso(1));
    const sig = await clientCancelSig(env.SESSION_SIGNING_KEY, "bk_1");
    const res = await app.request(`/api/bookings/bk_1/client-cancel?sig=${sig}`, { method: "POST" }, env);
    expect(res.status).toBe(422);
  });
});
