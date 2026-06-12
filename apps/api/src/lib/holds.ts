import { nanoid } from "nanoid";
import type { Bindings } from "../env";

export const HOLD_TTL_S = 900; // 15 minutes
const MAX_HOLDS_PER_PHONE = 2;

export interface HoldRecord {
  token: string;
  artisan_id: string;
  service_id: string;
  date: string; // YYYY-MM-DD Accra-local
  slot: number; // minutes from midnight
  phone: string; // E.164
  client_name?: string;
  price: number; // pesewas, denormalized at hold time
  duration_min: number;
  service_name: string;
  deposit: number; // pesewas
  expires_at: string; // UTC ISO
}

export function holdKey(artisanId: string, date: string, slot: number): string {
  return `hold:${artisanId}:${date}:${slot}`;
}

export function holdTokenKey(token: string): string {
  return `holdtok:${token}`;
}

function countKey(phone: string): string {
  return `holdcount:${phone}`;
}

export type HoldFailure = "slot_taken" | "too_many_holds";

export async function createHold(
  env: Bindings,
  data: Omit<HoldRecord, "token" | "expires_at">,
): Promise<{ ok: true; hold: HoldRecord } | { ok: false; reason: HoldFailure }> {
  const key = holdKey(data.artisan_id, data.date, data.slot);
  if (await env.KV.get(key)) return { ok: false, reason: "slot_taken" };

  // Anti-gaming: max 2 concurrent holds per client phone (PRD risk table).
  const count = Number((await env.KV.get(countKey(data.phone))) ?? "0");
  if (count >= MAX_HOLDS_PER_PHONE) return { ok: false, reason: "too_many_holds" };

  const hold: HoldRecord = {
    ...data,
    token: `hld_${nanoid(16)}`,
    expires_at: new Date(Date.now() + HOLD_TTL_S * 1000).toISOString(),
  };

  await env.KV.put(key, JSON.stringify(hold), { expirationTtl: HOLD_TTL_S });
  await env.KV.put(holdTokenKey(hold.token), key, { expirationTtl: HOLD_TTL_S });
  await env.KV.put(countKey(data.phone), String(count + 1), { expirationTtl: HOLD_TTL_S });
  return { ok: true, hold };
}

/**
 * Manual transfers take longer than a MoMo prompt — extend the hold so the
 * client has time to send money and the artisan time to confirm.
 */
export async function extendHold(env: Bindings, hold: HoldRecord, ttlSeconds: number): Promise<HoldRecord> {
  const extended: HoldRecord = {
    ...hold,
    expires_at: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
  };
  const key = holdKey(hold.artisan_id, hold.date, hold.slot);
  await env.KV.put(key, JSON.stringify(extended), { expirationTtl: ttlSeconds });
  await env.KV.put(holdTokenKey(hold.token), key, { expirationTtl: ttlSeconds });
  return extended;
}

export async function getHoldByToken(env: Bindings, token: string): Promise<HoldRecord | null> {
  const key = await env.KV.get(holdTokenKey(token));
  if (!key) return null;
  const raw = await env.KV.get(key);
  return raw ? (JSON.parse(raw) as HoldRecord) : null;
}

/** Consume a hold after payment lands (or release on cancel). */
export async function deleteHold(env: Bindings, hold: HoldRecord): Promise<void> {
  await env.KV.delete(holdKey(hold.artisan_id, hold.date, hold.slot));
  await env.KV.delete(holdTokenKey(hold.token));
}

/** Live held slot-starts for one artisan-day (availability subtraction). */
export async function heldSlots(env: Bindings, artisanId: string, date: string): Promise<number[]> {
  const prefix = `hold:${artisanId}:${date}:`;
  const list = await env.KV.list({ prefix });
  return list.keys.map((k) => Number(k.name.slice(prefix.length))).filter((n) => Number.isFinite(n));
}
