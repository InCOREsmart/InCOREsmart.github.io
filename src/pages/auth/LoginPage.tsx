import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Lock, Mail, AlertCircle } from 'lucide-react';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, role, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user && role) {
      navigate('/' + role, { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        console.error('Login failed:', signInError);
        setError(t('auth.invalidCredentials', 'Неверный email или пароль'));
        return;
      }
    } catch (err) {
      console.error('Login error:', err);
      setError(t('auth.invalidCredentials', 'Неверный email или пароль'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#F4F5F7] px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-[24px] shadow-[0_8px_32px_rgba(0,0,52,0.07)] p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-full h-12 bg-white rounded-xl flex items-center justify-center overflow-hidden mb-3">
            <img src="/logo.png" alt="InCORE" className="h-full w-full object-contain" />
          </div>
          <p className="text-gray-400 text-sm">{t('auth.subtitle')}</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          {error && (
            <div className="flex items-center p-3.5 bg-red-50 border border-red-100 rounded-xl text-red-700 text-sm">
              <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[#000052] mb-2">
              {t('auth.email')}
            </label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-[12px] focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition text-[#000052] placeholder-gray-400"
                placeholder="email@company.com"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[#000052] mb-2">
              {t('auth.password')}
            </label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-12 pr-4 py-3.5 border border-gray-200 rounded-[12px] focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition text-[#000052] placeholder-gray-400"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || loading}
            className="w-full bg-[#000052] text-white py-3.5 rounded-[14px] font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0 flex items-center justify-center"
          >
            {submitting || loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a7.96 7.96 0 0 1 3-6.06V0C3.13 1.81 0 6.55 0 12h4zm2 5.29A7.96 7.96 0 0 1 4 12H0c0 3.04 1.13 5.82 3 7.94l3-2.65z"></path>
                </svg>
                {t('common.loading')}
              </span>
            ) : (
              t('auth.login')
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          {t('auth.noAccount')}{' '}
          <button
            onClick={() => navigate('/register')}
            className="text-[#B8860B] font-semibold hover:text-[#D4A017] transition-colors"
          >
            {t('auth.registerNow')}
          </button>
        </div>
      </div>
    </div>
  );
}
