import { Hono } from "hono";
import type { AppEnv } from "../env";
import { getHoldByToken } from "../lib/holds";
import { initializeTransaction } from "../lib/paystack";

export const bookingPay = new Hono<AppEnv>();

bookingPay.post("/:holdToken/pay", async (c) => {
  const hold = await getHoldByToken(c.env, c.req.param("holdToken"));
  if (!hold) return c.json({ error: "hold_not_found" }, 404);

  const init = await initializeTransaction(c.env, {
    amountPesewas: hold.deposit,
    phone: hold.phone,
    holdToken: hold.token,
    callbackUrl: `${c.env.APP_BASE_URL}/booked`,
  });

  return c.json({
    authorization_url: init.authorization_url,
    reference: init.reference,
    deposit: hold.deposit,
    expires_at: hold.expires_at,
  });
});
