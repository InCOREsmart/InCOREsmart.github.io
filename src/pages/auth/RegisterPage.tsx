import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { logAcceptance, getActiveDocuments, AcceptanceData } from '../../lib/legal';
import { Building2, User, Eye, EyeOff, FileText, Shield, Fingerprint } from 'lucide-react';

export function RegisterPage() {
  const navigate = useNavigate();
  const { t, i18n } = useTranslation();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'ceo' | 'agent'>('ceo');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Согласия
  const [consentTos, setConsentTos] = useState(false);
  const [consentPrivacy, setConsentPrivacy] = useState(false);
  const [consentPd, setConsentPd] = useState(false);
  const [consentBio, setConsentBio] = useState(false);
  
  const languages = [
    { code: 'ru', label: 'RU' },
    { code: 'en', label: 'EN' },
    { code: 'kk', label: 'KK' },
    { code: 'az', label: 'AZ' }
  ];

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Валидация согласий
    if (!consentTos || !consentPrivacy || !consentPd) {
      setError(t('auth.consentRequired'));
      return;
    }

    if (password.length < 6) {
      setError(t('auth.passwordTooShort'));
      return;
    }

    setLoading(true);

    try {
      // 1. Создание пользователя в Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            full_name: fullName
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('User not created');
      }

      const userId = authData.user.id;

      // 2. Получение актуальных документов
      const docs = await getActiveDocuments(i18n.language);

      // 3. Формирование списка согласий (явная типизация!)
      const acceptances: AcceptanceData[] = [
        {
          document_type: 'tos',
          document_id: docs.find(d => d.document_type === 'tos')?.id,
          document_version: docs.find(d => d.document_type === 'tos')?.version,
          document_hash: docs.find(d => d.document_type === 'tos')?.sha256_hash,
          acceptance_method: 'registration'
        },
        {
          document_type: 'privacy_policy',
          document_id: docs.find(d => d.document_type === 'privacy_policy')?.id,
          document_version: docs.find(d => d.document_type === 'privacy_policy')?.version,
          document_hash: docs.find(d => d.document_type === 'privacy_policy')?.sha256_hash,
          acceptance_method: 'registration'
        },
        {
          document_type: 'consent_pd',
          document_id: docs.find(d => d.document_type === 'consent_pd')?.id,
          document_version: docs.find(d => d.document_type === 'consent_pd')?.version,
          document_hash: docs.find(d => d.document_type === 'consent_pd')?.sha256_hash,
          acceptance_method: 'registration'
        }
      ];

      // Если пользователь согласился на биометрию
      if (consentBio) {
        const bioDoc = docs.find(d => d.document_type === 'consent_bio');
        if (bioDoc) {
          acceptances.push({
            document_type: 'consent_bio',
            document_id: bioDoc.id,
            document_version: bioDoc.version,
            document_hash: bioDoc.sha256_hash,
            acceptance_method: 'registration'
          });
        }
      }

      // 4. Логирование согласий
      await logAcceptance(userId, acceptances);

      // 5. Создание записи в соответствующей таблице
      if (role === 'ceo') {
        const { error: companyError } = await supabase
          .from('companies')
          .insert({
            user_id: userId,
            full_name: fullName,
            display_name: fullName,
            company_type: 'ООО'
          });

        if (companyError) {
          console.error('Error creating company:', companyError);
        }
      } else {
        const { error: agentError } = await supabase
          .from('agents')
          .insert({
            user_id: userId,
            full_name: fullName,
            email,
            status: 'ACTIVE'
          });

        if (agentError) {
          console.error('Error creating agent:', agentError);
        }
      }

      // 6. Успех — редирект на логин
      alert(t('auth.registerSuccess'));
      navigate('/login');

    } catch (err: any) {
      console.error('Registration error:', err);
      setError(err.message || t('auth.registerError'));
    } finally {
      setLoading(false);
    }
  };

  const ConsentCheckbox = ({ 
    checked, 
    onChange, 
    label, 
    docType,
    required = true 
  }: { 
    checked: boolean; 
    onChange: (v: boolean) => void; 
    label: string; 
    docType: string;
    required?: boolean;
  }) => (
    <label className="flex items-start gap-3 cursor-pointer group">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 w-4 h-4 rounded border-gray-300 text-[#B8860B] focus:ring-[#B8860B]"
      />
      <span className="text-sm text-gray-600 group-hover:text-[#000052] transition-colors">
        {label}{' '}
        <a
          href={`/docs/${i18n.language}/${docType}.pdf`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[#B8860B] hover:underline inline-flex items-center gap-1"
          onClick={(e) => e.stopPropagation()}
        >
          <FileText size={12} />
          {t('auth.viewDocument')}
        </a>
        {required && <span className="text-red-500"> *</span>}
      </span>
    </label>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#000052] via-[#000070] to-[#000052] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Переключатель языков */}
        <div className="flex justify-center gap-2 mb-6">
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              className={`px-3 py-1 rounded text-sm font-medium transition-colors ${
                i18n.language === lang.code
                  ? 'bg-[#B8860B] text-white'
                  : 'bg-white/10 text-white hover:bg-white/20'
              }`}
            >
              {lang.label}
            </button>
          ))}
        </div>

        {/* Карточка регистрации */}
        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {/* Логотип */}
          <div className="text-center mb-8">
            <img 
              src="/logo.png" 
              alt="InCORE" 
              className="h-12 mx-auto mb-4"
            />
            <h1 className="text-2xl font-bold text-[#000052]">
              {t('auth.registerTitle')}
            </h1>
            <p className="text-gray-500 mt-2">
              {t('auth.registerSubtitle')}
            </p>
          </div>

          {/* Форма */}
          <form onSubmit={handleRegister} className="space-y-5">
            {/* Выбор роли */}
            <div>
              <label className="block text-sm font-medium text-[#000052] mb-2">
                {t('auth.selectRole')}
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('ceo')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    role === 'ceo'
                      ? 'border-[#B8860B] bg-[#B8860B]/5 text-[#000052]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <Building2 size={24} className={role === 'ceo' ? 'text-[#B8860B]' : 'text-gray-400'} />
                  <span className="text-sm font-medium">{t('auth.roleCeo')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('agent')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    role === 'agent'
                      ? 'border-[#B8860B] bg-[#B8860B]/5 text-[#000052]'
                      : 'border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  <User size={24} className={role === 'agent' ? 'text-[#B8860B]' : 'text-gray-400'} />
                  <span className="text-sm font-medium">{t('auth.roleAgent')}</span>
                </button>
              </div>
            </div>

            {/* ФИО */}
            <div>
              <label className="block text-sm font-medium text-[#000052] mb-1">
                {t('auth.fullName')}
              </label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none"
                placeholder={t('auth.fullNamePlaceholder')}
              />
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-[#000052] mb-1">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none"
                placeholder="email@company.com"
              />
            </div>

            {/* Пароль */}
            <div>
              <label className="block text-sm font-medium text-[#000052] mb-1">
                {t('auth.password')}
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none pr-10"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Согласия */}
            <div className="bg-gray-50 rounded-lg p-4 space-y-3">
              <div className="flex items-center gap-2 text-[#000052] font-medium text-sm">
                <Shield size={16} className="text-[#B8860B]" />
                {t('auth.consentTitle')}
              </div>
              
              <ConsentCheckbox
                checked={consentTos}
                onChange={setConsentTos}
                label={t('auth.consentTos')}
                docType="tos_v1.0"
              />
              
              <ConsentCheckbox
                checked={consentPrivacy}
                onChange={setConsentPrivacy}
                label={t('auth.consentPrivacy')}
                docType="privacy_v1.0"
              />
              
              <ConsentCheckbox
                checked={consentPd}
                onChange={setConsentPd}
                label={t('auth.consentPd')}
                docType="consent_pd_v1.0"
              />

              {/* Опциональное согласие на биометрию */}
              <div className="pt-2 border-t border-gray-200">
                <ConsentCheckbox
                  checked={consentBio}
                  onChange={setConsentBio}
                  label={t('auth.consentBio')}
                  docType="consent_bio_v1.0"
                  required={false}
                />
                <p className="text-xs text-gray-500 mt-1 ml-7 flex items-start gap-1">
                  <Fingerprint size={12} className="mt-0.5 shrink-0" />
                  {t('auth.consentBioNote')}
                </p>
              </div>
            </div>

            {/* Ошибка */}
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
                {error}
              </div>
            )}

            {/* Кнопка регистрации */}
            <button
              type="submit"
              disabled={loading || !consentTos || !consentPrivacy || !consentPd}
              className="w-full bg-[#B8860B] hover:bg-[#9A7209] text-white font-medium py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                t('auth.registerButton')
              )}
            </button>
          </form>

          {/* Ссылка на вход */}
          <p className="text-center text-sm text-gray-500 mt-6">
            {t('auth.alreadyHaveAccount')}{' '}
            <Link to="/login" className="text-[#B8860B] hover:underline font-medium">
              {t('auth.loginNow')}
            </Link>
          </p>
        </div>

        {/* Юридическая информация */}
        <p className="text-center text-xs text-white/60 mt-6">
          {t('auth.legalFooter')}
        </p>
      </div>
    </div>
  );
}