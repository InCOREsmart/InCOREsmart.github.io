import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { Lock, Mail, User, AlertCircle, Briefcase, Building } from 'lucide-react';

export function RegisterPage() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<'ceo' | 'agent'>('agent');
  const [fullName, setFullName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

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
      // 1. Регистрация в Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role: role,
            full_name: fullName,
            company_name: companyName,
          },
        },
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error('Не удалось создать пользователя');
      }

      const userId = authData.user.id;

      // 2. Автоматическое создание профиля в зависимости от роли
      if (role === 'agent') {
        // Создаем запись в таблице agents
        const { error: agentError } = await supabase
          .from('agents')
          .insert({
            user_id: userId,
            full_name: fullName || email,
            email: email,
            status: 'ACTIVE',
          });

        if (agentError) {
          console.error('Ошибка создания профиля агента:', agentError);
          // Не блокируем регистрацию, но логируем ошибку
        }
      } else if (role === 'ceo') {
        // Создаем запись в таблице companies
        const { error: companyError } = await supabase
          .from('companies')
          .insert({
            user_id: userId,
            company_name: companyName || 'Моя компания',
            full_name: fullName || email,
            display_name: companyName || 'Моя компания',
          });

        if (companyError) {
          console.error('Ошибка создания профиля компании:', companyError);
          // Не блокируем регистрацию, но логируем ошибку
        }
      }

      setSuccess('Регистрация успешна! Теперь вы можете войти.');
      
      // Через 2 секунды редирект на страницу входа
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      console.error('Ошибка регистрации:', err);
      setError(err.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#000052] mb-2">InCORE</h1>
          <p className="text-gray-500">{t('auth.subtitle')}</p>
        </div>

        {/* Переключатель языка */}
        <div className="flex justify-center gap-2 mb-6">
          {['ru', 'en', 'kk', 'az'].map((lang) => (
            <button
              key={lang}
              onClick={() => i18n.changeLanguage(lang)}
              className={`px-3 py-1 rounded text-xs font-medium transition ${
                i18n.language === lang
                  ? 'bg-[#B8860B] text-white'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              {lang.toUpperCase()}
            </button>
          ))}
        </div>

        <form onSubmit={handleRegister} className="space-y-4">
          {error && (
            <div className="flex items-center p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          {success && (
            <div className="flex items-center p-3 bg-green-50 border border-green-200 rounded-lg text-green-700 text-sm">
              {success}
            </div>
          )}

          {/* Выбор роли */}
          <div>
            <label className="block text-sm font-medium text-[#000052] mb-2">
              {t('auth.role')}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setRole('agent')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                  role === 'agent'
                    ? 'border-[#B8860B] bg-[#B8860B]/10 text-[#B8860B]'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <Briefcase className="w-5 h-5" />
                <span className="font-medium">{t('auth.agentRole')}</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('ceo')}
                className={`flex items-center justify-center gap-2 p-3 rounded-lg border-2 transition ${
                  role === 'ceo'
                    ? 'border-[#000052] bg-[#000052]/10 text-[#000052]'
                    : 'border-gray-300 text-gray-700 hover:border-gray-400'
                }`}
              >
                <Building className="w-5 h-5" />
                <span className="font-medium">CEO</span>
              </button>
            </div>
          </div>

          {/* Поле ФИО (для обеих ролей) */}
          <div>
            <label className="block text-sm font-medium text-[#000052] mb-1">
              {role === 'agent' ? 'ФИО' : 'ФИО руководителя'}
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none transition text-[#000052]"
                placeholder={role === 'agent' ? 'Иванов Иван Иванович' : 'Петров Петр Петрович'}
              />
            </div>
          </div>

          {/* Поле Название компании (только для CEO) */}
          {role === 'ceo' && (
            <div>
              <label className="block text-sm font-medium text-[#000052] mb-1">
                Название компании
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none transition text-[#000052]"
                  placeholder="ООО Ромашка"
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#000052] mb-1">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none transition text-[#000052]"
                placeholder="email@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000052] mb-1">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none transition text-[#000052]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000052] mb-1">
              {t('auth.confirmPassword')}
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#B8860B] focus:border-transparent outline-none transition text-[#000052]"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#000052] text-white py-3 rounded-lg font-semibold hover:bg-[#000032] transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center mt-6"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {t('common.loading')}
              </span>
            ) : (
              t('auth.register')
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <button 
            onClick={() => navigate('/login')} 
            className="text-[#B8860B] font-semibold hover:underline"
          >
            {t('auth.login')}
          </button>
        </div>
      </div>
    </div>
  );
}