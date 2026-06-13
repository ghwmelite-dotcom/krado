import type { Bindings } from "../env";

const PAYSTACK_BASE = "https://api.paystack.co";

/** 'initiated' → transfer sent, await webhook; 'pending' → settle manually; 'failed' → retry. */
export type PayoutResult = { status: "initiated" | "pending" | "failed"; detail?: string };

/**
 * Pay an artisan their settled balance to MoMo. Live transfers are gated on
 * PAYSTACK_TRANSFERS_ENABLED (separate from the collection key, and from
 * Paystack's own transfer enablement). Off by default → payouts stay
 * 'pending' for the operator to send by hand and mark paid, so the engine is
 * fully usable before live transfers are wired.
 */
export async function initiatePayout(
  env: Bindings,
  opts: { momo: string; amount: number; reference: string; channel?: string },
): Promise<PayoutResult> {
  if (env.PAYSTACK_TRANSFERS_ENABLED !== "true" || !env.PAYSTACK_SECRET_KEY) {
    console.log("[manual] payout pending settlement", { to: opts.momo, amount: opts.amount, ref: opts.reference });
    return { status: "pending", detail: "transfers_disabled" };
  }

  const auth = { authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`, "content-type": "application/json" };

  const recipientRes = await fetch(`${PAYSTACK_BASE}/transferrecipient`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      type: "mobile_money",
      name: opts.momo,
      account_number: opts.momo.replace("+233", "0"),
      bank_code: opts.channel ?? "MTN",
      currency: "GHS",
    }),
  });
  const recipient = (await recipientRes.json()) as { status: boolean; data?: { recipient_code: string } };
  if (!recipientRes.ok || !recipient.status || !recipient.data) {
    return { status: "failed", detail: "recipient_failed" };
  }

  const transferRes = await fetch(`${PAYSTACK_BASE}/transfer`, {
    method: "POST",
    headers: auth,
    body: JSON.stringify({
      source: "balance",
      amount: opts.amount,
      recipient: recipient.data.recipient_code,
      reference: opts.reference,
      reason: "Krado payout",
    }),
  });
  const transfer = (await transferRes.json()) as { status: boolean; message?: string };
  if (!transferRes.ok || !transfer.status) {
    return { status: "failed", detail: transfer.message ?? "transfer_failed" };
  }
  return { status: "initiated" };
}
