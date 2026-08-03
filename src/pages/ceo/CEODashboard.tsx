import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Users, Target, ShieldCheck, BarChart3, Download } from 'lucide-react';

const DEMO_AGENTS = [
  { id: '1', name: 'Александр С.', revenue: 1000000, kpi: 95, calls: 120, meetings: 45, deals: 8 },
  { id: '2', name: 'Мария К.', revenue: 1000000, kpi: 110, calls: 150, meetings: 60, deals: 12 },
  { id: '3', name: 'Дмитрий В.', revenue: 1000000, kpi: 85, calls: 90, meetings: 30, deals: 5 },
  { id: '4', name: 'Елена П.', revenue: 1000000, kpi: 102, calls: 130, meetings: 50, deals: 9 },
  { id: '5', name: 'Иван Т.', revenue: 1000000, kpi: 78, calls: 80, meetings: 25, deals: 4 },
  { id: '6', name: 'Ольга М.', revenue: 1000000, kpi: 115, calls: 160, meetings: 65, deals: 14 },
  { id: '7', name: 'Сергей Н.', revenue: 1000000, kpi: 92, calls: 110, meetings: 40, deals: 7 },
];

const DEMO_REVENUE = [
  { month: 'Янв 26', value: 1200000 },
  { month: 'Фев 26', value: 1450000 },
  { month: 'Мар 26', value: 1300000 },
  { month: 'Апр 26', value: 1800000 },
  { month: 'Май 26', value: 2100000 },
  { month: 'Июн 26', value: 2400000 },
  { month: 'Июл 26', value: 2800000 },
  { month: 'Авг 26', value: 3200000 },
];

export function CEODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    frozenEscrow: 0,
    paidToAgents: 0,
    netProfit: 0,
    avgRoi: 0,
    activeContracts: 0,
    salesGoalAchievement: 0,
    revenuePerAgent: 0,
  });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (!companyData) { setLoading(false); return; }

        const { data: contractsData } = await supabase.from('contracts').select('*').eq('company_id', companyData.id);
        const { data: agentsData } = await supabase.from('agents').select('*').eq('company_id', companyData.id).eq('status', 'ACTIVE');

        const totalRevenue = (contractsData || []).reduce((sum, c) => sum + (c.revenue || c.kpi_revenue || 0), 0);
        const frozenEscrow = (contractsData || []).reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
        const paidToAgents = (contractsData || []).reduce((sum, c) => sum + (c.agent_payouts_total || 0), 0);
        const netProfit = (contractsData || []).reduce((sum, c) => sum + (c.company_profit || 0), 0);
        const avgRoi = contractsData && contractsData.length > 0
          ? (contractsData || []).reduce((sum, c) => sum + (c.roi_percentage || 0), 0) / contractsData.length : 0;
        const activeContracts = (contractsData || []).filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length;

        const totalPlannedRevenue = (contractsData || []).reduce((sum, c) => sum + (c.kpi_revenue || 0), 0);
        const actualRevenue = (contractsData || []).filter(c => c.status === 'COMPLETED').reduce((sum, c) => sum + (c.revenue || 0), 0);
        const salesGoalAchievement = totalPlannedRevenue > 0 ? (actualRevenue / totalPlannedRevenue) * 100 : 0;
        const revenuePerAgent = agentsData && agentsData.length > 0 ? totalRevenue / agentsData.length : 0;

        setMetrics({ totalRevenue, frozenEscrow, paidToAgents, netProfit, avgRoi, activeContracts, salesGoalAchievement, revenuePerAgent });
      } catch (err) { console.error('Ошибка:', err); } finally { setLoading(false); }
    };
    fetchMetrics();
  }, [user]);

  const handleExportPDF = () => {
    alert('Генерация PDF-отчета для Совета Директоров...\n(В демо-режиме это имитация скачивания файла)');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  const maxRevenue = Math.max(...DEMO_REVENUE.map(d => d.value));

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('ceoDashboard.title')}</h1>
          <p className="text-sm text-[#000052]/70 mt-1">Демо-режим: предзаполненные метрики для питча</p>
        </div>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-[#000052] text-white rounded-lg hover:bg-[#000052]/90 transition text-sm font-medium"
        >
          <Download className="w-4 h-4" />
          Экспорт в PDF для Совета Директоров
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl shadow-sm border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">{t('ceoDashboard.totalRevenue')}</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl shadow-sm border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">{t('ceoDashboard.frozenEscrow')}</h3>
            <ShieldCheck className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${metrics.frozenEscrow.toLocaleString()}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl shadow-sm border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Достижение плана</h3>
            <Target className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.salesGoalAchievement.toFixed(1)}%</p>
          <p className="text-xs text-[#000052]/60 mt-1">Прогноз: 98% к концу квартала</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl shadow-sm border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Выручка на агента</h3>
            <Users className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${metrics.revenuePerAgent.toLocaleString()}</p>
          <p className="text-xs text-[#000052]/60 mt-1">Средняя эффективность</p>
        </div>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Динамика выручки (Янв - Авг 2026)</h2>
        </div>
        <div className="flex items-end justify-between gap-2 md:gap-4 h-48 md:h-64">
          {DEMO_REVENUE.map((data, index) => {
            const heightPercent = (data.value / maxRevenue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2 group">
                <div className="relative w-full flex items-end justify-center h-full">
                  <div 
                    className="w-full max-w-[40px] bg-[#B8860B] rounded-t-md transition-all duration-500 group-hover:bg-[#000052]"
                    style={{ height: `${heightPercent}%` }}
                  >
                    <div className="opacity-0 group-hover:opacity-100 absolute -top-8 left-1/2 -translate-x-1/2 bg-[#000052] text-white text-xs px-2 py-1 rounded whitespace-nowrap transition-opacity">
                      ${data.value.toLocaleString()}
                    </div>
                  </div>
                </div>
                <span className="text-xs font-medium text-[#000052]/70">{data.month}</span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B8860B]" />
            <h2 className="text-lg font-bold text-[#000052]">Эффективность агентов (Демо)</h2>
          </div>
          <span className="text-xs bg-[#B8860B]/10 text-[#B8860B] px-3 py-1 rounded-full font-medium">7 активных контрактов по $1,000,000</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[600px]">
            <thead>
              <tr className="border-b border-[#000052]/10">
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Агент</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Контракт</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Выполнение KPI</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider hidden md:table-cell">Звонки</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider hidden md:table-cell">Встречи</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Сделки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#000052]/5">
              {DEMO_AGENTS.map((agent) => (
                <tr key={agent.id} className="hover:bg-[#000052]/5 transition">
                  <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{agent.name}</td>
                  <td className="py-4 px-4 text-sm text-[#000052]">$1,000,000</td>
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-[#000052]/10 rounded-full overflow-hidden max-w-[100px]">
                        <div 
                          className={`h-full rounded-full ${agent.kpi >= 100 ? 'bg-[#B8860B]' : 'bg-[#000052]'}`}
                          style={{ width: `${Math.min(agent.kpi, 100)}%` }}
                        ></div>
                      </div>
                      <span className={`text-sm font-bold ${agent.kpi >= 100 ? 'text-[#B8860B]' : 'text-[#000052]'}`}>
                        {agent.kpi}%
                      </span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-sm text-[#000052]/70 hidden md:table-cell">{agent.calls}</td>
                  <td className="py-4 px-4 text-sm text-[#000052]/70 hidden md:table-cell">{agent.meetings}</td>
                  <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{agent.deals}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}