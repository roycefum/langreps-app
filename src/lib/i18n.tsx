import * as Localization from "expo-localization";
import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

import { en } from "./translations/en";
import { es } from "./translations/es";
import { fr } from "./translations/fr";

export const LOCALES = ["en", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

const TRANSLATIONS: Record<Locale, Record<string, string>> = { en, es, fr };

// English names for each UI language — sent to the server so AI-written
// text (the tailored quiz feedback) comes back in the language the user
// reads the app in, not the language they're studying.
export const LOCALE_NAMES: Record<Locale, string> = {
  en: "English",
  es: "Spanish",
  fr: "French",
};

// No manual override — the app just follows the device's own language.
// There's no Settings UI for this (deliberately: it's a set-once,
// rarely-revisited preference, and the device already has a perfectly
// good answer for what language someone reads in), so there's nothing to
// persist here either — just detect once, at launch.
function detectDeviceLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageCode;
  if (tag === "es" || tag === "fr") return tag;
  return "en";
}

type I18nState = {
  locale: Locale;
  // Looks up `key` in the current locale, falling back to English if
  // missing there — replaces {param} placeholders with values from
  // `params` (e.g. t("signed_in_as", { email }) for "Signed in as {email}").
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nState | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale] = useState<Locale>(() => detectDeviceLocale());

  const t = useCallback(
    (key: string, params?: Record<string, string | number>) => {
      const template = TRANSLATIONS[locale][key] ?? TRANSLATIONS.en[key] ?? key;
      if (!params) return template;
      return Object.entries(params).reduce(
        (text, [paramKey, value]) => text.replace(`{${paramKey}}`, String(value)),
        template
      );
    },
    [locale]
  );

  const value = useMemo(() => ({ locale, t }), [locale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within a LocaleProvider");
  }
  return ctx;
}
