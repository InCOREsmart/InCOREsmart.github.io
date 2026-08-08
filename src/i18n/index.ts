import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import ru from "./locales/ru.json";
import en from "./locales/en.json";
import kk from "./locales/kk.json";
import az from "./locales/az.json";
import { coreTranslations } from "./core";

const mergeLocale = (base: any, extra: any) => ({
  ...base,
  ...extra,
  agent: { ...(base.agent || {}), ...(extra.agent || {}) },
  payouts: { ...(base.payouts || {}), ...(extra.payouts || {}) },
});

const resources = {
  ru: { translation: mergeLocale(ru, coreTranslations.ru) },
  en: { translation: mergeLocale(en, coreTranslations.en) },
  kk: { translation: mergeLocale(kk, coreTranslations.kk) },
  az: { translation: mergeLocale(az, coreTranslations.az) },
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    supportedLngs: ["ru", "en", "kk", "az"],
    fallbackLng: "ru",
    nonExplicitSupportedLngs: true,
    cleanCode: true,
    load: "languageOnly",
    defaultNS: "translation",
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "i18nextLng",
    },
    returnNull: false,
    returnEmptyString: false,
    saveMissing: false,
    react: {
      useSuspense: false,
    },
    missingKeyHandler: (lngs, namespace, key) => {
      if (import.meta.env.DEV) {
        console.warn(`[i18n] Missing translation: ${namespace}:${key}`, lngs);
      }
    },
    parseMissingKeyHandler: (_key, defaultValue) => defaultValue || "",
  });

export default i18n;
