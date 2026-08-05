import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Users, Target, ShieldCheck, BarChart3, ExternalLink, Database, Zap, CheckCircle } from 'lucide-react';
import { DEMO_AGENTS, calculateRevenueByMonth, calculateAgentKPI, calculateTotalBitrixDeals } from '../../lib/demoData';

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

        if (!companyData) {
          setLoading(false);
          return;
        }

        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', companyData.id);

        const { data: agentsData } = await supabase
          .from('agents')
          .select('*')
          .eq('company_id', companyData.id)
          .eq('status', 'ACTIVE');

        const contracts = contractsData && contractsData.length > 0 ? contractsData : DEMO_AGENTS.flatMap(a => a.contracts);
        const agents = agentsData && agentsData.length > 0 ? agentsData : DEMO_AGENTS;

        const totalRevenue = contracts.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const frozenEscrow = contracts.reduce((sum, c) => sum + ((c.revenue || 0) * 0.88), 0);
        const paidToAgents = contracts.reduce((sum, c) => sum + ((c.revenue || 0) * 0.88), 0);
        const netProfit = totalRevenue * 0.12;
        const activeContracts = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length;
        const revenuePerAgent = agents.length > 0 ? totalRevenue / agents.length : 0;

        const totalTargetRevenue = contracts.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const actualRevenue = contracts.reduce((sum, c) => {
          const kpiProgress = ((c.actual_calls || 0) / (c.kpi_calls || 1) + 
                              (c.actual_meetings || 0) / (c.kpi_meetings || 1) + 
                              (c.actual_proposals || 0) / (c.kpi_proposals || 1) + 
                              (c.actual_clients || 0) / (c.target_clients || 1)) / 4;
          return sum + (c.revenue || 0) * kpiProgress;
        }, 0);
        const salesGoalAchievement = totalTargetRevenue > 0 ? (actualRevenue / totalTargetRevenue) * 100 : 0;

        setMetrics({
          totalRevenue,
          frozenEscrow,
          paidToAgents,
          netProfit,
          avgRoi: 0,
          activeContracts,
          salesGoalAchievement,
          revenuePerAgent,
        });
      } catch (err) {
        console.error('Ошибка загрузки метрик:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  const revenueByMonth = calculateRevenueByMonth();
  const maxRevenue = Math.max(...revenueByMonth.map(d => d.value));

  // CRM-метрики из demoData
  const totalContracts = DEMO_AGENTS.reduce((sum, a) => sum + a.contracts.length, 0);
  const totalDeals = calculateTotalBitrixDeals();
  const allContracts = DEMO_AGENTS.flatMap(a => a.contracts);
  const crmTotalRevenue = allContracts.reduce((sum, c) => sum + c.revenue, 0);
  const crmTotalBonuses = allContracts.reduce((sum, c) => {
    const closedDeals = c.bitrix_deals.filter(d => d.stage === 'Успешно реализовано');
    return sum + closedDeals.reduce((s, d) => s + d.amount, 0);
  }, 0);

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('ceoDashboard.title')}</h1>
          <p className="text-sm text-[#000052]/70 mt-1">Финансовое ядро компании</p>
        </div>
      </div>

      {/* Основные KPI */}
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
            <h3 className="text-sm font-medium text-[#000052]/70">Прогноз выполнения плана</h3>
            <Target className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.salesGoalAchievement.toFixed(1)}%</p>
          <div className="mt-2 h-2 bg-[#000052]/10 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#B8860B] rounded-full transition-all duration-1000"
              style={{ width: `${Math.min(metrics.salesGoalAchievement, 100)}%` }}
            ></div>
          </div>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl shadow-sm border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Выручка на агента</h3>
            <Users className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${metrics.revenuePerAgent.toLocaleString()}</p>
        </div>
      </div>

      {/* CRM-метрики (кликабельные → переход в Интеграции) */}
      <div 
        onClick={() => navigate('/ceo/integrations')}
        className="cursor-pointer group"
      >
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-[#B8860B]" />
            <h2 className="text-sm font-bold text-[#000052]">CRM-метрики (Битрикс24, amoCRM, HubSpot)</h2>
          </div>
          <span className="text-xs text-[#B8860B] font-semibold group-hover:underline flex items-center gap-1">
            Перейти в интеграции <ExternalLink className="w-3 h-3" />
          </span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052] group-hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium opacity-80">Всего контрактов</h3>
              <Database className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">{totalContracts}</p>
            <p className="text-xs opacity-70 mt-1">За весь период</p>
          </div>

          <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B] group-hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium opacity-80">Сделок в CRM</h3>
              <ExternalLink className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">{totalDeals}</p>
            <p className="text-xs opacity-70 mt-1">Автоматически синхронизировано</p>
          </div>

          <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10 group-hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#000052]/70">Выручка</h3>
              <Zap className="w-5 h-5 text-[#B8860B]" />
            </div>
            <p className="text-2xl font-bold text-[#000052]">${crmTotalRevenue.toLocaleString()}</p>
            <p className="text-xs text-[#000052]/60 mt-1">По всем контрактам</p>
          </div>

          <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10 group-hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#000052]/70">Начислено бонусов</h3>
              <CheckCircle className="w-5 h-5 text-[#B8860B]" />
            </div>
            <p className="text-2xl font-bold text-[#000052]">${crmTotalBonuses.toLocaleString()}</p>
            <p className="text-xs text-[#000052]/60 mt-1">По закрытым сделкам</p>
          </div>
        </div>
      </div>

      {/* Динамика выручки */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Динамика выручки (Янв - Авг 2026)</h2>
        </div>
        <div className="flex items-end justify-between gap-2 md:gap-4 h-48 md:h-64">
          {revenueByMonth.map((data, index) => {
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

      {/* Эффективность агентов */}
      <div className="bg-white p-5 md:p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B8860B]" />
            <h2 className="text-lg font-bold text-[#000052]">Эффективность агентов</h2>
          </div>
          <span className="text-xs bg-[#B8860B]/10 text-[#B8860B] px-3 py-1 rounded-full font-medium">{DEMO_AGENTS.length} активных контрактов по $1,000,000</span>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#000052]/10">
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Агент</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Дата начала</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Выполнение KPI</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider hidden md:table-cell">Звонки</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider hidden md:table-cell">Встречи</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Сделки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#000052]/5">
              {DEMO_AGENTS.map((agent) => {
                const kpi = calculateAgentKPI(agent);
                const contract = agent.contracts[0];
                
                return (
                  <tr 
                    key={agent.id} 
                    onClick={() => navigate(`/ceo/agents/${agent.id}`)}
                    className="hover:bg-[#000052]/5 transition cursor-pointer"
                  >
                    <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{agent.full_name}</td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70">{new Date(agent.start_date).toLocaleDateString('ru-RU')}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-[#000052]/10 rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${kpi >= 100 ? 'bg-[#B8860B]' : 'bg-[#000052]'}`}
                            style={{ width: `${Math.min(kpi, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-bold ${kpi >= 100 ? 'text-[#B8860B]' : 'text-[#000052]'}`}>
                          {kpi}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70 hidden md:table-cell">{contract.actual_calls}</td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70 hidden md:table-cell">{contract.actual_meetings}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{contract.actual_clients}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}