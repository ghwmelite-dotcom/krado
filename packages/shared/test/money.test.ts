import { describe, expect, test } from "vitest";
import { formatGHS, depositFor } from "../src/money";

describe("formatGHS", () => {
  test("renders pesewas as GHS with two decimals", () => {
    expect(formatGHS(4000)).toBe("GHS 40.00");
    expect(formatGHS(123456)).toBe("GHS 1,234.56");
    expect(formatGHS(5)).toBe("GHS 0.05");
    expect(formatGHS(0)).toBe("GHS 0.00");
  });

  test("rejects non-integer input", () => {
    expect(() => formatGHS(40.5)).toThrow();
    expect(() => formatGHS(NaN)).toThrow();
  });
});

describe("depositFor", () => {
  test("takes pct of price, rounded to whole pesewas", () => {
    expect(depositFor(4000, 25, 500)).toBe(1000);
    expect(depositFor(4001, 25, 500)).toBe(1000); // 1000.25 rounds down
    expect(depositFor(4002, 25, 500)).toBe(1001); // 1000.5 rounds half up
  });

  test("clamps to floor when pct deposit is below it", () => {
    expect(depositFor(1000, 25, 500)).toBe(500); // 250 < GHS 5 floor
  });

  test("never exceeds the service price", () => {
    expect(depositFor(400, 25, 500)).toBe(400); // floor above price → price
  });
});
