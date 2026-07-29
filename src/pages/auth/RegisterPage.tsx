import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { Globe } from 'lucide-react';
import { supabase } from '../../lib/supabase';

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'ceo' | 'agent'>('ceo');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const languages = [
    { code: 'ru', name: 'RU' },
    { code: 'en', name: 'EN' },
    { code: 'kk', name: 'KK' },
    { code: 'az', name: 'AZ' },
  ];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }

    if (password.length < 6) {
      setError('Пароль должен содержать минимум 6 символов');
      return;
    }

    setLoading(true);
    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role, // Сохраняем строго в нижнем регистре: 'ceo' или 'agent'
          },
        },
      });

      if (signUpError) throw signUpError;

      if (data.user) {
        if (role === 'ceo') {
          const { error: companyError } = await supabase.from('companies').insert({
            user_id: data.user.id,
            company_type: 'ООО',
            full_name: '',
            display_name: '',
            position: '',
            phone: '',
            company_name: '',
            inn: '',
            kpp: '',
            ogrn: '',
            legal_address: '',
          });
          if (companyError) throw new Error('Не удалось создать профиль компании: ' + companyError.message);
        } else {
          // БЕЗОПАСНАЯ ВСТАВКА АГЕНТА: явно указываем company_id: null, если он не привязан к компании при регистрации
          const { error: agentError } = await supabase.from('agents').insert({
            user_id: data.user.id,
            company_id: null, // Явно указываем null, чтобы избежать ошибок NOT NULL, если поле необязательно
            full_name: '',
            email: email,
            phone: '',
            specialization: '',
            tax_status: 'self_employed',
            inn: '',
            snils: '',
            bank_name: '',
            bank_bik: '',
            correspondent_account: '',
            settlement_account: '',
            status: 'ACTIVE',
          });
          if (agentError) throw new Error('Не удалось создать профиль агента: ' + agentError.message);
        }
      }

      navigate('/login');
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex justify-end p-4">
        <div className="flex items-center gap-2 bg-white px-3 py-2 rounded-lg shadow-sm border border-gray-200">
          <Globe className="w-4 h-4 text-gray-600" />
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => i18n.changeLanguage(lang.code)}
              className={`px-2 py-1 text-xs rounded font-semibold transition-colors ${
                i18n.language === lang.code
                  ? 'bg-[#000052] text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              }`}
            >
              {lang.name}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 pb-8">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#000052]">InCORE</h1>
            <p className="text-gray-600 mt-2">{t('auth.subtitle') || 'Платформа смарт-контрактов для найма'}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#000052] mb-6 text-center">
              {t('auth.register') || 'Регистрация'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('auth.email')} *</label>
                <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]" placeholder="example@company.com" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('auth.password')} *</label>
                <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]" placeholder="Минимум 6 символов" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('auth.confirmPassword') || 'Подтвердите пароль'} *</label>
                <input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]" placeholder="Повторите пароль" required />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('auth.role') || 'Роль'} *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button type="button" onClick={() => setRole('ceo')} className={`p-3 rounded-lg border-2 transition-all font-medium ${role === 'ceo' ? 'border-[#000052] bg-[#000052]/5 text-[#000052]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>CEO</button>
                  <button type="button" onClick={() => setRole('agent')} className={`p-3 rounded-lg border-2 transition-all font-medium ${role === 'agent' ? 'border-[#000052] bg-[#000052]/5 text-[#000052]' : 'border-gray-200 text-gray-600 hover:border-gray-300'}`}>{t('auth.agentRole') || 'Агент'}</button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button type="submit" disabled={loading} className="w-full bg-[#000052] text-white font-medium py-3 rounded-lg border border-[#000052] hover:bg-[#000066] transition-all disabled:opacity-50 disabled:cursor-not-allowed">
                {loading ? t('common.loading') : t('auth.register') || 'Зарегистрироваться'}
              </button>

              <div className="text-center">
                <span className="text-gray-600">{t('auth.noAccount') || 'Уже есть аккаунт?'} </span>
                <Link to="/login" className="text-[#000052] font-medium hover:underline">{t('auth.login')}</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}