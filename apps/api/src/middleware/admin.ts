import type { MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";

const ADMIN_TTL_S = 7 * 24 * 60 * 60; // 7 days, rolling

export const ADMIN_TTL_SECONDS = ADMIN_TTL_S;

export function adminKey(token: string): string {
  return `adminsess:${token}`;
}

/** Operator console auth — fully separate from artisan phone+PIN sessions. */
export const requireAdmin: MiddlewareHandler<AppEnv> = async (c, next) => {
  const header = c.req.header("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return c.json({ error: "unauthorized" }, 401);

  const ok = await c.env.KV.get(adminKey(token));
  if (!ok) return c.json({ error: "unauthorized" }, 401);

  await c.env.KV.put(adminKey(token), "1", { expirationTtl: ADMIN_TTL_S });
  await next();
};
