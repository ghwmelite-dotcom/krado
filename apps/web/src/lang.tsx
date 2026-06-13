import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { SUPPORTED_LANGS, type Lang } from "@krado/shared";

const LANG_KEY = "krado_lang";

function initialLang(): Lang {
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored && (SUPPORTED_LANGS as readonly string[]).includes(stored)) return stored as Lang;
  } catch {
    // storage unavailable — default below
  }
  return "en";
}

interface LangContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
}

const LangContext = createContext<LangContextValue>({ lang: "en", setLang: () => {} });

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(initialLang);
  const value = useMemo<LangContextValue>(
    () => ({
      lang,
      setLang: (next) => {
        try {
          localStorage.setItem(LANG_KEY, next);
        } catch {
          // non-fatal
        }
        setLangState(next);
      },
    }),
    [lang],
  );
  return <LangContext.Provider value={value}>{children}</LangContext.Provider>;
}

export function useLang(): LangContextValue {
  return useContext(LangContext);
}
