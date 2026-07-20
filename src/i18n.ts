import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

// Исправленные пути к файлам переводов
import ru from './i18n/locales/ru.json';
import en from './i18n/locales/en.json';
import az from './i18n/locales/az.json';
import kk from './i18n/locales/kk.json';

i18n
  .use(initReactI18next)
  .init({
    resources: {
      ru: { translation: ru },
      en: { translation: en },
      az: { translation: az },
      kk: { translation: kk },
    },
    lng: 'ru', // Язык по умолчанию
    fallbackLng: 'ru',
    debug: false,
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;