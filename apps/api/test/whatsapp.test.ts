import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { env, fetchMock } from "cloudflare:test";
import { app } from "../src/index";
import { deliverTemplate } from "../src/lib/whatsapp";
import { enqueueTemplate } from "../src/lib/messaging";

beforeAll(() => {
  fetchMock.activate();
  fetchMock.disableNetConnect();
});

async function seedBooking(startsAt: string) {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json)
     VALUES ('art_w', 'yaw', 'Yaw', 'Yaw Cuts', 'Tema', '+233244000444', '+233244000444', '{}')`,
  ).run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min) VALUES ('svc_w', 'art_w', 'Fade', 4000, 45)",
  ).run();
  await env.DB.prepare("INSERT OR IGNORE INTO clients (id, phone) VALUES ('cl_w', '+233240000030')").run();
  await env.DB.prepare(
    `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status)
     VALUES ('bk_w', 'art_w', 'cl_w', 'svc_w', 'Fade', 4000, 45, 1000, ?, 'locked')`,
  )
    .bind(startsAt)
    .run();
}

describe("GET /api/webhooks/whatsapp (Meta verification)", () => {
  test("echoes hub.challenge when verify token matches", async () => {
    const res = await app.request(
      "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=test_verify&hub.challenge=12345",
      {},
      env,
    );
    expect(res.status).toBe(200);
    expect(await res.text()).toBe("12345");
  });

  test("rejects wrong verify token", async () => {
    const res = await app.request(
      "/api/webhooks/whatsapp?hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=12345",
      {},
      env,
    );
    expect(res.status).toBe(403);
  });
});

function inboundPayload(messages: unknown[] = [], statuses: unknown[] = []) {
  return JSON.stringify({
    entry: [{ changes: [{ value: { messages, statuses } }] }],
  });
}

function postWebhook(body: string) {
  return app.request(
    "/api/webhooks/whatsapp",
    { method: "POST", body, headers: { "content-type": "application/json" } },
    env,
  );
}

describe("POST /api/webhooks/whatsapp", () => {
  beforeEach(() => seedBooking(new Date(Date.now() + 3 * 3600_000).toISOString()));

  test("delivery status updates message_log", async () => {
    await env.DB.prepare(
      "INSERT INTO message_log (id, recipient, template, wa_message_id, status) VALUES ('msg_s', '+233240000030', 'wa_reminder_2h', 'wamid.s1', 'sent')",
    ).run();

    const res = await postWebhook(
      inboundPayload([], [{ id: "wamid.s1", status: "delivered", recipient_id: "233240000030" }]),
    );
    expect(res.status).toBe(200);

    const row = await env.DB.prepare("SELECT status FROM message_log WHERE id = 'msg_s'").first();
    expect(row).toMatchObject({ status: "delivered" });
  });

  test("CANCEL quick-reply cancels the client's upcoming booking", async () => {
    const res = await postWebhook(
      inboundPayload([
        {
          id: "wamid.m1",
          from: "233240000030",
          type: "button",
          button: { payload: "CANCEL:bk_w", text: "Cancel" },
        },
      ]),
    );
    expect(res.status).toBe(200);
    const booking = await env.DB.prepare("SELECT status FROM bookings WHERE id = 'bk_w'").first();
    expect(booking).toMatchObject({ status: "cancelled_by_client" });
  });

  test("CANCEL inside 2 hours does not cancel (deposit committed)", async () => {
    await env.DB.prepare("UPDATE bookings SET starts_at = ? WHERE id = 'bk_w'")
      .bind(new Date(Date.now() + 30 * 60_000).toISOString())
      .run();
    await postWebhook(
      inboundPayload([
        { id: "wamid.m2", from: "233240000030", type: "button", button: { payload: "CANCEL:bk_w", text: "Cancel" } },
      ]),
    );
    const booking = await env.DB.prepare("SELECT status FROM bookings WHERE id = 'bk_w'").first();
    expect(booking).toMatchObject({ status: "locked" });
  });

  test("duplicate message id processes once", async () => {
    const body = inboundPayload([
      { id: "wamid.dup", from: "233240000030", type: "button", button: { payload: "CANCEL:bk_w", text: "Cancel" } },
    ]);
    await postWebhook(body);
    // restore so a second processing would visibly re-cancel
    await env.DB.prepare("UPDATE bookings SET status = 'locked' WHERE id = 'bk_w'").run();
    await postWebhook(body);
    const booking = await env.DB.prepare("SELECT status FROM bookings WHERE id = 'bk_w'").first();
    expect(booking).toMatchObject({ status: "locked" }); // second delivery ignored
  });
});

describe("deliverTemplate (queue consumer path)", () => {
  test("dev mode without WA_ACCESS_TOKEN marks the log row sent", async () => {
    await env.DB.prepare(
      "INSERT INTO message_log (id, recipient, template, status) VALUES ('msg_d', '+233240000030', 'wa_otp', 'queued')",
    ).run();
    await deliverTemplate(
      { kind: "whatsapp_template", template: "wa_otp", language: "en", recipient: "+233240000030", params: ["123456"], log_id: "msg_d" },
      env,
    );
    const row = await env.DB.prepare("SELECT status FROM message_log WHERE id = 'msg_d'").first();
    expect(row).toMatchObject({ status: "sent" });
  });

  test("with credentials it calls the Graph API and stores wa_message_id", async () => {
    const authedEnv = { ...env, WA_ACCESS_TOKEN: "token_x", WA_PHONE_NUMBER_ID: "12345" };
    await enqueueTemplate(authedEnv, {
      template: "wa_otp",
      language: "en",
      recipient: "+233240000031",
      params: ["654321"],
    });
    const queued = await env.DB.prepare(
      "SELECT id FROM message_log WHERE recipient = '+233240000031' AND status = 'queued'",
    ).first<{ id: string }>();
    expect(queued).not.toBeNull();

    fetchMock
      .get("https://graph.facebook.com")
      .intercept({ path: "/v21.0/12345/messages", method: "POST" })
      .reply(200, JSON.stringify({ messages: [{ id: "wamid.out1" }] }), {
        headers: { "content-type": "application/json" },
      });

    await deliverTemplate(
      { kind: "whatsapp_template", template: "wa_otp", language: "en", recipient: "+233240000031", params: ["654321"], log_id: queued!.id },
      authedEnv,
    );
    const row = await env.DB.prepare("SELECT status, wa_message_id FROM message_log WHERE id = ?")
      .bind(queued!.id)
      .first();
    expect(row).toMatchObject({ status: "sent", wa_message_id: "wamid.out1" });
  });
});
