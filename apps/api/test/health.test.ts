import { describe, expect, test } from "vitest";
import { env } from "cloudflare:test";
import { app } from "../src/index";

describe("GET /api/health", () => {
  test("returns ok", async () => {
    const res = await app.request("/api/health", {}, env);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, service: "krado-api" });
  });

  test("unknown routes return JSON 404", async () => {
    const res = await app.request("/api/nope", {}, env);
    expect(res.status).toBe(404);
  });

  test("D1 migration applied — core tables exist", async () => {
    const { results } = await env.DB.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
    ).all<{ name: string }>();
    const names = results.map((r) => r.name);
    for (const t of ["artisans", "services", "clients", "bookings", "payments", "susu_ledger", "nudges", "webhook_events", "message_log"]) {
      expect(names).toContain(t);
    }
  });
});
