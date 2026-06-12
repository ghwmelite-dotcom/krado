import { describe, expect, test } from "vitest";
import { t, greetingFor, MESSAGES, SUPPORTED_LANGS } from "../src/i18n/index";

describe("i18n key parity", () => {
  test("en and tw ship; key structure supports ee and ga later", () => {
    expect(SUPPORTED_LANGS).toEqual(["en", "tw"]);
  });

  test("every en key exists in tw and vice versa", () => {
    const en = Object.keys(MESSAGES.en).sort();
    const tw = Object.keys(MESSAGES.tw).sort();
    expect(tw).toEqual(en);
  });

  test("no empty strings in any language", () => {
    for (const lang of SUPPORTED_LANGS) {
      for (const [key, value] of Object.entries(MESSAGES[lang])) {
        expect(value, `${lang}.${key}`).not.toBe("");
      }
    }
  });
});

describe("t()", () => {
  test("interpolates {placeholders}", () => {
    expect(t("en", "deposit_no_show", { artisan: "Kojo" })).toContain("Kojo");
    expect(t("tw", "deposit_no_show", { artisan: "Kojo" })).toContain("Kojo");
  });

  test("falls back to en for unknown language", () => {
    // post-v1 langs route to en until translated
    expect(t("ee" as never, "nav_home")).toBe(MESSAGES.en.nav_home);
  });
});

describe("greetingFor — clock boundaries from the design system", () => {
  test("Maakye until 11:59, Maaha until 17:59, then Maadwo", () => {
    expect(greetingFor("tw", 0)).toBe("Maakye");
    expect(greetingFor("tw", 11 * 60 + 59)).toBe("Maakye");
    expect(greetingFor("tw", 12 * 60)).toBe("Maaha");
    expect(greetingFor("tw", 17 * 60 + 59)).toBe("Maaha");
    expect(greetingFor("tw", 18 * 60)).toBe("Maadwo");
    expect(greetingFor("tw", 23 * 60 + 59)).toBe("Maadwo");
  });

  test("english greetings follow the same clock", () => {
    expect(greetingFor("en", 9 * 60)).toBe("Good morning");
    expect(greetingFor("en", 14 * 60)).toBe("Good afternoon");
    expect(greetingFor("en", 20 * 60)).toBe("Good evening");
  });
});
