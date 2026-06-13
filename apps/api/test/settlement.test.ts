import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { accruePending, artisanBalance, runPayouts, MIN_PAYOUT_PESEWAS } from "../src/lib/settlement";

let seq = 0;
async function booking(opts: {
  status: "completed" | "no_show" | "locked";
  deposit: number;
  fee?: number;
  provider?: "paystack" | "manual";
}): Promise<string> {
  const id = `bk_s${++seq}`;
  await env.DB.prepare(
    `INSERT INTO bookings (id, artisan_id, client_id, service_id, service_name, price, duration_min, deposit, krado_fee, starts_at, status)
     VALUES (?, 'art_s', 'cl_s', 'svc_s', 'Fade', 4000, 45, ?, ?, '2026-01-01T10:00:00.000Z', ?)`,
  )
    .bind(id, opts.deposit, opts.fee ?? 0, opts.status)
    .run();
  await env.DB.prepare(
    "INSERT INTO payments (id, booking_id, provider, reference, kind, amount, status) VALUES (?, ?, ?, ?, 'deposit', ?, 'success')",
  )
    .bind(`pay_${id}`, id, opts.provider ?? "paystack", `ref_${id}`, opts.deposit)
    .run();
  return id;
}

describe("settlement engine", () => {
  beforeEach(async () => {
    await env.DB.prepare(
      `INSERT OR REPLACE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json)
       VALUES ('art_s','kojo','Kojo','Kojo Cuts','Madina','+233244000111','+233244000111','{}')`,
    ).run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min) VALUES ('svc_s','art_s','Fade',4000,45)",
    ).run();
    await env.DB.prepare("INSERT OR IGNORE INTO clients (id, phone) VALUES ('cl_s','+233240000050')").run();
  });

  test("accrues completed (deposit − fee) and no_show (full deposit, fee waived)", async () => {
    await booking({ status: "completed", deposit: 1000, fee: 100 });
    await booking({ status: "no_show", deposit: 1000, fee: 100 });
    await accruePending(env);

    const { results } = await env.DB.prepare(
      "SELECT reason, gross, fee, net FROM settlement_entries WHERE artisan_id = 'art_s' ORDER BY reason",
    ).all<{ reason: string; gross: number; fee: number; net: number }>();
    expect(results).toEqual([
      { reason: "completed", gross: 1000, fee: 100, net: 900 },
      { reason: "no_show", gross: 1000, fee: 0, net: 1000 },
    ]);
    expect(await artisanBalance(env, "art_s")).toBe(1900);
  });

  test("manual-paid bookings never accrue — Krado never held that money", async () => {
    await booking({ status: "completed", deposit: 1000, fee: 100, provider: "manual" });
    await accruePending(env);
    expect(await artisanBalance(env, "art_s")).toBe(0);
  });

  test("locked (incomplete) bookings do not accrue", async () => {
    await booking({ status: "locked", deposit: 1000 });
    await accruePending(env);
    expect(await artisanBalance(env, "art_s")).toBe(0);
  });

  test("accrual is idempotent across repeated runs", async () => {
    await booking({ status: "completed", deposit: 1000, fee: 100 });
    await accruePending(env);
    await accruePending(env);
    const n = await env.DB.prepare("SELECT COUNT(*) AS n FROM settlement_entries WHERE artisan_id = 'art_s'").first<{
      n: number;
    }>();
    expect(n!.n).toBe(1);
  });

  test("a payout run batches the balance, attaches entries, and zeroes it", async () => {
    await booking({ status: "completed", deposit: 1000, fee: 100 });
    await booking({ status: "completed", deposit: 4000, fee: 100 });
    const result = await runPayouts(env);
    expect(result.payouts).toBe(1);
    expect(result.total).toBe(900 + 3900);

    // Balance cleared; one pending payout for the artisan.
    expect(await artisanBalance(env, "art_s")).toBe(0);
    const payout = await env.DB.prepare("SELECT amount, status FROM payouts WHERE artisan_id = 'art_s'").first<{
      amount: number;
      status: string;
    }>();
    expect(payout).toMatchObject({ amount: 4800, status: "pending" }); // pending: manual/webhook settlement

    // Re-running doesn't double-pay.
    const again = await runPayouts(env);
    expect(again.payouts).toBe(0);
  });

  test("balances below the minimum payout are left to accumulate", async () => {
    await booking({ status: "completed", deposit: MIN_PAYOUT_PESEWAS - 1, fee: 0 });
    const result = await runPayouts(env);
    expect(result.payouts).toBe(0);
    expect(await artisanBalance(env, "art_s")).toBe(MIN_PAYOUT_PESEWAS - 1);
  });
});
