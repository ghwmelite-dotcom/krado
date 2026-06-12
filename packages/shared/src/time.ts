/**
 * Time rules: store UTC ISO in D1; render Africa/Accra. Accra is UTC+0
 * year-round (no DST), so conversions are direct — but every conversion
 * still goes through here in case that assumption ever needs revisiting.
 * Slot math is minutes from midnight local, on a 30-minute grid.
 */

export const SLOT_GRID_MIN = 30;

export function accraDateOf(utcIso: string): string {
  return new Date(utcIso).toISOString().slice(0, 10);
}

export function accraMinutesOf(utcIso: string): number {
  const d = new Date(utcIso);
  return d.getUTCHours() * 60 + d.getUTCMinutes();
}

export function slotToUtcIso(accraDate: string, minutes: number): string {
  const h = String(Math.trunc(minutes / 60)).padStart(2, "0");
  const m = String(minutes % 60).padStart(2, "0");
  return new Date(`${accraDate}T${h}:${m}:00Z`).toISOString();
}

export function minutesToLabel(minutes: number): string {
  const h24 = Math.trunc(minutes / 60);
  const m = minutes % 60;
  const suffix = h24 < 12 ? "am" : "pm";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${suffix}`;
}

export interface SlotQuery {
  /** [open, close] in minutes from midnight, or null when closed */
  hours: [number, number] | null;
  durationMin: number;
  /** [start, end) ranges already taken by locked bookings */
  takenRanges: Array<[number, number]>;
  /** slot starts currently held in KV */
  heldStarts: number[];
  /** current Accra time in minutes if the day is today, else null */
  nowMinutes: number | null;
}

export function slotsForDay(q: SlotQuery): number[] {
  if (!q.hours) return [];
  const [open, close] = q.hours;
  const held = new Set(q.heldStarts);
  const slots: number[] = [];

  for (let start = open; start + q.durationMin <= close; start += SLOT_GRID_MIN) {
    if (q.nowMinutes !== null && start <= q.nowMinutes) continue;
    if (held.has(start)) continue;
    const end = start + q.durationMin;
    const overlaps = q.takenRanges.some(([ts, te]) => start < te && end > ts);
    if (overlaps) continue;
    slots.push(start);
  }
  return slots;
}
