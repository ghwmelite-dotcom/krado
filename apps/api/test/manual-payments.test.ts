import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";

const DATE = "2027-03-02";
const TOKEN = "test-session-token-manual-1234567890";

async function seed(acceptManual = 1) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json, accept_manual, bank_details)
     VALUES ('art_m', 'fiifi', 'Fiifi', 'Fiifi Fades', 'Kaneshie', '+233244000555', '+233554000555',
             '{"mon":[540,1020],"tue":[540,1020],"wed":[540,1020],"thu":[540,1020],"fri":[540,1020],"sat":null,"sun":null}',
             ?, 'GCB · 1234567890 · Fiifi Mensah')`,
  )
    .bind(acceptManual)
    .run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min) VALUES ('svc_m', 'art_m', 'Fade', 4000, 45)",
  ).run();
  await env.KV.put(`sess:${TOKEN}`, "art_m", { expirationTtl: 3600 });
}

async function makeHold(phone = "0240000040"): Promise<string> {
  const res = await app.request(
    "/api/p/fiifi/hold",
    {
      method: "POST",
      body: JSON.stringify({ service_id: "svc_m", date: DATE, slot: 600, phone, client_name: "Abena" }),
      headers: { "content-type": "application/json" },
    },
    env,
  );
  return ((await res.json()) as { hold_token: string }).hold_token;
}

function startManual(holdToken: string, method = "momo") {
  return app.request(
    `/api/bookings/${holdToken}/manual`,
    { method: "POST", body: JSON.stringify({ method }), headers: { "content-type": "application/json" } },
    env,
  );
}

function claimAction(id: string, action: "confirm" | "reject") {
  return app.request(
    `/api/manual-claims/${id}/${action}`,
    { method: "POST", headers: { authorization: `Bearer ${TOKEN}` } },
    env,
  );
}

describe("manual payments (direct MoMo / bank transfer)", () => {
  beforeEach(() => seed());

  test("client gets payment instructions + reference; claim is pending for the artisan", async () => {
    const holdToken = await makeHold();
    const res = await startManual(holdToken, "momo");
    expect(res.status).toBe(201);
    const body = (await res.json()) as {
      claim_id: string;
      reference: string;
      amount: number;
      instructions: { momo_number: string; bank_details: string | null };
      expires_at: string;
    };
    expect(body.amount).toBe(1000);
    expect(body.instructions.momo_number).toBe("+233554000555");
    expect(body.reference).toMatch(/^KR-/);

    const list = await app.request("/api/manual-claims", { headers: { authorization: `Bearer ${TOKEN}` } }, env);
    const { claims } = (await list.json()) as { claims: Array<{ id: string; status: string; method: string }> };
    expect(claims).toHaveLength(1);
    expect(claims[0]).toMatchObject({ status: "pending", method: "momo" });
  });

  test("bank method returns bank details", async () => {
    const holdToken = await makeHold("0240000041");
    const body = (await (await startManual(holdToken, "bank")).json()) as {
      instructions: { bank_details: string };
    };
    expect(body.instructions.bank_details).toContain("GCB");
  });

  test("artisan confirm locks the booking with a manual payment row", async () => {
    const holdToken = await makeHold("0240000042");
    const { claim_id } = (await (await startManual(holdToken)).json()) as { claim_id: string };

    const res = await claimAction(claim_id, "confirm");
    expect(res.status).toBe(200);

    const booking = await env.DB.prepare(
      "SELECT status, deposit FROM bookings WHERE artisan_id = 'art_m'",
    ).first();
    expect(booking).toMatchObject({ status: "locked", deposit: 1000 });

    const payment = await env.DB.prepare(
      "SELECT provider, channel, amount, status FROM payments WHERE booking_id = (SELECT id FROM bookings WHERE artisan_id = 'art_m')",
    ).first();
    expect(payment).toMatchObject({ provider: "manual", channel: "momo", amount: 1000, status: "success" });

    // Confirmations still go out
    const msgs = await env.DB.prepare(
      "SELECT COUNT(*) AS n FROM message_log WHERE template LIKE 'wa_booking_confirmed%'",
    ).first<{ n: number }>();
    expect(msgs!.n).toBe(2);

    // Confirm is one-shot
    expect((await claimAction(claim_id, "confirm")).status).toBe(409);
  });

  test("artisan reject releases the slot", async () => {
    const holdToken = await makeHold("0240000043");
    const { claim_id } = (await (await startManual(holdToken)).json()) as { claim_id: string };

    expect((await claimAction(claim_id, "reject")).status).toBe(200);

    const slots = await app.request(`/api/p/fiifi/slots?date=${DATE}&service=svc_m`, {}, env);
    const { slots: open } = (await slots.json()) as { slots: number[] };
    expect(open).toContain(600);

    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM bookings").first<{ n: number }>();
    expect(n!.n).toBe(0);
  });

  test("confirm fails 409 if the slot got locked by someone else meanwhile", async () => {
    const holdToken = await makeHold("0240000044");
    const { claim_id } = (await (await startManual(holdToken)).json()) as { claim_id: string };

    // Simulate the hold expiring and another client locking the same slot
    const hold = await env.DB.prepare("SELECT hold_json FROM manual_claims WHERE id = ?")
      .bind(claim_id)
      .first<{ hold_json: string }>();
    const h = JSON.parse(hold!.hold_json) as { artisan_id: string; date: string; slot: number; token: string };
    await env.KV.delete(`hold:${h.artisan_id}:${h.date}:${h.slot}`);
    await env.KV.delete(`holdtok:${h.token}`);
    await env.DB.prepare("INSERT OR IGNORE INTO clients (id, phone) VALUES ('cl_steal', '+233240000099')").run();
    await env.DB.prepare(
      `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status)
       VALUES ('bk_steal', 'art_m', 'cl_steal', 'svc_m', 'Fade', 4000, 45, 1000, '${DATE}T10:00:00.000Z', 'locked')`,
    ).run();

    expect((await claimAction(claim_id, "confirm")).status).toBe(409);
  });

  test("manual option requires the artisan to have enabled it", async () => {
    await env.DB.prepare("UPDATE artisans SET accept_manual = 0 WHERE id = 'art_m'").run();
    const holdToken = await makeHold("0240000045");
    expect((await startManual(holdToken)).status).toBe(403);
  });

  test("public page advertises available payment options", async () => {
    const res = await app.request("/api/p/fiifi", {}, env);
    const body = (await res.json()) as { payment_options: { paystack: boolean; manual_momo: boolean; bank: boolean } };
    expect(body.payment_options).toEqual({ paystack: true, manual_momo: true, bank: true });
  });
});
