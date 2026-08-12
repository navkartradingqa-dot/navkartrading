import { cookies } from "next/headers";
import { dictionaries, defaultLocale, isLocale, type Locale, type Dict } from "./dictionaries";

export const LOCALE_COOKIE = "nt_locale";

export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const value = store.get(LOCALE_COOKIE)?.value;
  return isLocale(value) ? value : defaultLocale;
}

export type Translate = (key: keyof Dict, vars?: Record<string, string | number>) => string;

export async function getT(): Promise<{ locale: Locale; t: Translate; dir: "ltr" | "rtl" }> {
  const locale = await getLocale();
  const dict = dictionaries[locale];
  const t: Translate = (key, vars) => {
    let value: string = dict[key] ?? String(key);
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        value = value.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return value;
  };
  return { locale, t, dir: locale === "ar" ? "rtl" : "ltr" };
}
