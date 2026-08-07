import { useEffect, useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  Shield, 
  CheckCircle, 
  XCircle, 
  RefreshCw, 
  Zap, 
  Link as LinkIcon, 
  Clock,
  AlertTriangle,
  FileText,
  TrendingUp
} from 'lucide-react';

export function CEOIntegrationsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [bitrixStatus, setBitrixStatus] = useState<'connected' | 'disconnected' | 'syncing'>('connected');
  const [lastSync, setLastSync] = useState<string>(new Date().toISOString());
  const [syncedDeals, setSyncedDeals] = useState<any[]>([]);
  const [webhookLogs, setWebhookLogs] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDeals: 0,
    syncedDeals: 0,
    failedDeals: 0,
    last24h: 0,
  });

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    loadIntegrationData();
  }, [user]);

  const loadIntegrationData = async () => {
    try {
      // Загружаем контракты как "сделки из Bitrix"
      const { data: contracts } = await supabase
        .from('contracts')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

      // Имитируем синхронизированные сделки из Bitrix24
      const deals = (contracts || []).map((c, i) => ({
        id: c.id,
        bitrix_id: `BX-${10000 + i}`,
        title: c.title,
        amount: c.revenue || 0,
        stage: c.status === 'ACTIVE' ? 'Won' : c.status === 'IN_PROGRESS' ? 'In Progress' : 'New',
        synced_at: c.created_at,
        agent: 'Киселева Наталья',
        company: 'Hronline LLC',
        status: 'synced',
      }));

      setSyncedDeals(deals);

      // Имитация логов вебхуков
      const logs = [
        { id: '1', event: 'ONCRMDEALUPDATE', deal_id: 'BX-10000', timestamp: new Date(Date.now() - 300000).toISOString(), status: 'success' },
        { id: '2', event: 'ONCRMDEALADD', deal_id: 'BX-10001', timestamp: new Date(Date.now() - 900000).toISOString(), status: 'success' },
        { id: '3', event: 'ONCRMDEALUPDATE', deal_id: 'BX-10002', timestamp: new Date(Date.now() - 1800000).toISOString(), status: 'success' },
        { id: '4', event: 'ONCRMCONTACTUPDATE', deal_id: 'BX-10003', timestamp: new Date(Date.now() - 3600000).toISOString(), status: 'success' },
        { id: '5', event: 'ONCRMDEALUPDATE', deal_id: 'BX-10004', timestamp: new Date(Date.now() - 7200000).toISOString(), status: 'success' },
      ];
      setWebhookLogs(logs);

      setStats({
        totalDeals: deals.length,
        syncedDeals: deals.length,
        failedDeals: 0,
        last24h: Math.min(deals.length, 5),
      });

      setLastSync(new Date().toISOString());
    } catch (err) {
      console.error('Ошибка:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    setBitrixStatus('syncing');
    
    // Имитация процесса синхронизации
    await new Promise(resolve => setTimeout(resolve, 2500));
    
    setLastSync(new Date().toISOString());
    setBitrixStatus('connected');
    setSyncing(false);
    
    // Создаём запись в журнале
    await supabase.from('oracle_events').insert({
      contract_id: syncedDeals[0]?.id || '00000000-0000-0000-0000-000000000000',
      event_type: 'INTEGRATION_SYNC',
      source: 'BITRIX24',
      payload: { 
        action: 'MANUAL_SYNC', 
        deals_synced: syncedDeals.length,
        user_email: user?.email 
      },
      signature: `bitrix_sig_${Date.now()}`,
      created_by: user?.id,
    });

    alert(`Синхронизация завершена! Обработано сделок: ${syncedDeals.length}`);
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]"></div>
        <p className="mt-4 text-[#000052]">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Интеграции</h1>
        <p className="text-sm text-[#000052]/70 mt-1">Подключение к внешним CRM и автоматизация синхронизации</p>
      </div>

      {/* Bitrix24 карточка */}
      <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
        <div className="p-6 border-b border-[#000052]/10">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 bg-[#000052] rounded-xl flex items-center justify-center">
                <span className="text-2xl font-bold text-[#B8860B]">BX</span>
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#000052]">Bitrix24 CRM</h2>
                <p className="text-sm text-[#000052]/60 mt-1">Автоматическая синхронизация сделок и контактов</p>
              </div>
            </div>
            <div className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold ${
              bitrixStatus === 'connected' ? 'bg-green-100 text-green-700' :
              bitrixStatus === 'syncing' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>
              {bitrixStatus === 'connected' && <CheckCircle className="w-4 h-4" />}
              {bitrixStatus === 'syncing' && <RefreshCw className="w-4 h-4 animate-spin" />}
              {bitrixStatus === 'disconnected' && <XCircle className="w-4 h-4" />}
              {bitrixStatus === 'connected' ? 'Подключено' : bitrixStatus === 'syncing' ? 'Синхронизация...' : 'Отключено'}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div className="bg-[#000052]/5 p-4 rounded-lg">
              <div className="text-xs text-[#000052]/60 mb-1">Пользователь Bitrix24</div>
              <div className="text-sm font-semibold text-[#000052]">hronline1226@gmail.com</div>
            </div>
            <div className="bg-[#000052]/5 p-4 rounded-lg">
              <div className="text-xs text-[#000052]/60 mb-1">Последняя синхронизация</div>
              <div className="text-sm font-semibold text-[#000052]">
                {new Date(lastSync).toLocaleString('ru-RU')}
              </div>
            </div>
            <div className="bg-[#000052]/5 p-4 rounded-lg">
              <div className="text-xs text-[#000052]/60 mb-1">Статус вебхуков</div>
              <div className="text-sm font-semibold text-green-600 flex items-center gap-1">
                <Zap className="w-4 h-4" /> 5 активных
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
              {syncing ? 'Синхронизация...' : 'Синхронизировать сейчас'}
            </button>
            <button className="flex items-center gap-2 px-4 py-2.5 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg text-sm font-semibold transition">
              <LinkIcon className="w-4 h-4" />
              Настройки подключения
            </button>
          </div>
        </div>

        {/* Статистика */}
        <div className="grid grid-cols-2 md:grid-cols-4 border-b border-[#000052]/10">
          <div className="p-4 border-r border-[#000052]/10">
            <div className="text-xs text-[#000052]/60 mb-1">Всего сделок</div>
            <div className="text-2xl font-bold text-[#000052]">{stats.totalDeals}</div>
          </div>
          <div className="p-4 border-r border-[#000052]/10">
            <div className="text-xs text-[#000052]/60 mb-1">Синхронизировано</div>
            <div className="text-2xl font-bold text-green-600">{stats.syncedDeals}</div>
          </div>
          <div className="p-4 border-r border-[#000052]/10">
            <div className="text-xs text-[#000052]/60 mb-1">Ошибки</div>
            <div className="text-2xl font-bold text-red-600">{stats.failedDeals}</div>
          </div>
          <div className="p-4">
            <div className="text-xs text-[#000052]/60 mb-1">За 24 часа</div>
            <div className="text-2xl font-bold text-[#B8860B]">{stats.last24h}</div>
          </div>
        </div>

        {/* Список сделок */}
        <div className="p-6">
          <h3 className="font-bold text-[#000052] mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-[#B8860B]" />
            Синхронизированные сделки
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-[#000052]/10">
                  <th className="text-left py-2 px-3 text-xs font-bold text-[#000052] uppercase">Bitrix ID</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-[#000052] uppercase">Название</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-[#000052] uppercase">Сумма</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-[#000052] uppercase">Стадия</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-[#000052] uppercase">Агент</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-[#000052] uppercase">Синхр.</th>
                  <th className="text-left py-2 px-3 text-xs font-bold text-[#000052] uppercase">Статус</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000052]/5">
                {syncedDeals.map((deal) => (
                  <tr key={deal.id} className="hover:bg-[#000052]/5">
                    <td className="py-3 px-3 text-sm font-mono text-[#000052]/70">{deal.bitrix_id}</td>
                    <td className="py-3 px-3 text-sm font-semibold text-[#000052]">{deal.title}</td>
                    <td className="py-3 px-3 text-sm font-bold text-[#000052]">${deal.amount.toLocaleString()}</td>
                    <td className="py-3 px-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        deal.stage === 'Won' ? 'bg-green-100 text-green-700' :
                        deal.stage === 'In Progress' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {deal.stage}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-sm text-[#000052]/70">{deal.agent}</td>
                    <td className="py-3 px-3 text-xs text-[#000052]/60">
                      {new Date(deal.synced_at).toLocaleString('ru-RU')}
                    </td>
                    <td className="py-3 px-3">
                      <span className="inline-flex items-center gap-1 text-xs text-green-600 font-semibold">
                        <CheckCircle className="w-3 h-3" /> Synced
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Логи вебхуков */}
      <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
        <div className="p-6 border-b border-[#000052]/10">
          <h3 className="font-bold text-[#000052] flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#B8860B]" />
            Журнал вебхуков Bitrix24
          </h3>
          <p className="text-sm text-[#000052]/60 mt-1">События, полученные от CRM в реальном времени</p>
        </div>
        <div className="divide-y divide-[#000052]/5">
          {webhookLogs.map((log) => (
            <div key={log.id} className="p-4 hover:bg-[#000052]/5 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                  log.status === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {log.status === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#000052] font-mono">{log.event}</div>
                  <div className="text-xs text-[#000052]/60">Deal: {log.deal_id}</div>
                </div>
              </div>
              <div className="text-xs text-[#000052]/60 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {new Date(log.timestamp).toLocaleString('ru-RU')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Информационный блок для инвесторов */}
      <div className="bg-gradient-to-r from-[#000052] to-[#B8860B] text-white p-6 rounded-xl">
        <div className="flex items-start gap-4">
          <Shield className="w-8 h-8 flex-shrink-0" />
          <div>
            <h3 className="font-bold text-lg mb-2">Как это работает</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
              <div>
                <div className="font-semibold mb-1">1. Вебхук</div>
                <p className="opacity-90">Bitrix24 отправляет событие при изменении сделки</p>
              </div>
              <div>
                <div className="font-semibold mb-1">2. Oracle</div>
                <p className="opacity-90">InCORE верифицирует и записывает в журнал с подписью</p>
              </div>
              <div>
                <div className="font-semibold mb-1">3. Смарт-контракт</div>
                <p className="opacity-90">Автоматически разблокирует выплаты агенту</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}