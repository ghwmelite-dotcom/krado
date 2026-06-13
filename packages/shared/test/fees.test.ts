import { describe, expect, test } from "vitest";
import { splitDeposit } from "../src/money";

describe("splitDeposit — the Krado fee is absorbed into the deposit", () => {
  test("client pays the same deposit; fee comes out of the artisan's net", () => {
    expect(splitDeposit(1000, 100)).toEqual({ krado_fee: 100, artisan_net: 900 });
  });

  test("fee of 0 means no fee (the off state)", () => {
    expect(splitDeposit(1000, 0)).toEqual({ krado_fee: 0, artisan_net: 1000 });
  });

  test("fee never exceeds the deposit", () => {
    expect(splitDeposit(80, 100)).toEqual({ krado_fee: 80, artisan_net: 0 });
  });

  test("rejects non-integer pesewas", () => {
    expect(() => splitDeposit(1000.5, 100)).toThrow();
    expect(() => splitDeposit(1000, 1.5)).toThrow();
  });
});
