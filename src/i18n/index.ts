import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";
import ru from "./locales/ru.json";
import en from "./locales/en.json";
import kk from "./locales/kk.json";
import az from "./locales/az.json";
import { coreTranslations } from "./core";
import { uiTranslations } from "./uiTranslations";
import { uiSupplement } from "./uiSupplement";
import { featureTranslations } from "./featureTranslations";
import { featureTranslationsExtended } from "./featureTranslationsExtended";

const mergeLocale = (base: any, extra: any, ui: any, supplement: any, feature: any, extendedFeature: any) => ({
  ...base, ...extra, ...ui, ...supplement, ...feature, ...extendedFeature,
  layout: { ...(base.layout || {}), ...(extra.layout || {}), ...(ui.layout || {}), ...(supplement.layout || {}), ...(feature.layout || {}), ...(extendedFeature.layout || {}) },
  accounting: { ...(base.accounting || {}), ...(extra.accounting || {}), ...(ui.accounting || {}), ...(supplement.accounting || {}), ...(feature.accounting || {}), ...(extendedFeature.accounting || {}) },
  agent: { ...(base.agent || {}), ...(extra.agent || {}), ...(ui.agent || {}), ...(supplement.agent || {}), ...(feature.agent || {}), ...(extendedFeature.agent || {}) },
  payouts: { ...(base.payouts || {}), ...(extra.payouts || {}), ...(ui.payouts || {}), ...(supplement.payouts || {}), ...(feature.payouts || {}), ...(extendedFeature.payouts || {}) },
  ceo: { ...(base.ceo || {}), ...(extra.ceo || {}), ...(ui.ceo || {}), ...(supplement.ceo || {}), ...(feature.ceo || {}), ...(extendedFeature.ceo || {}) },
  ui: { ...(base.ui || {}), ...(extra.ui || {}), ...(ui.ui || {}), ...(supplement.ui || {}), ...(feature.ui || {}), ...(extendedFeature.ui || {}) },
  contractDetail: { ...(base.contractDetail || {}), ...(extra.contractDetail || {}), ...(ui.contractDetail || {}), ...(supplement.contractDetail || {}), ...(feature.contractDetail || {}), ...(extendedFeature.contractDetail || {}) },
  agentContractDetail: { ...(base.agentContractDetail || {}), ...(extra.agentContractDetail || {}), ...(ui.agentContractDetail || {}), ...(supplement.agentContractDetail || {}), ...(feature.agentContractDetail || {}), ...(extendedFeature.agentContractDetail || {}) },
  agentProfile: { ...(base.agentProfile || {}), ...(extra.agentProfile || {}), ...(ui.agentProfile || {}), ...(supplement.agentProfile || {}), ...(feature.agentProfile || {}), ...(extendedFeature.agentProfile || {}) },
  company: { ...(base.company || {}), ...(extra.company || {}), ...(ui.company || {}), ...(supplement.company || {}), ...(feature.company || {}), ...(extendedFeature.company || {}) },
  disputes: { ...(base.disputes || {}), ...(extra.disputes || {}), ...(ui.disputes || {}), ...(supplement.disputes || {}), ...(feature.disputes || {}), ...(extendedFeature.disputes || {}) },
  actions: { ...(base.actions || {}), ...(extra.actions || {}), ...(ui.actions || {}), ...(supplement.actions || {}), ...(feature.actions || {}), ...(extendedFeature.actions || {}) },
  legacyUi: { ...(feature.legacyUi || {}), ...(extendedFeature.legacyUi || {}) },
});

const ruTranslation = mergeLocale(ru, coreTranslations.ru, uiTranslations.ru, uiSupplement.ru, featureTranslations.ru, featureTranslationsExtended.ru);
const enTranslation = mergeLocale(en, coreTranslations.en, uiTranslations.en, uiSupplement.en, featureTranslations.en, featureTranslationsExtended.en);
const kkTranslation = mergeLocale(kk, coreTranslations.kk, uiTranslations.kk, uiSupplement.kk, featureTranslations.kk, featureTranslationsExtended.kk);
const azTranslation = mergeLocale(az, coreTranslations.az, uiTranslations.az, uiSupplement.az, featureTranslations.az, featureTranslationsExtended.az);
const resources = { ru: { translation: ruTranslation }, en: { translation: enTranslation }, kk: { translation: kkTranslation }, kz: { translation: kkTranslation }, az: { translation: azTranslation } };

i18n.use(LanguageDetector).use(initReactI18next).init({ resources, supportedLngs: ["ru", "en", "kk", "kz", "az"], fallbackLng: "ru", nonExplicitSupportedLngs: true, cleanCode: true, load: "languageOnly", defaultNS: "translation", interpolation: { escapeValue: false }, detection: { order: ["localStorage", "navigator"], caches: ["localStorage"], lookupLocalStorage: "i18nextLng" }, returnNull: false, returnEmptyString: false, saveMissing: false, react: { useSuspense: false }, missingKeyHandler: (lngs, namespace, key) => { if (import.meta.env.DEV) console.warn(`[i18n] Missing translation: ${namespace}:${key}`, lngs); }, parseMissingKeyHandler: (_key, defaultValue) => defaultValue || "" });

export default i18n;
