import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Users, Target, ShieldCheck, TrendingUp, ExternalLink, Database, Zap, CheckCircle } from 'lucide-react';
import { DEMO_AGENTS, calculateRevenueByMonth, calculateAgentKPI, calculateTotalBitrixDeals } from '../../lib/demoData';

export function CEODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    frozenEscrow: 0,
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

        const contracts = contractsData && contractsData.length > 0 ? contractsData : DEMO_AGENTS.flatMap(a => a.contracts);
        const agents = agentsData && agentsData.length > 0 ? agentsData : DEMO_AGENTS;

        const totalRevenue = contracts.reduce((sum, c) => sum + (c.revenue || 0), 0);
        const frozenEscrow = contracts.reduce((sum, c) => sum + ((c.revenue || 0) * 0.88), 0);
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
  const maxRevenue = Math.max(...revenueByMonth.map(d => d.value));
  const minRevenue = Math.min(...revenueByMonth.map(d => d.value));

  // CRM-метрики
  const totalContracts = DEMO_AGENTS.reduce((sum, a) => sum + a.contracts.length, 0);
  const totalDeals = calculateTotalBitrixDeals();
  const allContracts = DEMO_AGENTS.flatMap(a => a.contracts);
  const crmTotalRevenue = allContracts.reduce((sum, c) => sum + c.revenue, 0);
  const crmTotalBonuses = allContracts.reduce((sum, c) => {
    const closedDeals = c.bitrix_deals.filter(d => d.stage === 'Успешно реализовано');
    return sum + closedDeals.reduce((s, d) => s + d.amount, 0);
  }, 0);

  // Данные для линейного графика выручки (SVG)
  const chartWidth = 800;
  const chartHeight = 250;
  const padding = { top: 20, right: 20, bottom: 40, left: 60 };
  const innerWidth = chartWidth - padding.left - padding.right;
  const innerHeight = chartHeight - padding.top - padding.bottom;

  const revenuePoints = revenueByMonth.map((d, i) => {
    const x = padding.left + (i / (revenueByMonth.length - 1)) * innerWidth;
    const y = padding.top + innerHeight - ((d.value - minRevenue) / (maxRevenue - minRevenue || 1)) * innerHeight;
    return { x, y, ...d };
  });

  const linePath = revenuePoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
  const areaPath = `${linePath} L ${revenuePoints[revenuePoints.length - 1].x} ${padding.top + innerHeight} L ${revenuePoints[0].x} ${padding.top + innerHeight} Z`;

  // Данные для графика KPI агентов по месяцам
  const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06', '2026-07', '2026-08'];
  const monthLabels = ['Янв', 'Фев', 'Мар', 'Апр', 'Май', 'Июн', 'Июл', 'Авг'];

  const agentMonthlyKPI = DEMO_AGENTS.map(agent => {
    const monthlyData = months.map(month => {
      const monthContracts = agent.contracts.filter(c => c.month === month);
      if (monthContracts.length === 0) return null;
      const contract = monthContracts[0];
      const kpi = ((contract.actual_calls / contract.kpi_calls) +
                   (contract.actual_meetings / contract.kpi_meetings) +
                   (contract.actual_proposals / contract.kpi_proposals) +
                   (contract.actual_clients / contract.target_clients)) / 4 * 100;
      return { month, kpi: Math.round(kpi), contract };
    });
    return { agent, data: monthlyData };
  });

  const kpiChartWidth = 800;
  const kpiChartHeight = 250;
  const kpiPadding = { top: 20, right: 120, bottom: 40, left: 40 };
  const kpiInnerWidth = kpiChartWidth - kpiPadding.left - kpiPadding.right;
  const kpiInnerHeight = kpiChartHeight - kpiPadding.top - kpiPadding.bottom;

  const agentColors = ['#B8860B', '#000052', '#B8860B', '#000052', '#B8860B', '#000052', '#B8860B', '#000052'];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('ceoDashboard.title')}</h1>
        <p className="text-sm text-[#000052]/70 mt-1">Финансовое ядро компании</p>
      </div>

      {/* Основные KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">{t('ceoDashboard.totalRevenue')}</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${metrics.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">{t('ceoDashboard.frozenEscrow')}</h3>
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
            <h3 className="text-sm font-medium text-[#000052]/70">Выручка на агента</h3>
            <Users className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${metrics.revenuePerAgent.toLocaleString()}</p>
        </div>
      </div>

      {/* CRM-метрики */}
      <div onClick={() => navigate('/ceo/integrations')} className="cursor-pointer group">
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
            <p className="text-2xl font-bold">${crmTotalRevenue.toLocaleString()}</p>
          </div>
          <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10 group-hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-[#000052]/70">Начислено бонусов</h3>
              <CheckCircle className="w-5 h-5 text-[#B8860B]" />
            </div>
            <p className="text-2xl font-bold">${crmTotalBonuses.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Линейный график динамики выручки */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <TrendingUp className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Динамика выручки (Янв - Авг 2026)</h2>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full min-w-[600px]">
            {/* Сетка */}
            {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => {
              const y = padding.top + innerHeight * (1 - ratio);
              const value = minRevenue + (maxRevenue - minRevenue) * ratio;
              return (
                <g key={i}>
                  <line x1={padding.left} y1={y} x2={padding.left + innerWidth} y2={y} stroke="#000052" strokeOpacity="0.1" strokeDasharray="2,2" />
                  <text x={padding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#000052" fillOpacity="0.6">
                    ${(value / 1000000).toFixed(1)}M
                  </text>
                </g>
              );
            })}

            {/* Подписи месяцев */}
            {revenuePoints.map((p, i) => (
              <text key={i} x={p.x} y={chartHeight - 10} textAnchor="middle" fontSize="11" fill="#000052" fillOpacity="0.7">
                {p.month}
              </text>
            ))}

            {/* Область под линией */}
            <path d={areaPath} fill="url(#revenueGradient)" opacity="0.3" />

            {/* Линия */}
            <path d={linePath} fill="none" stroke="#B8860B" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

            {/* Точки */}
            {revenuePoints.map((p, i) => (
              <g key={i}>
                <circle cx={p.x} cy={p.y} r="6" fill="#B8860B" stroke="white" strokeWidth="2" />
                <title>{`${p.month}: $${p.value.toLocaleString()}`}</title>
              </g>
            ))}

            {/* Градиент */}
            <defs>
              <linearGradient id="revenueGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#B8860B" stopOpacity="0.4" />
                <stop offset="100%" stopColor="#B8860B" stopOpacity="0" />
              </linearGradient>
            </defs>
          </svg>
        </div>
      </div>

      {/* Линейный график KPI агентов по месяцам */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#B8860B]" />
            <h2 className="text-lg font-bold text-[#000052]">Эффективность агентов по месяцам (KPI %)</h2>
          </div>
        </div>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${kpiChartWidth} ${kpiChartHeight}`} className="w-full min-w-[600px]">
            {/* Сетка */}
            {[0, 25, 50, 75, 100, 125].map((value, i) => {
              const y = kpiPadding.top + kpiInnerHeight * (1 - value / 125);
              return (
                <g key={i}>
                  <line x1={kpiPadding.left} y1={y} x2={kpiPadding.left + kpiInnerWidth} y2={y} stroke="#000052" strokeOpacity="0.1" strokeDasharray="2,2" />
                  <text x={kpiPadding.left - 10} y={y + 4} textAnchor="end" fontSize="10" fill="#000052" fillOpacity="0.6">
                    {value}%
                  </text>
                </g>
              );
            })}

            {/* Линия 100% (план) */}
            <line 
              x1={kpiPadding.left} 
              y1={kpiPadding.top + kpiInnerHeight * (1 - 100/125)} 
              x2={kpiPadding.left + kpiInnerWidth} 
              y2={kpiPadding.top + kpiInnerHeight * (1 - 100/125)} 
              stroke="#B8860B" 
              strokeWidth="1" 
              strokeDasharray="4,4" 
              opacity="0.5"
            />

            {/* Подписи месяцев */}
            {monthLabels.map((label, i) => {
              const x = kpiPadding.left + (i / (monthLabels.length - 1)) * kpiInnerWidth;
              return (
                <text key={i} x={x} y={kpiChartHeight - 10} textAnchor="middle" fontSize="11" fill="#000052" fillOpacity="0.7">
                  {label}
                </text>
              );
            })}

            {/* Линии агентов */}
            {agentMonthlyKPI.map((agentData, agentIdx) => {
              const validPoints = agentData.data
                .map((d, i) => d ? { x: kpiPadding.left + (i / (monthLabels.length - 1)) * kpiInnerWidth, y: kpiPadding.top + kpiInnerHeight * (1 - d.kpi / 125), kpi: d.kpi, month: d.month } : null)
                .filter((p): p is { x: number; y: number; kpi: number; month: string } => p !== null);

              if (validPoints.length === 0) return null;

              const path = validPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
              const color = agentColors[agentIdx % agentColors.length];

              return (
                <g key={agentIdx}>
                  <path d={path} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.8" />
                  {validPoints.map((p, i) => (
                    <circle key={i} cx={p.x} cy={p.y} r="3" fill={color}>
                      <title>{`${agentData.agent.name} - ${p.month}: ${p.kpi}%`}</title>
                    </circle>
                  ))}
                </g>
              );
            })}

            {/* Легенда */}
            {agentMonthlyKPI.map((agentData, agentIdx) => {
              const y = kpiPadding.top + agentIdx * 20;
              const color = agentColors[agentIdx % agentColors.length];
              return (
                <g key={agentIdx}>
                  <line x1={kpiPadding.left + kpiInnerWidth + 10} y1={y} x2={kpiPadding.left + kpiInnerWidth + 30} y2={y} stroke={color} strokeWidth="2" />
                  <text x={kpiPadding.left + kpiInnerWidth + 35} y={y + 4} fontSize="10" fill="#000052">
                    {agentData.agent.name}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>

      {/* Таблица агентов */}
      <div className="bg-white p-5 md:p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#B8860B]" />
            <h2 className="text-lg font-bold text-[#000052]">Эффективность агентов</h2>
          </div>
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