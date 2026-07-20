import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Building, User } from 'lucide-react';
import { supabase, UserRole } from '../../lib/supabase';

export function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [role, setRole] = useState<UserRole>('AGENT');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!consent) {
      setError(t('auth.consentRequired'));
      return;
    }

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }

    setLoading(true);

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
          },
        },
      });

      if (signUpError) {
        if (signUpError.message.includes('already registered')) {
          setError('User already exists with this email');
        } else {
          setError(signUpError.message);
        }
        return;
      }

      if (data.user) {
        // Create user role record
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: data.user.id,
            role,
          });

        if (roleError) {
          console.error('Role creation error:', roleError);
        }

        // Create consent record
        const { error: consentError } = await supabase
          .from('consents')
          .insert({
            user_id: data.user.id,
            version: '1.0',
            timestamp: new Date().toISOString(),
          });

        if (consentError) {
          console.error('Consent creation error:', consentError);
        }

        // Navigate to appropriate settings page based on role
        switch (role) {
          case 'CEO':
            navigate('/ceo/settings');
            break;
          case 'AGENT':
            navigate('/agent/settings');
            break;
          default:
            navigate('/login');
        }
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl gradient-gold mb-4">
            <span className="text-primary-dark font-bold text-3xl font-display">I</span>
          </div>
          <h1 className="text-3xl font-display font-bold text-text-primary mb-2">
            InCore
          </h1>
          <p className="text-text-secondary">
            {t('auth.registerTitle')}
          </p>
        </div>

        {/* Form */}
        <div className="card">
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="flex items-center gap-2 p-3 bg-error/20 border border-error/30 rounded-lg text-error text-sm">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* Role Selection */}
            <div>
              <label className="label">{t('auth.selectRole')}</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRole('CEO')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    role === 'CEO'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-text-secondary/20 text-text-secondary hover:border-gold/50'
                  }`}
                >
                  <Building className="w-6 h-6" />
                  <span className="text-sm font-medium">{t('auth.ceo')}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRole('AGENT')}
                  className={`flex flex-col items-center gap-2 p-4 rounded-lg border-2 transition-all ${
                    role === 'AGENT'
                      ? 'border-gold bg-gold/10 text-gold'
                      : 'border-text-secondary/20 text-text-secondary hover:border-gold/50'
                  }`}
                >
                  <User className="w-6 h-6" />
                  <span className="text-sm font-medium">{t('auth.agent')}</span>
                </button>
              </div>
            </div>

            <div>
              <label className="label">{t('auth.email')}</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-10"
                  placeholder="email@company.com"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">{t('auth.password')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-10 pr-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div>
              <label className="label">{t('auth.confirmPassword')}</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-text-muted" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input pl-10"
                  placeholder="••••••••"
                  required
                  minLength={6}
                />
              </div>
            </div>

            {/* Consent Checkbox */}
            <label className="flex items-start gap-3 cursor-pointer">
              <div className="relative mt-0.5">
                <input
                  type="checkbox"
                  checked={consent}
                  onChange={(e) => setConsent(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all ${
                  consent
                    ? 'bg-gold border-gold'
                    : 'border-text-secondary/30 bg-transparent'
                }`}>
                  {consent && <CheckCircle2 className="w-4 h-4 text-primary-dark" />}
                </div>
              </div>
              <span className="text-sm text-text-secondary">
                {t('auth.consentAgree')}
              </span>
            </label>

            <button
              type="submit"
              disabled={loading || !consent}
              className="btn-primary w-full"
            >
              {loading ? t('common.loading') : t('auth.register')}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-text-secondary/10 text-center">
            <p className="text-text-secondary">
              {t('auth.hasAccount')}{' '}
              <Link to="/login" className="link font-medium">
                {t('auth.login')}
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
