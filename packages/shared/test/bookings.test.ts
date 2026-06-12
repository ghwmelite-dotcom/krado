import { describe, expect, test } from "vitest";
import { canTransition, BOOKING_STATUSES, assertTransition } from "../src/bookings";

describe("booking state machine", () => {
  test("exposes the five D1 statuses", () => {
    expect(BOOKING_STATUSES).toEqual([
      "locked",
      "completed",
      "no_show",
      "cancelled_by_client",
      "cancelled_by_artisan",
    ]);
  });

  test("locked can move to every terminal state", () => {
    expect(canTransition("locked", "completed")).toBe(true);
    expect(canTransition("locked", "no_show")).toBe(true);
    expect(canTransition("locked", "cancelled_by_client")).toBe(true);
    expect(canTransition("locked", "cancelled_by_artisan")).toBe(true);
  });

  test("terminal states are terminal", () => {
    expect(canTransition("completed", "no_show")).toBe(false);
    expect(canTransition("no_show", "completed")).toBe(false);
    expect(canTransition("cancelled_by_client", "locked")).toBe(false);
    expect(canTransition("cancelled_by_artisan", "completed")).toBe(false);
  });

  test("self-transitions are rejected", () => {
    expect(canTransition("locked", "locked")).toBe(false);
  });

  test("assertTransition throws on illegal moves", () => {
    expect(() => assertTransition("completed", "no_show")).toThrow(/completed.*no_show/);
    expect(() => assertTransition("locked", "completed")).not.toThrow();
  });
});
