import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";
import { sendReminders } from "../src/jobs/reminders";
import { computeNudges, medianGapDays } from "../src/jobs/nudges";
import { susuSweep } from "../src/jobs/susu";

const TOKEN = "test-session-token-cron-12345678901";

async function seedArtisan() {
  await env.DB.prepare(
    `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json, susu_mode, susu_value)
     VALUES ('art_c', 'nana', 'Nana', 'Nana Trims', 'Dansoman', '+233244000666', '+233244000666', '{}', 'flat', 500)`,
  ).run();
  await env.DB.prepare("INSERT OR IGNORE INTO clients (id, phone, name) VALUES ('cl_c', '+233240000050', 'Akosua')").run();
  await env.DB.prepare(
    "INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min) VALUES ('svc_c', 'art_c', 'Trim', 2500, 30)",
  ).run();
  await env.KV.put(`sess:${TOKEN}`, "art_c", { expirationTtl: 3600 });
}

let seq = 0;
async function insertBooking(startsAt: string, status: string): Promise<string> {
  const id = `bk_c${++seq}_${Math.random().toString(36).slice(2, 8)}`;
  await env.DB.prepare(
    `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, starts_at, status)
     VALUES (?, 'art_c', 'cl_c', 'svc_c', 'Trim', 2500, 30, 625, ?, ?)`,
  )
    .bind(id, startsAt, status)
    .run();
  return id;
}

function inMinutes(min: number): string {
  return new Date(Date.now() + min * 60_000).toISOString();
}

function daysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString();
}

describe("reminders cron", () => {
  beforeEach(seedArtisan);

  test("reminds bookings starting in ~2h, exactly once, and skips far-future ones", async () => {
    const soon = await insertBooking(inMinutes(120), "locked");
    await insertBooking(inMinutes(240), "locked");

    await sendReminders(env);
    await sendReminders(env); // second run must not duplicate

    const { results } = await env.DB.prepare(
      "SELECT booking_id FROM message_log WHERE template = 'wa_reminder_2h'",
    ).all<{ booking_id: string }>();
    expect(results).toHaveLength(1);
    expect(results[0]!.booking_id).toBe(soon);
  });
});

describe("nudge engine", () => {
  beforeEach(seedArtisan);

  test("medianGapDays", () => {
    expect(medianGapDays([21])).toBe(21);
    expect(medianGapDays([14, 21, 28])).toBe(21);
    expect(medianGapDays([14, 28])).toBe(21);
  });

  test("client overdue on their cycle gets one pending nudge", async () => {
    // Visits 46, 25 and 4+21=25-gap pattern: gaps of 21 days, last visit 25 days ago
    await insertBooking(daysAgo(67), "completed");
    await insertBooking(daysAgo(46), "completed");
    await insertBooking(daysAgo(25), "completed");

    await computeNudges(env);
    await computeNudges(env); // idempotent per (artisan, client, due_since)

    const { results } = await env.DB.prepare(
      "SELECT cycle_days, status FROM nudges WHERE artisan_id = 'art_c' AND client_id = 'cl_c'",
    ).all<{ cycle_days: number; status: string }>();
    expect(results).toHaveLength(1);
    expect(results[0]).toMatchObject({ cycle_days: 21, status: "pending" });
  });

  test("a single visit is never enough for a nudge", async () => {
    await insertBooking(daysAgo(40), "completed");
    await computeNudges(env);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM nudges").first<{ n: number }>();
    expect(n!.n).toBe(0);
  });

  test("client within their cycle is not nudged", async () => {
    await insertBooking(daysAgo(31), "completed");
    await insertBooking(daysAgo(10), "completed"); // cycle 21, only 10 days gone
    await computeNudges(env);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM nudges").first<{ n: number }>();
    expect(n!.n).toBe(0);
  });
});

describe("nudge approval routes (artisan always in the loop)", () => {
  beforeEach(async () => {
    await seedArtisan();
    await env.DB.prepare(
      "INSERT INTO nudges (id, artisan_id, client_id, cycle_days, due_since) VALUES ('ndg_1', 'art_c', 'cl_c', 21, '2026-06-01')",
    ).run();
  });

  test("one tap sends the rebook template with the booking link", async () => {
    const res = await app.request(
      "/api/nudges/ndg_1/action",
      {
        method: "POST",
        body: JSON.stringify({ action: "send" }),
        headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      },
      env,
    );
    expect(res.status).toBe(200);

    const nudge = await env.DB.prepare("SELECT status FROM nudges WHERE id = 'ndg_1'").first();
    expect(nudge).toMatchObject({ status: "sent" });

    const msg = await env.DB.prepare(
      "SELECT recipient FROM message_log WHERE template = 'wa_rebook_nudge'",
    ).first();
    expect(msg).toMatchObject({ recipient: "+233240000050" });
  });

  test("one tap dismisses", async () => {
    const res = await app.request(
      "/api/nudges/ndg_1/action",
      {
        method: "POST",
        body: JSON.stringify({ action: "dismiss" }),
        headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
      },
      env,
    );
    expect(res.status).toBe(200);
    const nudge = await env.DB.prepare("SELECT status FROM nudges WHERE id = 'ndg_1'").first();
    expect(nudge).toMatchObject({ status: "dismissed" });
  });
});

describe("susu sweep", () => {
  beforeEach(seedArtisan);

  test("backstops missing ledger rows for today's completed bookings, idempotently", async () => {
    const id = await insertBooking(new Date().toISOString(), "completed");

    await susuSweep(env);
    await susuSweep(env);

    const { results } = await env.DB.prepare("SELECT amount FROM susu_ledger WHERE booking_id = ?")
      .bind(id)
      .all<{ amount: number }>();
    expect(results).toHaveLength(1);
    expect(results[0]!.amount).toBe(500);
  });
});
