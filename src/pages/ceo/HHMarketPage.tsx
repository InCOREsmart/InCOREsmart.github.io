import { useTranslation } from 'react-i18next';
import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Link as LinkIcon, Loader2 } from 'lucide-react';
import { HHMarketAnalyticsPanel } from '../../components/role/HHMarketAnalyticsPanel';
import { HHMarketCollectorPage } from './HHMarketCollectorPage';

export function HHMarketPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [connecting, setConnecting] = useState(false);
  const [connectionError, setConnectionError] = useState('');
  const navigate = useNavigate();
  return (
    <div className="space-y-6 min-w-0">
      <section className="mx-3 rounded-2xl border border-gray-200 bg-white p-4 sm:mx-4 md:mx-0 md:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div><h2 className="font-bold text-[#000052]">Подключение HH.ru</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-gray-600">OAuth-доступ привязывается к компании текущего пользователя. Токены не передаются в браузер и не используются совместно с другими компаниями.</p></div>
          <button type="button" disabled={connecting || !user} onClick={async () => {
            setConnecting(true); setConnectionError('');
            try {
              const { data: { session } } = await supabase.auth.getSession();
              if (!session?.access_token) throw new Error('Сначала войдите в InCORE.');
              const response = await fetch('https://utsuzqmzawunqpiguuhk.supabase.co/functions/v1/hh-market?action=authorize', { headers: { Authorization: `Bearer ${session.access_token}` } });
              const payload = await response.json().catch(() => ({}));
              if (!response.ok || typeof payload.authorization_url !== 'string') throw new Error(payload.error || 'Не удалось начать подключение HH.ru.');
              const authUrl = new URL(payload.authorization_url);
              if (authUrl.protocol !== 'https:' || authUrl.hostname !== 'hh.ru' || authUrl.pathname !== '/oauth/authorize') throw new Error('Сервер вернул недопустимый адрес авторизации.');
              window.location.assign(authUrl.toString());
            } catch (e) { setConnectionError(e instanceof Error ? e.message : 'Не удалось подключить HH.ru.'); setConnecting(false); }
          }} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-[#000052] px-4 py-3 text-sm font-semibold text-white disabled:opacity-50">
            {connecting ? <Loader2 className="h-4 w-4 animate-spin" /> : <LinkIcon className="h-4 w-4" />}{connecting ? 'Переходим к HH.ru…' : 'Подключить HH.ru'}
          </button>
        </div>
        {connectionError && <p role="alert" className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{connectionError}</p>}
      </section>
      <HHMarketAnalyticsPanel />
      <HHMarketCollectorPage />
      <div className="flex justify-end px-3 sm:px-4 md:px-0 pb-4">
        <button onClick={() => navigate('/ceo/candidates')} className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#000052] text-white font-semibold">
          {t('candidates.next')} <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
