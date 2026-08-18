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
import { featureTranslationsUiPatch } from "./featureTranslationsUiPatch";
import { featureTranslationsDemoPatch } from "./featureTranslationsDemoPatch";
import { featureTranslationsI18nFix } from "./featureTranslationsI18nFix";
import { tooltipTranslations } from "./tooltips";
import { notificationTranslations } from "./notifications";
import { smartContractTranslations } from "./smartContractTranslations";
import { hhMarketTranslations } from "./hhMarketTranslations";
import { hrCalculatorTranslations } from "./hrCalculatorTranslations";

const mergeLocale = (base: any, extra: any, ui: any, supplement: any, feature: any, extendedFeature: any, uiPatch: any, demoPatch: any, i18nFix: any, tooltips: any, notifications: any, hhMarket: any, hrCalculator: any) => ({
  ...base, ...extra, ...ui, ...supplement, ...feature, ...extendedFeature, ...uiPatch, ...demoPatch, ...i18nFix,
  tooltips, notifications, hhMarket, hrCalculator,
  layout: { ...(base.layout || {}), ...(extra.layout || {}), ...(ui.layout || {}), ...(supplement.layout || {}), ...(feature.layout || {}), ...(extendedFeature.layout || {}), ...(uiPatch.layout || {}), ...(demoPatch.layout || {}) },
  accounting: { ...(base.accounting || {}), ...(extra.accounting || {}), ...(ui.accounting || {}), ...(supplement.accounting || {}), ...(feature.accounting || {}), ...(extendedFeature.accounting || {}), ...(uiPatch.accounting || {}), ...(demoPatch.accounting || {}) },
  agent: { ...(base.agent || {}), ...(extra.agent || {}), ...(ui.agent || {}), ...(supplement.agent || {}), ...(feature.agent || {}), ...(extendedFeature.agent || {}), ...(uiPatch.agent || {}), ...(demoPatch.agent || {}) },
  payouts: { ...(base.payouts || {}), ...(extra.payouts || {}), ...(ui.payouts || {}), ...(supplement.payouts || {}), ...(feature.payouts || {}), ...(extendedFeature.payouts || {}), ...(uiPatch.payouts || {}), ...(demoPatch.payouts || {}) },
  ceo: { ...(base.ceo || {}), ...(extra.ceo || {}), ...(ui.ceo || {}), ...(supplement.ceo || {}), ...(feature.ceo || {}), ...(extendedFeature.ceo || {}), ...(uiPatch.ceo || {}), ...(demoPatch.ceo || {}) },
  ui: { ...(base.ui || {}), ...(extra.ui || {}), ...(ui.ui || {}), ...(supplement.ui || {}), ...(feature.ui || {}), ...(extendedFeature.ui || {}), ...(uiPatch.ui || {}), ...(demoPatch.ui || {}) },
  contractDetail: { ...(base.contractDetail || {}), ...(extra.contractDetail || {}), ...(ui.contractDetail || {}), ...(supplement.contractDetail || {}), ...(feature.contractDetail || {}), ...(extendedFeature.contractDetail || {}), ...(uiPatch.contractDetail || {}), ...(demoPatch.contractDetail || {}) },
  agentContractDetail: { ...(base.agentContractDetail || {}), ...(extra.agentContractDetail || {}), ...(ui.agentContractDetail || {}), ...(supplement.agentContractDetail || {}), ...(feature.agentContractDetail || {}), ...(extendedFeature.agentContractDetail || {}), ...(uiPatch.agentContractDetail || {}) },
  agentProfile: { ...(base.agentProfile || {}), ...(extra.agentProfile || {}), ...(ui.agentProfile || {}), ...(supplement.agentProfile || {}), ...(feature.agentProfile || {}), ...(extendedFeature.agentProfile || {}), ...(uiPatch.agentProfile || {}), ...(demoPatch.agentProfile || {}) },
  company: { ...(base.company || {}), ...(extra.company || {}), ...(ui.company || {}), ...(supplement.company || {}), ...(feature.company || {}), ...(extendedFeature.company || {}), ...(uiPatch.company || {}), ...(demoPatch.company || {}) },
  disputes: { ...(base.disputes || {}), ...(extra.disputes || {}), ...(ui.disputes || {}), ...(supplement.disputes || {}), ...(feature.disputes || {}), ...(extendedFeature.disputes || {}), ...(uiPatch.disputes || {}), ...(demoPatch.disputes || {}) },
  actions: { ...(base.actions || {}), ...(extra.actions || {}), ...(ui.actions || {}), ...(supplement.actions || {}), ...(feature.actions || {}), ...(extendedFeature.actions || {}), ...(uiPatch.actions || {}), ...(demoPatch.actions || {}) },
  legacyUi: { ...(feature.legacyUi || {}), ...(extendedFeature.legacyUi || {}), ...(uiPatch.legacyUi || {}), ...(demoPatch.legacyUi || {}), ...(i18nFix.legacyUi || {}) },
});

const buildLocale = (lang: 'ru' | 'en' | 'kk' | 'az', base: any) => ({
  ...mergeLocale(base, coreTranslations[lang], uiTranslations[lang], uiSupplement[lang], featureTranslations[lang], featureTranslationsExtended[lang], featureTranslationsUiPatch[lang], featureTranslationsDemoPatch[lang], featureTranslationsI18nFix[lang], tooltipTranslations[lang], notificationTranslations[lang], hhMarketTranslations[lang].hhMarket, hrCalculatorTranslations[lang].hrCalculator),
  smartContract: smartContractTranslations[lang],
});

const ruTranslation = buildLocale('ru', ru);
const enTranslation = buildLocale('en', en);
const kkTranslation = buildLocale('kk', kk);
const azTranslation = buildLocale('az', az);
const resources = { ru: { translation: ruTranslation }, en: { translation: enTranslation }, kk: { translation: kkTranslation }, kz: { translation: kkTranslation }, az: { translation: azTranslation } };

const MISSING_TRANSLATION_LOG_PREFIX = '[i18n] Missing translation:';
const i18nMissingKeyHandler = (lngs: readonly string[], namespace: string, key: string) => { if (import.meta.env.DEV) console.warn(MISSING_TRANSLATION_LOG_PREFIX, namespace, key, lngs); };

i18n.use(LanguageDetector).use(initReactI18next).init({ resources, supportedLngs: ["ru", "en", "kk", "kz", "az"], fallbackLng: "ru", nonExplicitSupportedLngs: true, cleanCode: true, load: "languageOnly", defaultNS: "translation", interpolation: { escapeValue: false }, detection: { order: ["localStorage", "navigator"], caches: ["localStorage"], lookupLocalStorage: "i18nextLng" }, returnNull: false, returnEmptyString: false, saveMissing: false, react: { useSuspense: false }, missingKeyHandler: i18nMissingKeyHandler, parseMissingKeyHandler: (_key, defaultValue) => defaultValue || "" });
export default i18n;
