import { Hono } from "hono";
import type { AppEnv } from "../env";

/** Serves portfolio photos from R2 with long-lived caching (keys are content-addressed-ish). */
export const media = new Hono<AppEnv>();

media.get("/*", async (c) => {
  const key = c.req.path.replace(/^\/media\//, "");
  if (!key || key.includes("..")) return c.notFound();

  const obj = await c.env.MEDIA.get(key);
  if (!obj) return c.notFound();

  return new Response(obj.body, {
    headers: {
      "content-type": obj.httpMetadata?.contentType ?? "image/jpeg",
      "cache-control": "public, max-age=31536000, immutable",
      etag: obj.httpEtag,
    },
  });
});
