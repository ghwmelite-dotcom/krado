import { nanoid } from "nanoid";
import { settlementNet, type SettlementReason } from "@krado/shared";
import type { Bindings } from "../env";
import { initiatePayout } from "./payouts";

/** Below this, leave the balance to accumulate rather than make a dust payout. */
export const MIN_PAYOUT_PESEWAS = 100; // GHS 1

interface AccrualRow {
  id: string;
  artisan_id: string;
  deposit: number;
  krado_fee: number;
  status: SettlementReason;
}

/**
 * Accrue settlement entries for completed/no-show bookings whose deposit Krado
 * actually collected (provider 'paystack') and that aren't yet accrued.
 * Idempotent via settlement_entries.booking_id UNIQUE. Manual-paid bookings
 * are skipped — the client paid the artisan directly, so Krado owes nothing.
 */
export async function accruePending(env: Bindings): Promise<number> {
  const { results } = await env.DB.prepare(
    `SELECT b.id, b.artisan_id, b.deposit, b.krado_fee, b.status
     FROM bookings b
     JOIN payments p ON p.booking_id = b.id AND p.kind = 'deposit' AND p.status = 'success'
     WHERE b.status IN ('completed','no_show')
       AND p.provider = 'paystack'
       AND NOT EXISTS (SELECT 1 FROM settlement_entries s WHERE s.booking_id = b.id)`,
  ).all<AccrualRow>();

  for (const b of results) {
    const { gross, fee, net } = settlementNet(b.deposit, b.krado_fee, b.status);
    await env.DB.prepare(
      `INSERT OR IGNORE INTO settlement_entries (id, artisan_id, booking_id, gross, fee, net, reason)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(`set_${nanoid(12)}`, b.artisan_id, b.id, gross, fee, net, b.status)
      .run();
  }
  return results.length;
}

/** Unpaid balance owed to one artisan. */
export async function artisanBalance(env: Bindings, artisanId: string): Promise<number> {
  const row = await env.DB.prepare(
    "SELECT COALESCE(SUM(net),0) AS bal FROM settlement_entries WHERE artisan_id = ? AND payout_id IS NULL",
  )
    .bind(artisanId)
    .first<{ bal: number }>();
  return row?.bal ?? 0;
}

/**
 * Settlement run: accrue anything pending, then for each artisan over the
 * minimum, batch their unpaid entries into a payout, attach them, and attempt
 * the transfer. Payouts stay 'pending' until the transfer webhook confirms
 * (or the operator marks them paid). Safe to re-run — entries are only ever in
 * one payout, and the payout reference is unique.
 */
export async function runPayouts(env: Bindings): Promise<{ payouts: number; total: number }> {
  await accruePending(env);

  const { results: owed } = await env.DB.prepare(
    `SELECT s.artisan_id, SUM(s.net) AS bal, a.momo_number
     FROM settlement_entries s JOIN artisans a ON a.id = s.artisan_id
     WHERE s.payout_id IS NULL
     GROUP BY s.artisan_id
     HAVING bal >= ?`,
  )
    .bind(MIN_PAYOUT_PESEWAS)
    .all<{ artisan_id: string; bal: number; momo_number: string }>();

  let total = 0;
  for (const o of owed) {
    const payoutId = `po_${nanoid(12)}`;
    const reference = `KPO-${nanoid(14).toUpperCase().replace(/[-_]/g, "X")}`;

    // Claim this artisan's currently-unpaid entries for this payout.
    await env.DB.prepare(
      "INSERT INTO payouts (id, artisan_id, amount, momo_number, reference, status) VALUES (?, ?, ?, ?, ?, 'pending')",
    )
      .bind(payoutId, o.artisan_id, o.bal, o.momo_number, reference)
      .run();
    await env.DB.prepare(
      "UPDATE settlement_entries SET payout_id = ? WHERE artisan_id = ? AND payout_id IS NULL",
    )
      .bind(payoutId, o.artisan_id)
      .run();

    const result = await initiatePayout(env, { momo: o.momo_number, amount: o.bal, reference });
    if (result.status === "failed") {
      // A real attempt failed — release the entries so the next run retries.
      await env.DB.prepare("UPDATE settlement_entries SET payout_id = NULL WHERE payout_id = ?")
        .bind(payoutId)
        .run();
      await env.DB.prepare("UPDATE payouts SET status = 'failed', failure = ? WHERE id = ?")
        .bind(result.detail ?? "failed", payoutId)
        .run();
      continue;
    }
    // 'initiated' (await webhook) and 'pending' (manual) both leave the payout pending.
    total += o.bal;
  }
  return { payouts: owed.length, total };
}

/** Mark a payout settled — by the transfer webhook, or manually by an operator. */
export async function markPayoutPaid(env: Bindings, payoutId: string): Promise<boolean> {
  const res = await env.DB.prepare(
    "UPDATE payouts SET status = 'paid', settled_at = datetime('now') WHERE id = ? AND status != 'paid'",
  )
    .bind(payoutId)
    .run();
  return res.meta.changes > 0;
}

/** Transfer failed/reversed — release its entries to be retried next run. */
export async function markPayoutFailed(env: Bindings, payoutId: string, failure: string): Promise<void> {
  await env.DB.prepare("UPDATE settlement_entries SET payout_id = NULL WHERE payout_id = ?")
    .bind(payoutId)
    .run();
  await env.DB.prepare("UPDATE payouts SET status = 'failed', failure = ? WHERE id = ?")
    .bind(failure, payoutId)
    .run();
}
