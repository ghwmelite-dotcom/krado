import { describe, expect, test } from "vitest";
import {
  accraDateOf,
  accraMinutesOf,
  slotsForDay,
  slotToUtcIso,
  minutesToLabel,
} from "../src/time";

// Africa/Accra is UTC+0 year-round (no DST), so UTC instants map 1:1.

describe("accraDateOf / accraMinutesOf", () => {
  test("UTC instant maps straight to Accra date and minutes", () => {
    expect(accraDateOf("2026-06-12T14:30:00Z")).toBe("2026-06-12");
    expect(accraMinutesOf("2026-06-12T14:30:00Z")).toBe(14 * 60 + 30);
    expect(accraMinutesOf("2026-06-12T00:00:00Z")).toBe(0);
  });
});

describe("slotToUtcIso", () => {
  test("builds a UTC ISO instant from Accra date + minutes", () => {
    expect(slotToUtcIso("2026-06-12", 870)).toBe("2026-06-12T14:30:00.000Z");
  });
});

describe("minutesToLabel", () => {
  test("renders 12h labels", () => {
    expect(minutesToLabel(870)).toBe("2:30 pm");
    expect(minutesToLabel(540)).toBe("9:00 am");
    expect(minutesToLabel(0)).toBe("12:00 am");
    expect(minutesToLabel(720)).toBe("12:00 pm");
  });
});

describe("slotsForDay", () => {
  // Shop open 09:00–17:00 (540–1020), 45-min service, 30-min grid.
  const hours: [number, number] = [540, 1020];

  test("generates 30-min grid slots that fit before close", () => {
    const slots = slotsForDay({ hours, durationMin: 45, takenRanges: [], heldStarts: [], nowMinutes: null });
    expect(slots[0]).toBe(540);
    expect(slots[slots.length - 1]).toBe(960); // 16:00 + 45min = 16:45 ≤ 17:00; 16:30 would overrun
    expect(slots).toContain(870);
    expect(slots).not.toContain(990);
  });

  test("excludes slots overlapping locked bookings", () => {
    // booking 10:00–10:45 blocks 9:30 (overlap), 10:00, 10:30 starts
    const slots = slotsForDay({
      hours,
      durationMin: 45,
      takenRanges: [[600, 645]],
      heldStarts: [],
      nowMinutes: null,
    });
    expect(slots).not.toContain(570);
    expect(slots).not.toContain(600);
    expect(slots).not.toContain(630);
    expect(slots).toContain(540);
    expect(slots).toContain(660);
  });

  test("excludes live KV holds and past times today", () => {
    const slots = slotsForDay({
      hours,
      durationMin: 45,
      takenRanges: [],
      heldStarts: [720],
      nowMinutes: 600, // it's 10:00 — 9:00/9:30/10:00 are gone
    });
    expect(slots).not.toContain(540);
    expect(slots).not.toContain(600);
    expect(slots).not.toContain(720); // held
    expect(slots).toContain(630);
  });

  test("closed day yields no slots", () => {
    expect(slotsForDay({ hours: null, durationMin: 45, takenRanges: [], heldStarts: [], nowMinutes: null })).toEqual([]);
  });
});
