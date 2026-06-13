import { describe, expect, test } from "vitest";
import { OnboardInput, HoldInput, ServiceInput } from "../src/schemas";

describe("OnboardInput", () => {
  const valid = {
    name: "Kojo Mensah",
    shop_name: "Kojo's Cuts",
    area: "Madina, Accra",
    phone: "0244123456",
    pin: "1234",
    services: [
      { name: "Low fade", price: 4000, duration_min: 45 },
      { name: "Trim", price: 2500, duration_min: 30 },
    ],
    hours: { mon: [540, 1020], tue: [540, 1020], wed: null, thu: [540, 1020], fri: [540, 1020], sat: [480, 1140], sun: null },
  };

  test("accepts a valid onboarding payload", () => {
    const parsed = OnboardInput.parse(valid);
    expect(parsed.phone).toBe("+233244123456"); // normalized in schema
    expect(parsed.services).toHaveLength(2);
    expect(parsed.momo_number).toBeUndefined(); // defaults to phone in the route
  });

  test("the 2-minute invariant: 7 required fields (momo + language optional)", () => {
    const required = Object.entries(OnboardInput.shape).filter(([, v]) => !v.isOptional());
    expect(required.map(([k]) => k).sort()).toEqual(
      ["area", "hours", "name", "phone", "pin", "services", "shop_name"].sort(),
    );
    expect(required).toHaveLength(7);
  });

  test("requires a 4-digit PIN", () => {
    expect(() => OnboardInput.parse({ ...valid, pin: "12" })).toThrow();
    expect(() => OnboardInput.parse({ ...valid, pin: "abcd" })).toThrow();
  });

  test("accepts a distinct MoMo number when provided", () => {
    const parsed = OnboardInput.parse({ ...valid, momo_number: "0551112222" });
    expect(parsed.momo_number).toBe("+233551112222");
  });

  test("requires at least 2 services", () => {
    expect(() => OnboardInput.parse({ ...valid, services: [valid.services[0]] })).toThrow();
  });

  test("rejects bad phone numbers", () => {
    expect(() => OnboardInput.parse({ ...valid, phone: "12345" })).toThrow();
  });

  test("rejects float prices — money is integer pesewas", () => {
    expect(() =>
      ServiceInput.parse({ name: "Fade", price: 40.5, duration_min: 45 }),
    ).toThrow();
  });
});

describe("HoldInput", () => {
  test("validates slot + phone", () => {
    const parsed = HoldInput.parse({
      service_id: "svc_1",
      date: "2026-06-15",
      slot: 870,
      phone: "0244123456",
    });
    expect(parsed.phone).toBe("+233244123456");
  });

  test("rejects off-grid slots", () => {
    expect(() =>
      HoldInput.parse({ service_id: "svc_1", date: "2026-06-15", slot: 877, phone: "0244123456" }),
    ).toThrow();
  });
});
