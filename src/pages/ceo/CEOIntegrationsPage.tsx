import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, XCircle, Copy, RefreshCw, AlertCircle, Globe } from 'lucide-react';

interface WebhookLog {
  id: string;
  deal_id: string;
  stage_id: string;
  title: string;
  payload: any;
  created_at: string;
}

export function CEOIntegrationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<WebhookLog[]>([]);
  const [contractsCount, setContractsCount] = useState(0);
  const [linkedContractsCount, setLinkedContractsCount] = useState(0);
  const [copied, setCopied] = useState(false);

  const webhookUrl = 'https://utsuzqmzawunqpiguuhk.supabase.co/functions/v1/bitrix-webhook';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          const { count: totalContracts } = await supabase
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyData.id);

          const { count: linkedContracts } = await supabase
            .from('contracts')
            .select('*', { count: 'exact', head: true })
            .eq('company_id', companyData.id)
            .not('bitrix_deal_id', 'is', null);

          setContractsCount(totalContracts || 0);
          setLinkedContractsCount(linkedContracts || 0);
        }

        const { data: logsData } = await supabase
          .from('bitrix_webhooks_log')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(10);

        setLogs(logsData || []);
      } catch (err) {
        console.error('Ошибка загрузки данных интеграции:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    window.location.reload();
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#000052]">Интеграции</h1>
          <p className="text-gray-600 mt-1">Подключение внешних систем для автоматизации KPI</p>
        </div>
        <button
          onClick={handleRefresh}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition"
        >
          <RefreshCw className="w-4 h-4" />
          Обновить
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <div className="flex items-start justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-100 rounded-xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-[#000052]">Битрикс24</h2>
              <p className="text-gray-600">Автоматический подсчет KPI из CRM</p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span className="text-sm font-semibold text-green-600">Edge Function задеплоена</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Всего контрактов</p>
            <p className="text-2xl font-bold text-[#000052]">{contractsCount}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <p className="text-xs text-gray-500 mb-1">Привязано к Битрикс24</p>
            <p className="text-2xl font-bold text-green-600">{linkedContractsCount}</p>
          </div>
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <p className="text-xs text-gray-500 mb-1">Получено вебхуков</p>
            <p className="text-2xl font-bold text-blue-600">{logs.length}</p>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-sm font-semibold text-[#000052] mb-2">
            URL вебхука для Битрикс24
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={webhookUrl}
              readOnly
              className="flex-1 px-4 py-2.5 bg-gray-50 border border-gray-300 rounded-lg text-sm text-gray-700 font-mono"
            />
            <button
              onClick={handleCopyUrl}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg transition"
            >
              <Copy className="w-4 h-4" />
              {copied ? 'Скопировано!' : 'Копировать'}
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            Вставьте этот URL в настройки входящего вебхука Битрикс24
          </p>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <h3 className="font-semibold text-[#000052] mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-blue-600" />
            Как настроить интеграцию
          </h3>
          <ol className="space-y-2 text-sm text-gray-700">
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">1.</span>
              <span>Откройте Битрикс24 → Приложения → Разработчикам → Другое → Входящий вебхук</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">2.</span>
              <span>Название: <code className="bg-white px-2 py-0.5 rounded">InCORE KPI Sync</code></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">3.</span>
              <span>URL: вставьте скопированный выше URL</span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">4.</span>
              <span>События: выберите <code className="bg-white px-2 py-0.5 rounded">ONCRMDEALUPDATE</code></span>
            </li>
            <li className="flex gap-2">
              <span className="font-bold text-blue-600">5.</span>
              <span>Нажмите "Сохранить"</span>
            </li>
          </ol>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
          <h3 className="font-semibold text-[#000052] mb-3">Как работают KPI</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-blue-500"></div>
              <span className="text-gray-700">Стадия содержит <code className="bg-white px-2 py-0.5 rounded">call</code> → +1 к "Звонки"</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-gray-700">Стадия содержит <code className="bg-white px-2 py-0.5 rounded">meeting</code> → +1 к "Встречи"</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-purple-500"></div>
              <span className="text-gray-700">Стадия содержит <code className="bg-white px-2 py-0.5 rounded">won</code> или <code className="bg-white px-2 py-0.5 rounded">complete</code> → +1 к "Клиенты"</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-[#000052] mb-4">Последние вебхуки</h2>
        {logs.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <XCircle className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">Вебхуки еще не получены</p>
            <p className="text-sm">Настройте вебхук в Битрикс24 и измените стадию сделки</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((log) => (
              <div key={log.id} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-[#000052]">Сделка #{log.deal_id}</p>
                    <p className="text-sm text-gray-600">{log.title || 'Без названия'}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString('ru-RU')}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs">
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                    Стадия: {log.stage_id}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 opacity-60">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-purple-100 rounded-xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-purple-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#000052]">ЮKassa</h2>
              <p className="text-gray-600 text-sm">Оплата эскроу</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Прием платежей и split-payment (12% платформе, 88% в эскроу)
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <XCircle className="w-4 h-4" />
            <span>Скоро</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 opacity-60">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-green-100 rounded-xl flex items-center justify-center">
              <Globe className="w-8 h-8 text-green-600" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#000052]">1С-Битрикс</h2>
              <p className="text-gray-600 text-sm">Бухгалтерский учет</p>
            </div>
          </div>
          <p className="text-sm text-gray-600 mb-3">
            Автоматическая синхронизация платежей и актов
          </p>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <XCircle className="w-4 h-4" />
            <span>Скоро</span>
          </div>
        </div>
      </div>
    </div>
  );
}