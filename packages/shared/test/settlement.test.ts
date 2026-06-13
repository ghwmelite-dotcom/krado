import { describe, expect, test } from "vitest";
import { settlementNet } from "../src/money";

describe("settlementNet — what Krado owes the artisan from a held deposit", () => {
  test("completed: artisan gets the deposit minus the Krado fee", () => {
    expect(settlementNet(1000, 100, "completed")).toEqual({ gross: 1000, fee: 100, net: 900 });
  });

  test("no_show: artisan keeps the full deposit, fee waived", () => {
    expect(settlementNet(1000, 100, "no_show")).toEqual({ gross: 1000, fee: 0, net: 1000 });
  });

  test("completed with no fee configured", () => {
    expect(settlementNet(1000, 0, "completed")).toEqual({ gross: 1000, fee: 0, net: 1000 });
  });

  test("rejects non-integer pesewas", () => {
    expect(() => settlementNet(1000.5, 0, "completed")).toThrow();
  });
});
