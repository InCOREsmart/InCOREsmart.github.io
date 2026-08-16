import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'ru', label: 'Русский' },
    { code: 'en', label: 'English' },
    { code: 'kk', label: 'Қазақша' },
    { code: 'az', label: 'Azərbaycan' },
  ];

  const currentLanguage = (i18n.resolvedLanguage || i18n.language || 'ru').split('-')[0];
  const currentLang = currentLanguage === 'kz' ? 'kk' : currentLanguage;

  const handleChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const code = event.target.value;
    void i18n.changeLanguage(code);
  };

  return (
    <label className="flex min-w-0 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2 text-[#000052] shadow-sm">
      <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wide text-gray-400">
        Язык
      </span>
      <select
        value={languages.some(language => language.code === currentLang) ? currentLang : 'ru'}
        onChange={handleChange}
        aria-label="Выбор языка"
        className="min-w-0 flex-1 cursor-pointer border-0 bg-transparent p-0 pr-5 text-sm font-semibold text-[#000052] outline-none focus:ring-0"
      >
        {languages.map(language => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
};

export default LanguageSwitcher;
