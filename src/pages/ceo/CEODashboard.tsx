import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Users, Target, ShieldCheck, TrendingUp, ExternalLink, Database, Zap, CheckCircle, BarChart3 } from 'lucide-react';
import { DEMO_AGENTS, calculateRevenueByMonth, calculateAgentKPI, calculateTotalBitrixDeals } from '../../lib/demoData';

export function CEODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, frozenEscrow: 0, salesGoalAchievement: 0, revenuePerAgent: 0 });

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (!companyData) { setLoading(false); return; }

        const { data: contractsData } = await supabase.from('contracts').select('*').eq('company_id', companyData.id);
        const { data: agentsData } = await supabase.from('agents').select('*').eq('company_id', companyData.id).eq('status', 'ACTIVE');

        const contracts = contractsData && contractsData.length > 0 ? contractsData : DEMO_AGENTS.flatMap(a => a.contracts);
        const agents = agentsData && agentsData.length > 0 ? agentsData : DEMO_AGENTS;

        const totalRevenue = contracts.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const frozenEscrow = contracts.reduce((sum, c) => sum + ((c.revenue || 0) * 0.88), 0);
        const revenuePerAgent = agents.length > 0 ? totalRevenue / agents.length : 0;

        const totalTargetRevenue = contracts.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const actualRevenue = contracts.reduce((sum, c) => {
          const kpiProgress = ((c.actual_calls || 0) / (c.kpi_calls || 1) + (c.actual_meetings || 0) / (c.kpi_meetings || 1) + (c.actual_proposals || 0) / (c.kpi_proposals || 1) + (c.actual_clients || 0) / (c.target_clients || 1)) / 4;
          return sum + (c.revenue || 0) * kpiProgress;
        }, 0);
        const salesGoalAchievement = totalTargetRevenue > 0 ? (actualRevenue / totalTargetRevenue) * 100 : 0;

        setMetrics({ totalRevenue, frozenEscrow, salesGoalAchievement, revenuePerAgent });
      } catch (err) {
        console.error('Ошибка:', err);
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
  const maxRevenue = Math.max(...revenueByMonth.map(d => d.value), 1);

  // CRM-метрики
  const totalContracts = DEMO_AGENTS.reduce((sum, a) => sum + a.contracts.length, 0);
  const totalDeals = calculateTotalBitrixDeals();
  const allContracts = DEMO_AGENTS.flatMap(a => a.contracts);
  const crmTotalRevenue = allContracts.reduce((sum, c) => sum + c.revenue, 0);
  const crmTotalBonuses = allContracts.reduce((sum, c) => {
    const closedDeals = c.bitrix_deals.filter(d => d.stage === 'Успешно реализовано');
    return sum + closedDeals.reduce((s, d) => s + (d.amount || 0), 0);
  }, 0);

  // График выручки (SVG)
  const chartWidth = 800;
  const chartHeight = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const revenuePoints = revenueByMonth.map((d, i) => {
    const x = padding.left + (i / (revenueByMonth.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - (d.value / maxRevenue) * innerHeight;
    return { x, y, ...d };
  });

  const linePath = revenuePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${revenuePoints[revenuePoints.length - 1].x} ${padding.top + innerHeight} L ${revenuePoints[0].x} ${padding.top + innerHeight} Z`;

  // Столбчатый график KPI агентов (SVG)
  const kpiChartWidth = 800;
  const kpiChartHeight = 300;
  const kpiPadding = { top: 20, right: 20, bottom: 60, left: 50 };
  const kpiInnerWidth = kpiChartWidth - kpiPadding.left - kpiPadding.right;
  const kpiInnerHeight = kpiChartHeight - kpiPadding.top - kpiPadding.bottom;
  const maxKPI = 120; // Максимум для шкалы

  const agentKPIs = DEMO_AGENTS.map(agent => ({
    name: agent.name.split(' ')[0], // Только имя для компактности
    fullName: agent.full_name,
    kpi: calculateAgentKPI(agent),
  }));

  const barWidth = (kpiInnerWidth / agentKPIs.length) * 0.6;
  const barGap = (kpiInnerWidth / agentKPIs.length) * 0.4;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Финансовое ядро</h1>
      </div>

      {/* Основные KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Общая выручка (за весь период)</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Заморожено в эскроу</h3>
            <ShieldCheck className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${metrics.frozenEscrow.toLocaleString()}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Прогноз выполнения плана</h3>
            <Target className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.salesGoalAchievement.toFixed(1)}%</p>
          <div className="mt-2 h-2 bg-[#000052]/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#B8860B] rounded-full transition-all duration-1000" style={{ width: `${Math.min(metrics.salesGoalAchievement, 100)}%` }}></div>
          </div>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Средняя выручка на 1 агента</h3>
            <Users className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${Math.round(metrics.revenuePerAgent).toLocaleString()}</p>
        </div>
      </div>

      {/* CRM-метрики */}
      <div onClick={() => navigate('/ceo/integrations')} className="cursor-pointer group">
        <div className="flex items-center justify-between mb-3 px-1">
          <div className="flex items-center gap-2">
            <ExternalLink className="w-4 h-4 text-[#B8860B]" />
            <h2 className="text-sm font-bold text-[#000052]">CRM-метрики</h2>
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
          </div>
          <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B] group-hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium opacity-80">Сделок в CRM</h3>
              <ExternalLink className="w-5 h-5 opacity-80" />
            </div>
            <p className="text-2xl font-bold">{totalDeals}</p>
          </div>
          <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10 group-hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#000052]/70">Выручка</h3>
              <Zap className="w-5 h-5 text-[#B8860B]" />
            </div>
            <p className="text-2xl font-bold text-[#000052]">${crmTotalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10 group-hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#000052]/70">Начислено бонусов</h3>
              <CheckCircle className="w-5 h-5 text-[#B8860B]" />
            </div>
            <p className="text-2xl font-bold text-[#000052]">${Math.round(crmTotalBonuses).toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Линейный график выручки */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Динамика выручки (реальные продажи, Янв - Авг 2026)</h2>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[600px]">
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding.top + innerHeight * (1 - ratio);
              const value = maxRevenue * ratio;
              return (
                <g key={i}>
                  <line x1={padding.left} y1={y} x2={padding.left + innerWidth} y2={y} stroke="#000052" strokeOpacity="0.1" strokeDasharray="2,2" />
                  <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#000052" fillOpacity="0.6">
                    ${(value / 1000).toFixed(0)}K
                  </text>
                </g>
              );
            })}
            {revenuePoints.map((p, i) => (
              <text key={i} x={p.x} y={chartHeight - 10} textAnchor="middle" fontSize="11" fill="#000052" fillOpacity="0.7">{p.label}</text>
            ))}
            <path d={areaPath} fill="url(#revenueGradient)" opacity="0.3" />
            <path d={linePath} fill="none" stroke="#B8860B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
            {revenuePoints.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="5" fill="#B8860B" stroke="white" strokeWidth="2" />
                <title>{`${p.label}: $${p.value.toLocaleString()}`}</title>
              </g>
            ))}
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B8860B" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#B8860B" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Столбчатый график KPI агентов */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Эффективность агентов (Средний KPI, %)</h2>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${kpiChartWidth} ${kpiChartHeight}`} className="w-full min-w-[600px]">
            {/* Сетка */}
            {[0, 25, 50, 75, 100, 125].map((value, i) => {
              const y = kpiPadding.top + kpiInnerHeight * (1 - value / 125);
              return (
                <g key={i}>
                  <line x1={kpiPadding.left} y1={y} x2={kpiPadding.left + kpiInnerWidth} y2={y} stroke="#000052" strokeOpacity="0.1" strokeDasharray="2,2" />
                  <text x={kpiPadding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#000052" fillOpacity="0.6">{value}%</text>
                </g>
              );
            })}
            {/* Линия 100% */}
            <line x1={kpiPadding.left} y1={kpiPadding.top + kpiInnerHeight * (1 - 100/125)} x2={kpiPadding.left + kpiInnerWidth} y2={kpiPadding.top + kpiInnerHeight * (1 - 100/125)} stroke="#B8860B" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

            {/* Столбцы */}
            {agentKPIs.map((agent, i) => {
              const x = kpiPadding.left + i * (barWidth + barGap) + barGap / 2;
              const height = (agent.kpi / 125) * kpiInnerHeight;
              const y = kpiPadding.top + kpiInnerHeight - height;
              const isOver100 = agent.kpi >= 100;

              return (
                <g key={i}>
                  <rect x={x} y={y} width={barWidth} height={height} fill={isOver100 ? '#B8860B' : '#000052'} rx="4" />
                  <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="12" fontWeight="bold" fill={isOver100 ? '#B8860B' : '#000052'}>
                    {agent.kpi}%
                  </text>
                  <text x={x + barWidth / 2} y={kpiChartHeight - 15} textAnchor="middle" fontSize="11" fill="#000052" fillOpacity="0.8">
                    {agent.name}
                  </text>
                  <title>{`${agent.fullName}: ${agent.kpi}%`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Таблица агентов */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <Users className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Детализация по агентам</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#000052]/10">
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Агент</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Дата начала</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Средний KPI</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider hidden md:table-cell">Звонки</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider hidden md:table-cell">Встречи</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Сделки</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#000052]/5">
              {DEMO_AGENTS.map((agent) => {
                const kpi = calculateAgentKPI(agent);
                const contract = agent.contracts[agent.contracts.length - 1]; // Берем последний (августовский) контракт для текущих цифр
                
                return (
                  <tr key={agent.id} onClick={() => navigate(`/ceo/agents/${agent.id}`)} className="hover:bg-[#000052]/5 transition cursor-pointer">
                    <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{agent.full_name}</td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70">{new Date(agent.start_date).toLocaleDateString('ru-RU')}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-[#000052]/10 rounded-full overflow-hidden max-w-[100px]">
                          <div className={`h-full rounded-full transition-all duration-1000 ${kpi >= 100 ? 'bg-[#B8860B]' : 'bg-[#000052]'}`} style={{ width: `${Math.min(kpi, 100)}%` }}></div>
                        </div>
                        <span className={`text-sm font-bold ${kpi >= 100 ? 'text-[#B8860B]' : 'text-[#000052]'}`}>{kpi}%</span>
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