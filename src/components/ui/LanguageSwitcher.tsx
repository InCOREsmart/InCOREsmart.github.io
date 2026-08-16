import type { ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';

const languages = [
  { code: 'ru', label: 'Русский' },
  { code: 'en', label: 'English' },
  { code: 'kk', label: 'Қазақша' },
  { code: 'az', label: 'Azərbaycan' },
] as const;

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const detected = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0];
  const currentLanguage = detected === 'kz' ? 'kk' : detected;
  const selectedLanguage = languages.some(language => language.code === currentLanguage)
    ? currentLanguage
    : 'ru';

  const handleChange = (event: ChangeEvent<HTMLSelectElement>) => {
    void i18n.changeLanguage(event.target.value);
  };

  return (
    <div className="inline-flex min-w-0 items-center rounded-xl border border-gray-200 bg-white shadow-sm">
      <select
        value={selectedLanguage}
        onChange={handleChange}
        aria-label="Выбор языка"
        className="h-10 min-w-[92px] max-w-full cursor-pointer appearance-none border-0 bg-transparent px-3 pr-7 text-sm font-semibold text-[#000052] outline-none focus:ring-0"
      >
        {languages.map(language => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </div>
  );
};

export default LanguageSwitcher;
