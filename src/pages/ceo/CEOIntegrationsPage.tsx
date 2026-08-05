import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { CheckCircle, Copy, AlertCircle, Globe, ExternalLink, Download, Upload, Database, Zap } from 'lucide-react';
import { DEMO_AGENTS, calculateTotalBitrixDeals } from '../../lib/demoData';

export function CEOIntegrationsPage() {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [importModalOpen, setImportModalOpen] = useState(false);

  const webhookUrl = 'https://utsuzqmzawunqpiguuhk.supabase.co/functions/v1/bitrix-webhook';

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
  const totalRevenue = filteredContracts.reduce((sum, c) => sum + c.revenue, 0);
  const totalBonuses = filteredContracts.reduce((sum, c) => {
    const closedDeals = c.bitrix_deals.filter(d => d.stage === 'Успешно реализовано');
    return sum + closedDeals.reduce((s, d) => s + d.amount, 0);
  }, 0);

  const handleExportCSV = () => {
    const headers = ['Месяц', 'Агент', 'Контракт', 'Звонки', 'Встречи', 'КП', 'Клиенты', 'Сделок в CRM', 'Выручка'];
    const rows = filteredContracts.map(c => [
      c.month,
      c.agent_full_name,
      c.title,
      c.actual_calls,
      c.actual_meetings,
      c.actual_proposals,
      c.actual_clients,
      c.bitrix_deals.length,
      c.revenue,
    ]);
    const csv = [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incore_crm_export_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      {/* Шапка */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">CRM и интеграции</h1>
          <p className="text-sm text-[#000052]/70 mt-1">Автоматический расчёт KPI и бонусов из сделок</p>
        </div>
        <div className="flex gap-2">
          <button 
            onClick={handleExportCSV}
            className="flex items-center gap-2 px-4 py-2 bg-[#000052] hover:bg-[#000052]/90 text-white rounded-lg transition text-sm font-semibold"
          >
            <Download className="w-4 h-4" />
            Экспорт CSV
          </button>
          <button 
            onClick={() => setImportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg transition text-sm font-semibold"
          >
            <Upload className="w-4 h-4" />
            Импорт из CRM
          </button>
        </div>
      </div>

      {/* KPI метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Всего контрактов</h3>
            <Database className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{DEMO_AGENTS.reduce((sum, a) => sum + a.contracts.length, 0)}</p>
          <p className="text-xs opacity-70 mt-1">За весь период</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Сделок в CRM</h3>
            <ExternalLink className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{totalDeals}</p>
          <p className="text-xs opacity-70 mt-1">Автоматически синхронизировано</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Выручка</h3>
            <Zap className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-[#000052]/60 mt-1">По выбранным контрактам</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Начислено бонусов</h3>
            <CheckCircle className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${totalBonuses.toLocaleString()}</p>
          <p className="text-xs text-[#000052]/60 mt-1">По закрытым сделкам</p>
        </div>
      </div>

      {/* Карточка интеграции с CRM */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-[#000052]/5 rounded-xl flex items-center justify-center flex-shrink-0">
              <Globe className="w-8 h-8 text-[#000052]" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#000052]">Битрикс24, amoCRM, HubSpot</h2>
              <p className="text-sm text-[#000052]/70">Автоматическая синхронизация сделок через REST API или CSV</p>
              <div className="flex items-center gap-2 mt-2">
                <CheckCircle className="w-4 h-4 text-[#B8860B]" />
                <span className="text-sm font-semibold text-[#B8860B]">Интеграция активна (демо-режим)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Webhook URL */}
        <div className="mb-6 p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
          <label className="block text-sm font-semibold text-[#000052] mb-2">Webhook URL для автоматической синхронизации</label>
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2">
            <input type="text" value={webhookUrl} readOnly className="flex-1 px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052] font-mono" />
            <button onClick={handleCopyUrl} className="px-4 py-2.5 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg transition text-sm font-semibold flex items-center justify-center gap-2">
              <Copy className="w-4 h-4" />
              {copied ? 'Скопировано' : 'Копировать'}
            </button>
          </div>
          <p className="text-xs text-[#000052]/60 mt-2">
            Для автоматической синхронизации создайте входящий вебхук в вашей CRM с правами CRM и укажите этот URL
          </p>
        </div>

        {/* Правила маппинга */}
        <div className="bg-[#B8860B]/5 border border-[#B8860B]/20 rounded-lg p-4">
          <h3 className="font-semibold text-[#000052] mb-3 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#B8860B]" />
            Как InCORE рассчитывает KPI и бонусы из CRM
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

      {/* Фильтры */}
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

      {/* Таблица контрактов и сделок */}
      <div className="bg-white rounded-xl shadow-sm border border-[#000052]/10 overflow-hidden">
        <div className="p-4 md:p-6 border-b border-[#000052]/10 flex items-center justify-between">
          <h2 className="text-lg font-bold text-[#000052] flex items-center gap-2">
            <ExternalLink className="w-5 h-5 text-[#B8860B]" />
            Контракты и сделки из CRM
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
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Сделок в CRM</th>
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

      {/* Модалка импорта из CRM */}
      {importModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl border border-[#000052]/10">
            <div className="flex items-center justify-between p-6 border-b border-[#000052]/10">
              <h2 className="text-2xl font-bold text-[#000052]">Импорт сделок из CRM</h2>
              <button onClick={() => setImportModalOpen(false)} className="p-2 hover:bg-[#000052]/5 rounded-full transition-colors">
                <span className="text-[#000052] text-xl">×</span>
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-[#000052]/5 p-4 rounded-lg border border-[#000052]/10">
                <h3 className="font-semibold text-[#000052] mb-2">Поддерживаемые CRM</h3>
                <ul className="space-y-2 text-sm text-[#000052]/80">
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#B8860B]" />
                    <span>Битрикс24 (через REST API или CSV)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#B8860B]" />
                    <span>amoCRM (через REST API или CSV)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#B8860B]" />
                    <span>HubSpot (через REST API или CSV)</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-[#B8860B]" />
                    <span>Любая CRM с экспортом в CSV</span>
                  </li>
                </ul>
              </div>

              <div className="bg-[#B8860B]/5 p-4 rounded-lg border border-[#B8860B]/20">
                <h3 className="font-semibold text-[#000052] mb-2">Демо-режим</h3>
                <p className="text-sm text-[#000052]/80">
                  В демо-версии все сделки уже загружены из имитации Битрикс24. 
                  В продакшене вы сможете подключить реальную CRM через webhook URL (см. выше) 
                  или загрузить CSV-файл с выгрузкой сделок.
                </p>
              </div>

              <div className="border-2 border-dashed border-[#000052]/20 rounded-lg p-8 text-center">
                <Upload className="w-12 h-12 mx-auto mb-3 text-[#000052]/40" />
                <p className="text-sm text-[#000052]/70 mb-2">Перетащите CSV-файл сюда</p>
                <p className="text-xs text-[#000052]/50">или</p>
                <button className="mt-2 px-4 py-2 bg-[#000052] text-white rounded-lg text-sm font-semibold hover:bg-[#000052]/90 transition">
                  Выбрать файл
                </button>
              </div>

              <div className="flex gap-3 pt-4 border-t border-[#000052]/10">
                <button
                  onClick={() => setImportModalOpen(false)}
                  className="flex-1 py-3 px-4 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg font-semibold transition"
                >
                  Закрыть
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}