import { en, type MessageKey } from "./en";
import { tw } from "./tw";

/**
 * v1 ships en + tw. Ewe ('ee') and Ga ('ga') are post-v1 but the key
 * structure supports them now: add the file, extend SUPPORTED_LANGS.
 */
export const SUPPORTED_LANGS = ["en", "tw"] as const;
export type Lang = (typeof SUPPORTED_LANGS)[number];

export const MESSAGES: Record<Lang, Record<MessageKey, string>> = { en, tw };

export type { MessageKey };

export function t(lang: Lang, key: MessageKey, vars?: Record<string, string | number>): string {
  const table = MESSAGES[lang] ?? MESSAGES.en;
  let out: string = table[key] ?? MESSAGES.en[key];
  if (vars) {
    for (const [name, value] of Object.entries(vars)) {
      out = out.replaceAll(`{${name}}`, String(value));
    }
  }
  return out;
}

/** Greeting by Accra clock: Maakye –11:59 · Maaha –17:59 · Maadwo after. */
export function greetingFor(lang: Lang, minutesOfDay: number): string {
  const key: MessageKey =
    minutesOfDay < 12 * 60
      ? "greeting_morning"
      : minutesOfDay < 18 * 60
        ? "greeting_afternoon"
        : "greeting_evening";
  return t(lang, key);
}
