import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { DollarSign, Users, Target, ShieldCheck, ExternalLink, Database, Zap, CheckCircle, BarChart3 } from 'lucide-react';
import { DEMO_AGENTS, calculateRevenueByMonth, calculateAgentKPI, calculateTotalBitrixDeals, calculateSalesGoalAchievement } from '../../lib/demoData';

export function CEODashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, frozenEscrow: 0, salesGoalAchievement: 0, revenuePerAgent: 0 });

  useEffect(() => {
    const prepareDemoData = () => {
      const contracts = DEMO_AGENTS.flatMap(a => a.contracts);
      const agents = DEMO_AGENTS;

      const totalRevenue = contracts.reduce((sum, c) => sum + (c.revenue || 0), 0);
      const frozenEscrow = contracts.reduce((sum, c) => sum + ((c.revenue || 0) * 0.88), 0);
      const revenuePerAgent = agents.length > 0 ? totalRevenue / agents.length : 0;
      
      const salesGoalData = calculateSalesGoalAchievement();

      setMetrics({ 
        totalRevenue, 
        frozenEscrow, 
        salesGoalAchievement: salesGoalData.percent, 
        revenuePerAgent 
      });
      setLoading(false);
    };

    prepareDemoData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">Загрузка...</p>
      </div>
    );
  }

  const revenueByMonth = calculateRevenueByMonth();
  console.log("Revenue:", revenueByMonth);

console.log("Sales goal:", calculateSalesGoalAchievement());

