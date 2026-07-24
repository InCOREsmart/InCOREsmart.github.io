import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { UserPlus, Mail, Lock, AlertCircle } from 'lucide-react';

export const RegisterPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CEO' | 'AGENT'>('CEO');
  const [error, setError] = useState('');
  const { signUp, loading } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 6) {
      setError('Пароль должен содержать не менее 6 символов');
      return;
    }

    try {
      await signUp(email, password, role);
      navigate('/');
    } catch (err: any) {
      console.error('Register error:', err);
      setError(err.message || 'Ошибка при регистрации. Возможно, пользователь уже существует.');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12">
      <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-[#000052] mb-4">
            <UserPlus className="w-8 h-8 text-[#B8860B]" />
          </div>
          <h2 className="text-2xl font-bold text-[#000052]">Регистрация в InCORE</h2>
          <p className="text-gray-500 mt-2">Создайте аккаунт для начала работы</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Роль</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setRole('CEO')}
                className={`py-3 px-4 rounded-lg border font-medium transition-all ${
                  role === 'CEO'
                    ? 'bg-[#000052] text-white border-[#000052]'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-[#000052]'
                }`}
              >
                CEO / Собственник
              </button>
              <button
                type="button"
                onClick={() => setRole('AGENT')}
                className={`py-3 px-4 rounded-lg border font-medium transition-all ${
                  role === 'AGENT'
                    ? 'bg-[#000052] text-white border-[#000052]'
                    : 'bg-white text-gray-700 border-gray-300 hover:border-[#000052]'
                }`}
              >
                Агент
              </button>
            </div>
          </div>

          <div>
            <label htmlFor="reg-email" className="block text-sm font-medium text-gray-700 mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="reg-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                placeholder="name@company.com"
              />
            </div>
          </div>

          <div>
            <label htmlFor="reg-password" className="block text-sm font-medium text-gray-700 mb-2">
              Пароль (мин. 6 символов)
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="reg-password"
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#000052] focus:border-transparent outline-none transition-all"
                placeholder="••••••••"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#000052] hover:bg-[#000070] text-white font-semibold py-3 px-4 rounded-lg transition-colors duration-200 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Создание аккаунта...</span>
              </>
            ) : (
              <span>Зарегистрироваться</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Уже есть аккаунт?{' '}
            <Link to="/login" className="font-semibold text-[#B8860B] hover:text-[#9a7009] transition-colors">
              Войти
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
};