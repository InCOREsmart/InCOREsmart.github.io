import { useTranslation } from 'react-i18next';

const LanguageSwitcher = () => {
  const { i18n } = useTranslation();

  const languages = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'kk', label: 'KZ' },
    { code: 'az', label: 'AZ' },
  ];

  const currentLang = i18n.language?.substring(0, 2) || 'ru';

  const handleChange = (code: string) => {
    i18n.changeLanguage(code);
  };

  return (
    <div className="flex items-center gap-1 bg-[#000052]/5 rounded-lg p-1">
      {languages.map((lang) => (
        <button
          key={lang.code}
          onClick={() => handleChange(lang.code)}
          className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors ${
            currentLang === lang.code
              ? 'bg-[#B8860B] text-white'
              : 'text-[#000052]/70 hover:bg-[#000052]/10 hover:text-[#000052]'
          }`}
        >
          {lang.label}
        </button>
      ))}
    </div>
  );
};

export default LanguageSwitcher;