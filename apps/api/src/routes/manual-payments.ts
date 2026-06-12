import { Hono } from "hono";
import { nanoid } from "nanoid";
import { z } from "zod";
import type { AppEnv } from "../env";
import { requireSession } from "../middleware/session";
import { getHoldByToken, deleteHold, extendHold, type HoldRecord } from "../lib/holds";
import { lockBooking, slotStillFree } from "../lib/locking";

const MANUAL_HOLD_TTL_S = 3600; // 1 hour to transfer + confirm

const ManualStart = z.object({ method: z.enum(["momo", "bank"]) });

/** Client side: turn a live hold into a pending manual-payment claim. */
export const manualStart = new Hono<AppEnv>();

manualStart.post("/:holdToken/manual", async (c) => {
  const hold = await getHoldByToken(c.env, c.req.param("holdToken"));
  if (!hold) return c.json({ error: "hold_not_found" }, 404);

  const parsed = ManualStart.safeParse(await c.req.json().catch(() => null));
  if (!parsed.success) return c.json({ error: "invalid_input" }, 400);
  const { method } = parsed.data;

  const artisan = await c.env.DB.prepare(
    "SELECT accept_manual, momo_number, bank_details FROM artisans WHERE id = ?",
  )
    .bind(hold.artisan_id)
    .first<{ accept_manual: number; momo_number: string; bank_details: string | null }>();
  if (!artisan?.accept_manual) return c.json({ error: "manual_not_available" }, 403);
  if (method === "bank" && !artisan.bank_details) return c.json({ error: "bank_not_available" }, 403);

  const existing = await c.env.DB.prepare(
    "SELECT id, reference FROM manual_claims WHERE hold_token = ? AND status = 'pending'",
  )
    .bind(hold.token)
    .first<{ id: string; reference: string }>();

  const extended = await extendHold(c.env, hold, MANUAL_HOLD_TTL_S);

  let claimId: string;
  let reference: string;
  if (existing) {
    ({ id: claimId, reference } = existing);
  } else {
    claimId = `mcl_${nanoid(12)}`;
    // Short, human reference the client quotes in the transfer narration so
    // the artisan can match money to slot.
    reference = `KR-${nanoid(6).toUpperCase().replace(/[-_]/g, "X")}`;
    await c.env.DB.prepare(
      `INSERT INTO manual_claims (id, hold_token, artisan_id, phone, method, amount, reference, hold_json)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    )
      .bind(claimId, hold.token, hold.artisan_id, hold.phone, method, hold.deposit, reference, JSON.stringify(extended))
      .run();
  }

  return c.json(
    {
      claim_id: claimId,
      reference,
      amount: hold.deposit,
      method,
      instructions: {
        momo_number: artisan.momo_number,
        bank_details: artisan.bank_details,
      },
      expires_at: extended.expires_at,
    },
    existing ? 200 : 201,
  );
});

/** Artisan side: list and resolve pending claims. */
export const manualClaims = new Hono<AppEnv>();

manualClaims.use("*", requireSession);

manualClaims.get("/", async (c) => {
  const { results } = await c.env.DB.prepare(
    `SELECT id, phone, method, amount, reference, status, created_at, hold_json
     FROM manual_claims WHERE artisan_id = ? AND status = 'pending' ORDER BY created_at`,
  )
    .bind(c.var.artisanId)
    .all<{ hold_json: string } & Record<string, unknown>>();

  const claims = results.map(({ hold_json, ...rest }) => {
    const hold = JSON.parse(hold_json) as HoldRecord;
    return { ...rest, service_name: hold.service_name, date: hold.date, slot: hold.slot, client_name: hold.client_name ?? null };
  });
  return c.json({ claims });
});

manualClaims.post("/:id/confirm", async (c) => {
  const claim = await c.env.DB.prepare(
    "SELECT id, hold_token, method, reference, status, hold_json FROM manual_claims WHERE id = ? AND artisan_id = ?",
  )
    .bind(c.req.param("id"), c.var.artisanId)
    .first<{ id: string; hold_token: string; method: string; reference: string; status: string; hold_json: string }>();
  if (!claim) return c.json({ error: "not_found" }, 404);
  if (claim.status !== "pending") return c.json({ error: "already_resolved" }, 409);

  // Prefer the live KV hold; fall back to the snapshot if the hold expired
  // but the slot is still free (manual transfers can outlive the TTL).
  const hold = (await getHoldByToken(c.env, claim.hold_token)) ?? (JSON.parse(claim.hold_json) as HoldRecord);
  if (!(await slotStillFree(c.env, hold))) {
    await c.env.DB.prepare("UPDATE manual_claims SET status = 'rejected' WHERE id = ?").bind(claim.id).run();
    return c.json({ error: "slot_no_longer_available" }, 409);
  }

  const bookingId = await lockBooking(c.env, hold, {
    provider: "manual",
    reference: claim.reference,
    channel: claim.method,
  });
  await c.env.DB.prepare("UPDATE manual_claims SET status = 'confirmed' WHERE id = ?").bind(claim.id).run();
  return c.json({ ok: true, booking_id: bookingId });
});

manualClaims.post("/:id/reject", async (c) => {
  const claim = await c.env.DB.prepare(
    "SELECT id, hold_token, status, hold_json FROM manual_claims WHERE id = ? AND artisan_id = ?",
  )
    .bind(c.req.param("id"), c.var.artisanId)
    .first<{ id: string; hold_token: string; status: string; hold_json: string }>();
  if (!claim) return c.json({ error: "not_found" }, 404);
  if (claim.status !== "pending") return c.json({ error: "already_resolved" }, 409);

  const hold = (await getHoldByToken(c.env, claim.hold_token)) ?? (JSON.parse(claim.hold_json) as HoldRecord);
  await deleteHold(c.env, hold); // free the slot
  await c.env.DB.prepare("UPDATE manual_claims SET status = 'rejected' WHERE id = ?").bind(claim.id).run();
  return c.json({ ok: true });
});
