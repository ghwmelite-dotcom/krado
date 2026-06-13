import { accraDateOf } from "@krado/shared";
import type { Bindings } from "../env";

/**
 * Increment a daily funnel counter. Best-effort — a metrics failure must never
 * block a booking, so errors are swallowed.
 */
export async function bumpCounter(env: Bindings, name: "holds_created" | "holds_locked"): Promise<void> {
  try {
    const day = accraDateOf(new Date().toISOString());
    await env.DB.prepare(
      `INSERT INTO metric_counters (day, name, count) VALUES (?, ?, 1)
       ON CONFLICT(day, name) DO UPDATE SET count = count + 1`,
    )
      .bind(day, name)
      .run();
  } catch (err) {
    console.warn("metric bump failed", { name, err: (err as Error).message });
  }
}
