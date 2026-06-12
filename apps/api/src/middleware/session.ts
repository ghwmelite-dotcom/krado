import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";

const SESSION_TTL_S = 30 * 24 * 60 * 60; // 30 days, rolling

export function sessionKey(token: string): string {
  return `sess:${token}`;
}

export const SESSION_TTL_SECONDS = SESSION_TTL_S;

/** Bearer-token session middleware. Sets c.var.artisanId; rolls the TTL. */
export const requireSession: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ error: "unauthorized" }, 401);

  const artisanId = await c.env.KV.get(sessionKey(token));
  if (!artisanId) return c.json({ error: "unauthorized" }, 401);

  // Rolling 30-day session
  await c.env.KV.put(sessionKey(token), artisanId, { expirationTtl: SESSION_TTL_S });
  c.set("artisanId", artisanId);
  await next();
};
