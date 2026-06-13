import { beforeEach, describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";

describe("SSR public booking page", () => {
  beforeEach(async () => {
    await env.DB.prepare(
      `INSERT OR IGNORE INTO artisans (id, handle, name, shop_name, area, phone, momo_number, hours_json, accept_manual)
       VALUES ('art_s', 'kojo-ssr', 'Kojo', "Kojo's Cuts", 'Madina, Accra', '+233244000888', '+233244000888', '{}', 1)`,
    ).run();
    await env.DB.prepare(
      "INSERT OR IGNORE INTO services (id, artisan_id, name, price, duration_min) VALUES ('svc_s', 'art_s', 'Low fade', 4000, 45)",
    ).run();
  });

  test("renders shop, services, prices and trust microcopy server-side", async () => {
    const res = await app.request("/kojo-ssr", {}, env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Kojo&#39;s Cuts");
    expect(html).toContain("Low fade");
    expect(html).toContain("45 min · GHS 40.00");
    expect(html).toContain("Deposit counts toward your cut.");
    expect(html).toContain("class=\"kente\""); // brand strip
    expect(html).toContain("Pay direct to MoMo"); // manual enabled
  });

  test("unknown handle 404s; API routes are not shadowed", async () => {
    expect((await app.request("/nobody-here", {}, env)).status).toBe(404);
    expect((await app.request("/api/health", {}, env)).status).toBe(200);
  });

  test("root landing page renders with CTAs", async () => {
    const res = await app.request("/", {}, env);
    expect(res.status).toBe(200);
    const html = await res.text();
    expect(html).toContain("Lock your slot");
    expect(html).toContain("/app/onboarding");
  });

  test("booked confirmation page renders", async () => {
    const res = await app.request("/booked", {}, env);
    expect(res.status).toBe(200);
    expect(await res.text()).toContain("Slot locked");
  });
});
