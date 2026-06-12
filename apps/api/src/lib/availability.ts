import { accraDateOf, accraMinutesOf, slotsForDay, type Hours } from "@krado/shared";
import type { Bindings } from "../env";
import { heldSlots } from "./holds";

const DAY_KEYS = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;

export function hoursForDate(hoursJson: string, date: string): [number, number] | null {
  const hours = JSON.parse(hoursJson) as Partial<Hours>;
  const day = DAY_KEYS[new Date(`${date}T00:00:00Z`).getUTCDay()]!;
  return (hours[day] as [number, number] | null | undefined) ?? null;
}

export async function lockedRanges(
  env: Bindings,
  artisanId: string,
  date: string,
): Promise<Array<[number, number]>> {
  const { results } = await env.DB.prepare(
    `SELECT starts_at, duration_min FROM bookings
     WHERE artisan_id = ? AND status = 'locked' AND starts_at >= ? AND starts_at < ?`,
  )
    .bind(artisanId, `${date}T00:00:00.000Z`, `${date}T23:59:59.999Z`)
    .all<{ starts_at: string; duration_min: number }>();
  return results.map((b) => {
    const start = accraMinutesOf(b.starts_at);
    return [start, start + b.duration_min];
  });
}

export async function availableSlots(
  env: Bindings,
  artisan: { id: string; hours_json: string },
  date: string,
  durationMin: number,
): Promise<number[]> {
  const todayAccra = accraDateOf(new Date().toISOString());
  if (date < todayAccra) return [];

  return slotsForDay({
    hours: hoursForDate(artisan.hours_json, date),
    durationMin,
    takenRanges: await lockedRanges(env, artisan.id, date),
    heldStarts: await heldSlots(env, artisan.id, date),
    nowMinutes: date === todayAccra ? accraMinutesOf(new Date().toISOString()) : null,
  });
}
