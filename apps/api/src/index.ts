import { Hono } from "hono";
import type { AppEnv, Bindings, QueueMessage } from "./env";

import { auth, me } from "./routes/auth";
import { onboard } from "./routes/onboard";
import { artisan } from "./routes/artisan";
import { bookingPublic } from "./routes/booking-public";
import { bookingPay } from "./routes/booking-pay";
import { paystackWebhook } from "./routes/webhooks-paystack";

const app = new Hono<AppEnv>();

app.get("/api/health", (c) => c.json({ ok: true, service: "krado-api" }));
app.route("/api/auth", auth);
app.route("/api/me", me);
app.route("/api/onboard", onboard);
app.route("/api/artisan", artisan);
app.route("/api/p", bookingPublic);
app.route("/api/bookings", bookingPay);
app.route("/api/webhooks/paystack", paystackWebhook);

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
