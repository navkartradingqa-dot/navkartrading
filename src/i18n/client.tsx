"use client";

import { createContext, useCallback, useContext, useMemo } from "react";
import { dictionaries, defaultLocale, type Dict, type Locale } from "./dictionaries";

type Ctx = {
  locale: Locale;
  dir: "ltr" | "rtl";
  t: (key: keyof Dict, vars?: Record<string, string | number>) => string;
};

const LocaleContext = createContext<Ctx>({
  locale: defaultLocale,
  dir: "ltr",
  t: (k) => String(k),
});

export function LocaleProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: React.ReactNode;
}) {
  const t = useCallback(
    (key: keyof Dict, vars?: Record<string, string | number>) => {
      let value: string = dictionaries[locale][key] ?? String(key);
      if (vars) {
        for (const [k, v] of Object.entries(vars)) {
          value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
        }
      }
      return value;
    },
    [locale],
  );

  const value = useMemo<Ctx>(
    () => ({ locale, dir: locale === "ar" ? "rtl" : "ltr", t }),
    [locale, t],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  return useContext(LocaleContext);
}

/** Pick the right language field off a bilingual record. */
export function pick<T extends Record<string, unknown>>(
  row: T,
  base: string,
  locale: Locale,
): string {
  const key = base + (locale === "ar" ? "Ar" : "En");
  return String(row[key] ?? "");
}
