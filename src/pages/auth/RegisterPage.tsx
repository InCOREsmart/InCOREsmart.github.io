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
  const [role, setRole] = useState<'CEO' | 'AGENT'>('CEO');
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

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
          },
        },
      });

      if (error) throw error;

      if (data.user) {
        if (role === 'CEO') {
          await supabase.from('companies').insert({
            user_id: data.user.id,
            company_name: '',
            full_name: '',
            position: '',
            phone: '',
            inn: '',
            kpp: '',
            ogrn: '',
            legal_address: '',
          });
        } else {
          await supabase.from('agents').insert({
            user_id: data.user.id,
            full_name: '',
            email: email,
            phone: '',
            specialization: '',
            status: 'ACTIVE',
          });
        }
      }

      navigate('/login');
    } catch (err: any) {
      setError(err.message || 'Ошибка регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Переключатель языков в правом верхнем углу */}
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

      <div className="flex-1 flex items-center justify-center px-4">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-[#000052]">InCORE</h1>
            <p className="text-gray-600 mt-2">{t('auth.subtitle') || 'Платформа смарт-контрактов для найма'}</p>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-8">
            <h2 className="text-2xl font-bold text-[#000052] mb-6 text-center">Регистрация</h2>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">Email *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  placeholder="example@company.com"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">Пароль *</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input"
                  placeholder="Минимум 6 символов"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">Подтвердите пароль *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input"
                  placeholder="Повторите пароль"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">Роль *</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setRole('CEO')}
                    className={`p-3 rounded-lg border-2 transition-all font-medium ${
                      role === 'CEO'
                        ? 'border-[#000052] bg-[#000052]/5 text-[#000052]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    CEO
                  </button>
                  <button
                    type="button"
                    onClick={() => setRole('AGENT')}
                    className={`p-3 rounded-lg border-2 transition-all font-medium ${
                      role === 'AGENT'
                        ? 'border-[#000052] bg-[#000052]/5 text-[#000052]'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    Агент
                  </button>
                </div>
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full btn-primary py-3 text-base"
              >
                {loading ? 'Регистрация...' : 'Зарегистрироваться'}
              </button>

              <div className="text-center">
                <span className="text-gray-600">Уже есть аккаунт? </span>
                <Link to="/login" className="text-[#000052] font-medium hover:underline">
                  Войти
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}