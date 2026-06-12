import { accraDateOf } from "@krado/shared";
import { nanoid } from "nanoid";
import type { Bindings } from "../env";

/** Median of day-gaps between consecutive visits. Even count → mean of middle two. */
export function medianGapDays(gaps: number[]): number {
  const sorted = [...gaps].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 1 ? sorted[mid]! : Math.round((sorted[mid - 1]! + sorted[mid]!) / 2);
}

/**
 * Nightly (20:00 UTC): for each artisan-client pair with ≥2 completed visits,
 * compute the visit cycle (median gap). If the client is overdue, insert a
 * pending nudge for the artisan to approve — v1 never messages clients
 * autonomously.
 */
export async function computeNudges(env: Bindings): Promise<void> {
  const { results: visits } = await env.DB.prepare(
    `SELECT artisan_id, client_id, starts_at FROM bookings
     WHERE status = 'completed'
     ORDER BY artisan_id, client_id, starts_at`,
  ).all<{ artisan_id: string; client_id: string; starts_at: string }>();

  const byPair = new Map<string, { artisan_id: string; client_id: string; dates: number[] }>();
  for (const v of visits) {
    const key = `${v.artisan_id}|${v.client_id}`;
    const entry = byPair.get(key) ?? { artisan_id: v.artisan_id, client_id: v.client_id, dates: [] };
    entry.dates.push(new Date(v.starts_at).getTime());
    byPair.set(key, entry);
  }

  const today = accraDateOf(new Date().toISOString());
  const now = Date.now();

  for (const { artisan_id, client_id, dates } of byPair.values()) {
    if (dates.length < 2) continue;

    const gaps: number[] = [];
    for (let i = 1; i < dates.length; i++) {
      gaps.push(Math.round((dates[i]! - dates[i - 1]!) / 86_400_000));
    }
    const cycle = medianGapDays(gaps);
    if (cycle < 1) continue;

    const daysSinceLast = Math.floor((now - dates[dates.length - 1]!) / 86_400_000);
    if (daysSinceLast < cycle) continue;

    // Unique on (artisan, client, due_since): one nudge per day max,
    // re-runs are no-ops.
    await env.DB.prepare(
      `INSERT OR IGNORE INTO nudges (id, artisan_id, client_id, cycle_days, due_since)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(`ndg_${nanoid(12)}`, artisan_id, client_id, cycle, today)
      .run();
  }
}