console.log(
  "August contracts:",
  DEMO_AGENTS.flatMap(a => a.contracts).filter(c => c.month === "2026-08")
);
  const maxRevenue = Math.max(...revenueByMonth.map(d => d.value), 1);

  const totalContracts = DEMO_AGENTS.reduce((sum, a) => sum + a.contracts.length, 0);
  const totalDeals = calculateTotalBitrixDeals();
  const allContracts = DEMO_AGENTS.flatMap(a => a.contracts);
  const crmTotalRevenue = allContracts.reduce((sum, c) => sum + c.revenue, 0);
  const crmTotalBonuses = allContracts.reduce((sum, c) => {
    const closedDeals = c.bitrix_deals.filter(d => d.stage === 'Успешно реализовано');
    return sum + closedDeals.reduce((s, d) => s + (d.amount || 0), 0);
  }, 0);

  const chartWidth = 800;
  const chartHeight = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 70 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;
  const barWidth = (innerWidth / revenueByMonth.length) * 0.6;
  const barGap = (innerWidth / revenueByMonth.length) * 0.4;

  const kpiChartWidth = 800;
  const kpiChartHeight = 300;
  const kpiPadding = { top: 20, right: 20, bottom: 60, left: 50 };
  const kpiInnerWidth = kpiChartWidth - kpiPadding.left - kpiPadding.right;
  const kpiInnerHeight = kpiChartHeight - kpiPadding.top - kpiPadding.bottom;

  const agentKPIs = DEMO_AGENTS.map(agent => ({
    name: agent.name.split(' ')[0],
    fullName: agent.full_name,
    kpi: calculateAgentKPI(agent),
  }));

  const kpiBarWidth = (kpiInnerWidth / agentKPIs.length) * 0.6;
  const kpiBarGap = (kpiInnerWidth / agentKPIs.length) * 0.4;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Финансовое ядро</h1>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Общая выручка</h3>
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
            <h3 className="text-sm font-medium text-[#000052]/70">Прогноз выполнения плана (Август)</h3>
            <Target className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.salesGoalAchievement}%</p>
          <div className="mt-2 h-2 bg-[#000052]/10 rounded-full overflow-hidden">
            <div className="h-full bg-[#B8860B] rounded-full transition-all duration-1000" style={{ width: `${Math.min(metrics.salesGoalAchievement, 100)}%` }}></div>
          </div>
          <p className="text-xs text-[#000052]/60 mt-2">Факт / План за текущий месяц</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Средняя выручка на 1 агента</h3>
            <Users className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${Math.round(metrics.revenuePerAgent).toLocaleString()}</p>
        </div>
      </div>

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

      <div className="bg-white p-5 md:p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Динамика выручки</h2>
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
            {revenueByMonth.map((d, i) => {
              const x = padding.left + i * (barWidth + barGap) + barGap / 2;
              const height = (d.value / maxRevenue) * innerHeight;
              const y = padding.top + innerHeight - height;
              return (
                <g key={i}>
                  <rect x={x} y={y} width={barWidth} height={height} fill="#B8860B" opacity="0.5" rx="4" />
                  <text x={x + barWidth / 2} y={y - 8} textAnchor="middle" fontSize="11" fontWeight="bold" fill="#B8860B">
                    ${(d.value / 1000).toFixed(0)}K
                  </text>
                  <text x={x + barWidth / 2} y={chartHeight - 10} textAnchor="middle" fontSize="11" fill="#000052" fillOpacity="0.7">
                    {d.label}
                  </text>
                  <title>{`${d.label}: $${d.value.toLocaleString()}`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      <div className="bg-white p-5 md:p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Эффективность агентов (Средний KPI, %)</h2>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${kpiChartWidth} ${kpiChartHeight}`} className="w-full min-w-[600px]">
            {[0, 25, 50, 75, 100, 125].map((value, i) => {
              const y = kpiPadding.top + kpiInnerHeight * (1 - value / 125);
              return (
                <g key={i}>
                  <line x1={kpiPadding.left} y1={y} x2={kpiPadding.left + kpiInnerWidth} y2={y} stroke="#000052" strokeOpacity="0.1" strokeDasharray="2,2" />
                  <text x={kpiPadding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#000052" fillOpacity="0.6">{value}%</text>
                </g>
              );
            })}
            <line x1={kpiPadding.left} y1={kpiPadding.top + kpiInnerHeight * (1 - 100/125)} x2={kpiPadding.left + kpiInnerWidth} y2={kpiPadding.top + kpiInnerHeight * (1 - 100/125)} stroke="#B8860B" strokeWidth="1" strokeDasharray="4,4" opacity="0.5" />

            {agentKPIs.map((agent, i) => {
              const x = kpiPadding.left + i * (kpiBarWidth + kpiBarGap) + kpiBarGap / 2;
              const height = (agent.kpi / 125) * kpiInnerHeight;
              const y = kpiPadding.top + kpiInnerHeight - height;
              
              const isOver100 = agent.kpi > 100;
              const isUnder80 = agent.kpi < 80;
              const barColor = isOver100 ? '#B8860B' : isUnder80 ? '#DC2626' : '#000052';

              return (
                <g key={i}>
                  <rect x={x} y={y} width={kpiBarWidth} height={height} fill={barColor} opacity="0.5" rx="4" />
                  <text x={x + kpiBarWidth / 2} y={y - 8} textAnchor="middle" fontSize="12" fontWeight="bold" fill={barColor}>
                    {agent.kpi}%
                  </text>
                  {isUnder80 && (
                    <text x={x + kpiBarWidth / 2} y={y - 22} textAnchor="middle" fontSize="9" fill="#DC2626" fontWeight="bold">
                      ниже нормы
                    </text>
                  )}
                  {isOver100 && (
                    <text x={x + kpiBarWidth / 2} y={y - 22} textAnchor="middle" fontSize="9" fill="#B8860B" fontWeight="bold">
                      перевыполнение
                    </text>
                  )}
                  <text x={x + kpiBarWidth / 2} y={kpiChartHeight - 15} textAnchor="middle" fontSize="11" fill="#000052" fillOpacity="0.8">
                    {agent.name}
                  </text>
                  <title>{`${agent.fullName}: ${agent.kpi}%`}</title>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

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
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider hidden md:table-cell">Звонки (Авг)</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider hidden md:table-cell">Встречи (Авг)</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">Сделки (Авг)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#000052]/5">
              {DEMO_AGENTS.map((agent) => {
                const kpi = calculateAgentKPI(agent);
                const augustContract = agent.contracts.find(c => c.month === '2026-08') || agent.contracts[agent.contracts.length - 1];
                
                return (
                  <tr key={agent.id} onClick={() => navigate(`/ceo/agents/${agent.id}`)} className="hover:bg-[#000052]/5 transition cursor-pointer">
                    <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{agent.full_name}</td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70">{new Date(agent.start_date).toLocaleDateString('ru-RU')}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-[#000052]/10 rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className={`h-full rounded-full transition-all duration-1000 ${kpi > 100 ? 'bg-[#B8860B]' : kpi < 80 ? 'bg-red-600' : 'bg-[#000052]'}`} 
                            style={{ width: `${Math.min(kpi, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-bold ${kpi > 100 ? 'text-[#B8860B]' : kpi < 80 ? 'text-red-600' : 'text-[#000052]'}`}>
                          {kpi}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70 hidden md:table-cell">{augustContract.actual_calls}</td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70 hidden md:table-cell">{augustContract.actual_meetings}</td>
                    <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{augustContract.actual_clients}</td>
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