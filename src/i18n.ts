import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import ru from './i18n/locales/ru.json';
import en from './i18n/locales/en.json';
import az from './i18n/locales/az.json';
import kk from './i18n/locales/kk.json';

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      ru: {
        translation: ru,
      },
      en: {
        translation: en,
      },
      az: {
        translation: az,
      },
      kk: {
        translation: kk,
      },
    },

    fallbackLng: 'ru',

    detection: {
      order: [
        'localStorage',
        'navigator',
      ],
      caches: [
        'localStorage',
      ],
    },

    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;