import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';

export function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { signIn, role } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signIn(email, password);
      // Редирект по роли (роль определится после входа)
      setTimeout(() => {
        if (role === 'CEO') navigate('/ceo/dashboard');
        else if (role === 'AGENT') navigate('/agent/dashboard');
        else navigate('/login');
      }, 100);
    } catch (err) {
      setError('Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-[#000052]">InCORE</h1>
          <p className="text-gray-600 mt-2">{t('auth.subtitle') || 'Платформа смарт-контрактов для найма'}</p>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('auth.email')}</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="input" required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('auth.password')}</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="input" required />
            </div>

            {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg"><p className="text-sm text-red-700">{error}</p></div>}

            <button type="submit" disabled={loading} className="w-full btn-primary py-3 text-base">
              {loading ? t('common.loading') : t('auth.login')}
            </button>

            <div className="text-center">
              <span className="text-gray-600">{t('auth.noAccount') || 'Нет аккаунта?'} </span>
              <Link to="/register" className="text-[#000052] font-medium hover:underline">{t('auth.registerNow') || 'Зарегистрироваться'}</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}