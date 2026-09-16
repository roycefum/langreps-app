import * as Localization from "expo-localization";
import * as SecureStore from "expo-secure-store";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { Platform } from "react-native";

import { en } from "./translations/en";
import { es } from "./translations/es";
import { fr } from "./translations/fr";

export const LOCALES = ["en", "es", "fr"] as const;
export type Locale = (typeof LOCALES)[number];

export const LOCALE_LABELS: Record<Locale, string> = {
  en: "English",
  es: "Español",
  fr: "Français",
};

const TRANSLATIONS: Record<Locale, Record<string, string>> = { en, es, fr };

const LOCALE_KEY = "langreps_locale";

// Same web guard as settings-storage.ts — expo-secure-store throws (not
// no-ops) on web, and this is a device-local setting, not account-level.
const isWeb = Platform.OS === "web";

function detectDeviceLocale(): Locale {
  const tag = Localization.getLocales()[0]?.languageCode;
  if (tag === "es" || tag === "fr") return tag;
  return "en";
}

type I18nState = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  // Looks up `key` in the current locale, falling back to English if
  // missing there — replaces {param} placeholders with values from
  // `params` (e.g. t("signed_in_as", { email }) for "Signed in as {email}").
  t: (key: string, params?: Record<string, string | number>) => string;
};

const I18nContext = createContext<I18nState | null>(null);

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    if (isWeb) return;
    SecureStore.getItemAsync(LOCALE_KEY).then((stored) => {
      if (stored === "es" || stored === "fr" || stored === "en") {
        setLocaleState(stored);
      } else {
        setLocaleState(detectDeviceLocale());
      }
    });
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    if (!isWeb) {
      SecureStore.setItemAsync(LOCALE_KEY, next);
    }
  }, []);

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

  const value = useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within a LocaleProvider");
  }
  return ctx;
}
