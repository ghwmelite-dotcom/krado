import { describe, expect, test } from "vitest";
import { normalizePhone } from "../src/phone";

describe("normalizePhone", () => {
  test("normalizes local 0-prefixed Ghana numbers", () => {
    expect(normalizePhone("0244123456")).toBe("+233244123456");
    expect(normalizePhone("0551234567")).toBe("+233551234567");
  });

  test("normalizes 233-prefixed and +233 numbers", () => {
    expect(normalizePhone("233244123456")).toBe("+233244123456");
    expect(normalizePhone("+233244123456")).toBe("+233244123456");
  });

  test("strips spaces, dashes and parentheses", () => {
    expect(normalizePhone("+233 24 412 3456")).toBe("+233244123456");
    expect(normalizePhone("024-412-3456")).toBe("+233244123456");
    expect(normalizePhone("(024) 412 3456")).toBe("+233244123456");
  });

  test("rejects invalid input", () => {
    expect(normalizePhone("24412")).toBeNull();
    expect(normalizePhone("")).toBeNull();
    expect(normalizePhone("not a phone")).toBeNull();
    expect(normalizePhone("02441234567890")).toBeNull(); // too long
  });
});
