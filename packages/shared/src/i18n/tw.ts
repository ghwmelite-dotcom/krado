import { en } from "./en";
import type { MessageKey } from "./en";

/**
 * Twi currently falls back to English. Machine-translated Twi is a brand
 * killer (see DESIGN_SYSTEM.md), so until a native speaker provides real
 * strings, the 'tw' table mirrors English. The key architecture stays in
 * place: to ship Twi, replace this re-export with a literal table keyed by
 * MessageKey and the language toggle starts doing real work.
 */
export const tw: Record<MessageKey, string> = en;
