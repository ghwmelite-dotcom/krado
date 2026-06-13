import { Hono } from "hono";
import type { AppEnv, Bindings, QueueMessage } from "./env";

import { auth, me } from "./routes/auth";
import { onboard } from "./routes/onboard";
import { artisan } from "./routes/artisan";
import { bookingPublic } from "./routes/booking-public";
import { bookingPay } from "./routes/booking-pay";
import { paystackWebhook } from "./routes/webhooks-paystack";
import { bookings } from "./routes/bookings";
import { telegramWebhook } from "./routes/webhooks-telegram";
import { manualStart, manualClaims } from "./routes/manual-payments";
import { nudges } from "./routes/nudges";
import { dashboard } from "./routes/dashboard";
import { publicPage } from "./routes/public-page";
import { media } from "./routes/media";

const app = new Hono<AppEnv>();

app.get("/api/health", (c) => c.json({ ok: true, service: "krado-api" }));
app.route("/api/auth", auth);
app.route("/api/me", me);
app.route("/api/onboard", onboard);
app.route("/api/artisan", artisan);
app.route("/api/p", bookingPublic);
app.route("/api/bookings", bookingPay);
app.route("/api/bookings", bookings);
app.route("/api/bookings", manualStart);
app.route("/api/manual-claims", manualClaims);
app.route("/api/nudges", nudges);
app.route("/api/dashboard", dashboard);
app.route("/media", media);
// SPA fallback: deep links like /app/bookings have no asset file — serve the
// PWA shell and let the client router take over.
app.get("/app/*", async (c) => {
  if (!c.env.ASSETS) return c.notFound();
  return c.env.ASSETS.fetch(new Request(new URL("/app/index.html", c.req.url)));
});
// Registered last: /:handle catches everything that isn't /api, /media or a static asset.
app.route("/", publicPage);
app.route("/api/webhooks/paystack", paystackWebhook);
app.route("/api/webhooks/telegram", telegramWebhook);

app.onError((err, c) => {
  console.error("unhandled", { path: c.req.path, message: (err as Error).message });
  return c.json({ error: "internal_error" }, 500);
});

app.notFound((c) => c.json({ error: "not_found" }, 404));

export default {
  fetch: app.fetch,
  async scheduled(event: ScheduledController, env: Bindings, ctx: ExecutionContext): Promise<void> {
    const { runCron } = await import("./cron");
    ctx.waitUntil(runCron(event.cron, env));
  },
  async queue(batch: MessageBatch<QueueMessage>, env: Bindings): Promise<void> {
    const { consumeMessages } = await import("./queue");
    await consumeMessages(batch, env);
  },
};

export { app };
