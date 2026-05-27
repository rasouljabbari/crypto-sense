"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import en from "./dictionaries/en.json";
import tr from "./dictionaries/tr.json";
import fa from "./dictionaries/fa.json";

export type Locale = "en" | "tr" | "fa";
export type Dictionary = typeof en;

const dictionaries: Record<Locale, Dictionary> = { en, tr, fa };

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (path: string, vars?: Record<string, string | number>) => string;
  dir: "ltr" | "rtl";
}

const I18nContext = createContext<I18nContextValue | null>(null);

const STORAGE_KEY = "cryptosense-locale";

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === "en" || stored === "tr" || stored === "fa") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLocaleState(stored);
    }
  }, []);

  const setLocale = useCallback((l: Locale) => {
    setLocaleState(l);
    localStorage.setItem(STORAGE_KEY, l);
  }, []);

  const t = useCallback(
    (path: string, vars?: Record<string, string | number>): string => {
      const keys = path.split(".");
      let value: unknown = dictionaries[locale];
      for (const key of keys) {
        if (value && typeof value === "object" && key in value) {
          value = (value as Record<string, unknown>)[key];
        } else {
          return path;
        }
      }
      if (typeof value !== "string") return path;
      if (!vars) return value;
      return Object.entries(vars).reduce(
        (str, [k, v]) => str.replace(`{${k}}`, String(v)),
        value
      );
    },
    [locale]
  );

  const dir: "ltr" | "rtl" = locale === "fa" ? "rtl" : "ltr";

  return (
    <I18nContext.Provider value={{ locale, setLocale, t, dir }}>
      <div dir={dir}>{children}</div>
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used within I18nProvider");
  return ctx;
}
