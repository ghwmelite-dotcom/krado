import type { Bindings } from "../env";

const PAYSTACK_BASE = "https://api.paystack.co";

export async function hmacSha512Hex(secret: string, body: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function verifySignature(secret: string, rawBody: string, signature: string | undefined): Promise<boolean> {
  if (!signature) return false;
  const expected = await hmacSha512Hex(secret, rawBody);
  if (expected.length !== signature.length) return false;
  // Constant-time compare
  let diff = 0;
  for (let i = 0; i < expected.length; i++) diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
  return diff === 0;
}

interface PaystackInit {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export async function initializeTransaction(
  env: Bindings,
  opts: { amountPesewas: number; phone: string; holdToken: string; callbackUrl: string },
): Promise<PaystackInit> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      // Paystack requires an email; clients are phone-first, so derive one.
      email: `${opts.phone.replace("+", "")}@clients.krado.app`,
      amount: opts.amountPesewas, // pesewas == Paystack GHS subunit
      currency: "GHS",
      channels: ["mobile_money"],
      callback_url: opts.callbackUrl,
      metadata: { hold_token: opts.holdToken },
    }),
  });
  const body = (await res.json()) as { status: boolean; message?: string; data?: PaystackInit };
  if (!res.ok || !body.status || !body.data) {
    throw new Error(`paystack initialize failed: ${body.message ?? res.status}`);
  }
  return body.data;
}

export interface VerifiedTransaction {
  reference: string;
  amount: number;
  status: string;
  channel?: string;
  raw: string;
}

/** Webhook is the only truth — and even then we re-verify against the API. */
export async function verifyTransaction(env: Bindings, reference: string): Promise<VerifiedTransaction> {
  const res = await fetch(`${PAYSTACK_BASE}/transaction/verify/${reference}`, {
    headers: { authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}` },
  });
  const raw = await res.text();
  const body = JSON.parse(raw) as {
    status: boolean;
    data?: { reference: string; amount: number; status: string; channel?: string };
  };
  if (!res.ok || !body.status || !body.data) throw new Error(`paystack verify failed for ${reference}`);
  return { ...body.data, raw };
}

export async function refundTransaction(env: Bindings, reference: string): Promise<void> {
  const res = await fetch(`${PAYSTACK_BASE}/refund`, {
    method: "POST",
    headers: {
      authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ transaction: reference }),
  });
  const body = (await res.json()) as { status: boolean; message?: string };
  if (!res.ok || !body.status) throw new Error(`paystack refund failed: ${body.message ?? res.status}`);
}
