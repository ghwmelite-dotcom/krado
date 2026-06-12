import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { env, fetchMock } from "cloudflare:test";
import { app } from "../src/index";
import { hmacSha512Hex } from "../src/lib/paystack";

const DATE = "2027-03-02";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

async function seed() {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json)
     VALUES ('art_p', 'ama', 'Ama', 'Ama Braids', 'Osu', '+233244000222', '+233244000222',
             '{"mon":[540,1020],"tue":[540,1020],"wed":[540,1020],"thu":[540,1020],"fri":[540,1020],"sat":null,"sun":null}')`,
  ).run();
  await env.DB.prepare(
    `INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min, position)
     VALUES ('svc_p', 'art_p', 'Knotless braids', 20000, 120, 0)`,
  ).run();
}

async function makeHold(phone = "0240000010"): Promise<string> {
  const res = await app.request(
    "/api/p/ama/hold",
    {
      method: "POST",
      body: JSON.stringify({ service_id: "svc_p", date: DATE, slot: 600, phone }),
      headers: { "content-type": "application/json" },
    },
    env,
  );
  const body = (await res.json()) as { hold_token: string };
  return body.hold_token;
}

function webhookBody(reference: string, holdToken: string, event = "charge.success") {
  return JSON.stringify({
    event,
    data: {
      reference,
      amount: 5000, // 25% of GHS 200
      channel: "mobile_money",
      metadata: { hold_token: holdToken },
    },
  });
}

async function postWebhook(body: string, sign = true) {
  const sig = sign ? await hmacSha512Hex(env.PAYSTACK_WEBHOOK_SECRET!, body) : "bad-signature";
  return app.request(
    "/api/webhooks/paystack",
    { method: "POST", body, headers: { "content-type": "application/json", "x-paystack-signature": sig } },
    env,
  );
}

function mockVerify(reference: string, amount = 5000, status = "success") {
  fetchMock
    .get("https://api.paystack.co")
    .intercept({ path: `/transaction/verify/${reference}`, method: "GET" })
    .reply(
      200,
      JSON.stringify({ status: true, data: { reference, amount, status, channel: "mobile_money" } }),
      { headers: { "content-type": "application/json" } },
    );
}

describe("POST /api/bookings/:holdToken/pay", () => {
  beforeEach(seed);

  test("initializes a Paystack MoMo transaction for the deposit", async () => {
    const holdToken = await makeHold();
    fetchMock
      .get("https://api.paystack.co")
      .intercept({ path: "/transaction/initialize", method: "POST" })
      .reply(
        200,
        JSON.stringify({
          status: true,
          data: { authorization_url: "https://checkout.paystack.com/x", access_code: "ac", reference: "ref_init" },
        }),
        { headers: { "content-type": "application/json" } },
      );

    const res = await app.request(`/api/bookings/${holdToken}/pay`, { method: "POST" }, env);
    expect(res.status).toBe(200);
    const body = (await res.json()) as { authorization_url: string; reference: string };
    expect(body.authorization_url).toContain("checkout.paystack.com");
  });

  test("404 for unknown/expired hold token", async () => {
    const res = await app.request("/api/bookings/hld_nope/pay", { method: "POST" }, env);
    expect(res.status).toBe(404);
  });
});

describe("POST /api/webhooks/paystack", () => {
  beforeEach(seed);

  test("rejects bad signature with 401 and writes nothing", async () => {
    const res = await postWebhook(webhookBody("ref_sig", "hld_whatever"), false);
    expect(res.status).toBe(401);
    const row = await env.DB.prepare("SELECT COUNT(*) AS n FROM webhook_events").first<{ n: number }>();
    expect(row!.n).toBe(0);
  });

  test("charge.success promotes hold → locked booking + payment + confirmations", async () => {
    const holdToken = await makeHold("0240000011");
    mockVerify("ref_ok");

    const res = await postWebhook(webhookBody("ref_ok", holdToken));
    expect(res.status).toBe(200);

    const booking = await env.DB.prepare(
      "SELECT status, price, deposit, service_name, starts_at FROM bookings WHERE artisan_id = 'art_p'",
    ).first<{ status: string; price: number; deposit: number; service_name: string; starts_at: string }>();
    expect(booking).toMatchObject({
      status: "locked",
      price: 20000,
      deposit: 5000,
      service_name: "Knotless braids",
      starts_at: `${DATE}T10:00:00.000Z`,
    });

    const payment = await env.DB.prepare("SELECT kind, amount, status FROM payments WHERE reference = 'ref_ok'").first();
    expect(payment).toMatchObject({ kind: "deposit", amount: 5000, status: "success" });

    const client = await env.DB.prepare("SELECT phone FROM clients WHERE phone = '+233240000011'").first();
    expect(client).not.toBeNull();

    // Confirmations queued to both parties
    const msgs = await env.DB.prepare("SELECT template, recipient FROM message_log ORDER BY template").all<{
      template: string;
    }>();
    expect(msgs.results.map((m) => m.template)).toEqual([
      "wa_booking_confirmed_artisan",
      "wa_booking_confirmed_client",
    ]);

    // Hold consumed
    const again = await app.request(`/api/bookings/${holdToken}/pay`, { method: "POST" }, env);
    expect(again.status).toBe(404);
  });

  test("duplicate event_id processes once (idempotency gate)", async () => {
    const holdToken = await makeHold("0240000012");
    mockVerify("ref_dup");

    const body = webhookBody("ref_dup", holdToken);
    expect((await postWebhook(body)).status).toBe(200);
    expect((await postWebhook(body)).status).toBe(200);

    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings WHERE artisan_id = 'art_p'").first<{ n: number }>();
    expect(n!.n).toBe(1);
  });

  test("payment after hold expiry lands in payment_recon, no booking", async () => {
    mockVerify("ref_late");
    const res = await postWebhook(webhookBody("ref_late", "hld_expired_gone"));
    expect(res.status).toBe(200);

    const recon = await env.DB.prepare("SELECT reason, amount FROM payment_recon WHERE reference = 'ref_late'").first();
    expect(recon).toMatchObject({ reason: "hold_expired", amount: 5000 });
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings").first<{ n: number }>();
    expect(n!.n).toBe(0);
  });

  test("verify amount mismatch → recon, no booking", async () => {
    const holdToken = await makeHold("0240000013");
    mockVerify("ref_short", 100); // paid GHS 1, deposit is GHS 50
    const res = await postWebhook(webhookBody("ref_short", holdToken));
    expect(res.status).toBe(200);

    const recon = await env.DB.prepare("SELECT reason FROM payment_recon WHERE reference = 'ref_short'").first();
    expect(recon).toMatchObject({ reason: "amount_mismatch" });
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings").first<{ n: number }>();
    expect(n!.n).toBe(0);
  });
});
