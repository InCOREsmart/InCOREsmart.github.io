import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CheckCircle, Copy, RefreshCw, AlertCircle, Globe, ExternalLink } from 'lucide-react';
import { DEMO_AGENTS, calculateTotalBitrixDeals } from '../../lib/demoData';

export function CEOIntegrationsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  const webhookUrl = 'https://utsuzqmzawunqpiguuhk.supabase.co/functions/v1/bitrix-webhook';

  useEffect(() => {
    const fetchData = async () => {
      if (!user) { setLoading(false); return; }
      try {
        await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
      } catch (err) {
        console.error('Ошибка:', err);
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

  const allMonths = Array.from(new Set(DEMO_AGENTS.flatMap(a => a.contracts.map(c => c.month)))).sort();

  const filteredContracts = DEMO_AGENTS.flatMap(agent => 
    agent.contracts
      .filter(contract => {
        const agentMatch = selectedAgent === 'all' || agent.id === selectedAgent;
        const monthMatch = selectedMonth === 'all' || contract.month === selectedMonth;
        return agentMatch && monthMatch;
      })
      .map(contract => ({ ...contract, agent_name: agent.name, agent_full_name: agent.full_name }))
  );

  const totalDeals = calculateTotalBitrixDeals();

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('integrations.title')}</h1>
          <p className="text-sm text-[#000052]/70 mt-1">{t('integrations.subtitle')}</p>
        </div>
        <button onClick={() => window.location.reload()} className="flex items-center gap-2 px-4 py-2 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg transition text-sm font-semibold">
          <RefreshCw className="w-4 h-4" />
          {t('integrations.refresh')}
        </button>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#000052]/5 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe className="w-8 h-8 text-[#000052]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#000052]">{t('integrations.bitrixTitle')}</h2>
              <p className="text-sm text-[#000052]/70">{t('integrations.bitrixDescription')}</p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-4 h-4 text-[#B8860B]" />
                <span className="text-sm font-semibold text-[#B8860B]">{t('integrations.edgeFunctionDeployed')}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-3">
            <div className="bg-[#000052]/5 p-3 rounded-lg border border-[#000052]/10 text-center min-w-[100px]">
              <p className="text-xs text-[#000052]/60 mb-1">Всего контрактов</p>
              <p className="text-xl font-bold text-[#000052]">{DEMO_AGENTS.reduce((sum, a) => sum + a.contracts.length, 0)}</p>
            </div>
            <div className="bg-[#B8860B]/10 p-3 rounded-lg border border-[#B8860B]/20 text-center min-w-[100px]">
              <p className="text-xs text-[#B8860B]/70 mb-1">Сделок в Битрикс24</p>
              <p className="text-xl font-bold text-[#B8860B]">{totalDeals}</p>
            </div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
          <label className="block text-sm font-semibold text-[#000052] mb-2">{t('integrations.webhookUrl')}</label>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <input type="text" value={webhookUrl} readOnly className="flex-1 px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052] font-mono" />
            <button onClick={handleCopyUrl} className="px-4 py-2.5 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg transition text-sm font-semibold flex items-center justify-center gap-2">
              <Copy className="w-4 h-4" />
              {copied ? t('integrations.copied') : t('integrations.copy')}
            </button>
          </div>
          <p className="text-xs text-[#000052]/60 mt-2">{t('integrations.webhookHint')}</p>
        </div>

        <div className="bg-[#B8860B]/5 border border-[#B8860B]/20 rounded-lg p-4">
          <h3 className="font-semibold text-[#000052] mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#B8860B]" />
            Как InCORE рассчитывает KPI и бонусы из Битрикс24
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-[#000052]/80">
            <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#000052]/10">
              <div className="w-2 h-2 rounded-full bg-[#000052]"></div>
              <span>Стадия <b>"Встреча назначена"</b> → <b>+1 Встреча</b> (KPI)</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#000052]/10">
              <div className="w-2 h-2 rounded-full bg-[#000052]"></div>
              <span>Стадия <b>"Успешно реализовано"</b> → <b>+1 Клиент</b> (KPI + 50% бонус)</span>
            </div>
            <div className="flex items-center gap-2 bg-white p-2 rounded border border-[#B8860B]/30">
              <div className="w-2 h-2 rounded-full bg-[#B8860B]"></div>
              <span>Клиент активен <b>{'>'} 90 дней</b> → <b>+10% бонус</b> (Clawback пройден)</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#000052] mb-2">Агент</label>
            <select 
              value={selectedAgent} 
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"
            >
              <option value="all">Все агенты</option>
              {DEMO_AGENTS.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000052] mb-2">Месяц</label>
            <select 
              value={selectedMonth} 
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"
            >
              <option value="all">Все месяцы</option>
              {allMonths.map(month => (
                <option key={month} value={month}>
                  {new Date(month + '-01').toLocaleString('ru-RU', { month: 'long', year: 'numeric' })}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-[#000052]/10 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#000052]/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#000052] flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-[#B8860B]" />
            Контракты и сделки из Битрикс24
          </h2>
          <span className="text-xs bg-[#B8860B]/10 text-[#B8860B] px-3 py-1 rounded-full font-medium flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-[#B8860B] animate-pulse"></div>
            {filteredContracts.length} контрактов
          </span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px]">
            <thead className="bg-[#000052]/5">
              <tr>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Месяц</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Агент</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Контракт</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">KPI</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Сделок в Битрикс24</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Выручка</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#000052]/5">
              {filteredContracts.slice(0, 20).map((contract) => (
                <tr key={contract.id} className="hover:bg-[#000052]/5 transition">
                  <td className="py-4 px-4 text-sm text-[#000052]/70">
                    {new Date(contract.month + '-01').toLocaleString('ru-RU', { month: 'short', year: 'numeric' })}
                  </td>
                  <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{contract.agent_name}</td>
                  <td className="py-4 px-4 text-sm text-[#000052]">{contract.title}</td>
                  <td className="py-4 px-4">
                    <div className="text-xs text-[#000052]/70">
                      <div>Звонки: {contract.actual_calls}/{contract.kpi_calls}</div>
                      <div>Встречи: {contract.actual_meetings}/{contract.kpi_meetings}</div>
                      <div>КП: {contract.actual_proposals}/{contract.kpi_proposals}</div>
                      <div>Клиенты: {contract.actual_clients}/{contract.target_clients}</div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-bold text-[#B8860B]">{contract.bitrix_deals.length}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className="text-sm font-bold text-[#000052]">${contract.revenue.toLocaleString()}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}