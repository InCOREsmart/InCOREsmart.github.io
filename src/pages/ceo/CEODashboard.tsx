import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  DollarSign, 
  Shield, 
  Users, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertTriangle,
  PieChart as PieChartIcon,
  BarChart3
} from 'lucide-react';
import { DEMO_AGENTS, calculateRevenueByMonth, calculateAgentKPI } from '../../lib/demoData';

export function CEODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<any>({
    totalRevenue: 0,
    totalEscrow: 0,
    totalPaidToAgents: 0,
    netProfit: 0,
    avgROI: 0,
    activeContracts: 0,
    pendingPayouts: 0,
  });
  const [streamsByType, setStreamsByType] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadMetrics = async () => {
      try {
        // Получаем компанию
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!companyData) {
          // Если компании нет — используем демо-данные
          loadDemoMetrics();
          return;
        }

        // Загружаем реальные контракты
        const { data: contracts } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', companyData.id);

        // Загружаем потоки выплат
        let allStreams: any[] = [];
        if (contracts && contracts.length > 0) {
          const contractIds = contracts.map(c => c.id);
          const { data: streams } = await supabase
            .from('contract_payout_streams')
            .select('*')
            .in('contract_id', contractIds);
          allStreams = streams || [];
        }

        // Расчёт метрик
        const totalRevenue = (contracts || []).reduce((sum, c) => sum + (c.revenue || c.planned_revenue || 0), 0);
        const totalEscrow = (contracts || []).reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
        const totalPaidToAgents = allStreams.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.amount, 0);
        const platformFee = (contracts || []).reduce((sum, c) => sum + (c.platform_fee || 0), 0);
        const netProfit = platformFee + totalRevenue - allStreams.reduce((sum, s) => sum + s.amount, 0);
        const avgROI = contracts && contracts.length > 0
          ? Math.round((contracts || []).reduce((sum, c) => sum + (c.roi_percentage || 0), 0) / contracts.length)
          : 0;
        const activeContracts = (contracts || []).filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length;
        const pendingPayouts = allStreams.filter(s => s.status === 'UNLOCKED' || s.status === 'PAYABLE').reduce((sum, s) => sum + s.amount, 0);

        // Группировка потоков по типу для pie chart
        const grouped = allStreams.reduce((acc, s) => {
          const key = s.stream_key;
          if (!acc[key]) acc[key] = { key, title: s.title, total: 0 };
          acc[key].total += s.amount;
          return acc;
        }, {} as any);
        const streamsArray = Object.values(grouped);

        setMetrics({
          totalRevenue,
          totalEscrow,
          totalPaidToAgents,
          netProfit,
          avgROI,
          activeContracts,
          pendingPayouts,
        });
        setStreamsByType(streamsArray);
      } catch (err) {
        console.error('Ошибка загрузки метрик:', err);
        loadDemoMetrics();
      } finally {
        setLoading(false);
      }
    };

    const loadDemoMetrics = () => {
      // Демо-данные для питча, если нет реальных контрактов
      const demoRevenue = 1250000;
      const demoEscrow = 168000;
      const demoPaid = 45000;
      const demoProfit = 20160;
      const demoROI = 12;

      setMetrics({
        totalRevenue: demoRevenue,
        totalEscrow: demoEscrow,
        totalPaidToAgents: demoPaid,
        netProfit: demoProfit,
        avgROI: demoROI,
        activeContracts: 8,
        pendingPayouts: 28000,
      });

      setStreamsByType([
        { key: 'new_sales', title: 'Новые продажи', total: 81000 },
        { key: 'renewal', title: 'Продление', total: 27000 },
        { key: 'cross_sell', title: 'Кросс-продажи', total: 18000 },
        { key: 'plan_bonus', title: 'Бонус за план', total: 27000 },
        { key: 'retention', title: 'Удержание 90 дней', total: 9600 },
        { key: 'annual', title: 'Годовой бонус', total: 5400 },
      ]);
    };

    loadMetrics();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]"></div>
        <p className="mt-4 text-[#000052]">Загрузка...</p>
      </div>
    );
  }

  const kpis = [
    { label: 'Общая выручка', value: metrics.totalRevenue, icon: DollarSign, color: 'bg-[#000052]', textColor: 'text-white', prefix: '$' },
    { label: 'Эскроу', value: metrics.totalEscrow, icon: Shield, color: 'bg-[#B8860B]', textColor: 'text-white', prefix: '$' },
    { label: 'Выплаты агентам', value: metrics.totalPaidToAgents, icon: Users, color: 'bg-white', textColor: 'text-[#000052]', prefix: '$' },
    { label: 'Чистая прибыль', value: metrics.netProfit, icon: TrendingUp, color: 'bg-white', textColor: 'text-[#000052]', prefix: '$' },
    { label: 'Средний ROI', value: metrics.avgROI, icon: BarChart3, color: 'bg-green-600', textColor: 'text-white', suffix: '%' },
    { label: 'Активные контракты', value: metrics.activeContracts, icon: CheckCircle, color: 'bg-white', textColor: 'text-[#000052]' },
    { label: 'Ожидающие выплаты', value: metrics.pendingPayouts, icon: Clock, color: 'bg-[#B8860B]', textColor: 'text-white', prefix: '$' },
  ];

  // Расчёт процентов для pie chart
  const totalStreams = streamsByType.reduce((sum, s) => sum + s.total, 0);
  const colors = ['#000052', '#B8860B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Финансовое ядро</h1>
        <p className="text-sm text-[#000052]/70 mt-1">Ключевые метрики бизнеса в реальном времени</p>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className={`${kpi.color} ${kpi.textColor} p-5 rounded-xl border border-[#000052]/10`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium opacity-80">{kpi.label}</h3>
                <Icon className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-2xl font-bold">
                {kpi.prefix || ''}{kpi.value.toLocaleString()}{kpi.suffix || ''}
              </p>
            </div>
          );
        })}
      </div>

      {/* Распределение бюджета + Быстрые действия */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pie chart распределения */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-[#B8860B]" />
            <h2 className="text-lg font-bold text-[#000052]">Распределение бюджета</h2>
          </div>

          {streamsByType.length === 0 ? (
            <div className="text-center py-12 text-[#000052]/60">
              <PieChartIcon className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
              <p>Данных пока нет</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              {/* SVG Pie Chart */}
              <svg viewBox="0 0 200 200" className="w-48 h-48 flex-shrink-0">
                {(() => {
                  let cumulativePercent = 0;
                  return streamsByType.map((stream, i) => {
                    const percent = totalStreams > 0 ? (stream.total / totalStreams) * 100 : 0;
                    const startAngle = (cumulativePercent / 100) * 360;
                    cumulativePercent += percent;
                    const endAngle = (cumulativePercent / 100) * 360;

                    const startRad = (startAngle - 90) * Math.PI / 180;
                    const endRad = (endAngle - 90) * Math.PI / 180;

                    const x1 = 100 + 80 * Math.cos(startRad);
                    const y1 = 100 + 80 * Math.sin(startRad);
                    const x2 = 100 + 80 * Math.cos(endRad);
                    const y2 = 100 + 80 * Math.sin(endRad);

                    const largeArc = percent > 50 ? 1 : 0;

                    const d = `M 100 100 L ${x1} ${y1} A 80 80 0 ${largeArc} 1 ${x2} ${y2} Z`;

                    return (
                      <path key={i} d={d} fill={colors[i % colors.length]} opacity="0.85">
                        <title>{`${stream.title}: $${stream.total.toLocaleString()} (${percent.toFixed(1)}%)`}</title>
                      </path>
                    );
                  });
                })()}
                <circle cx="100" cy="100" r="40" fill="white" />
                <text x="100" y="95" textAnchor="middle" fontSize="12" fill="#000052" fontWeight="bold">Всего</text>
                <text x="100" y="112" textAnchor="middle" fontSize="14" fill="#B8860B" fontWeight="bold">${(totalStreams / 1000).toFixed(0)}K</text>
              </svg>

              {/* Легенда */}
              <div className="flex-1 space-y-2 w-full">
                {streamsByType.map((stream, i) => {
                  const percent = totalStreams > 0 ? ((stream.total / totalStreams) * 100).toFixed(1) : '0';
                  return (
                    <div key={i} className="flex items-center justify-between p-2 hover:bg-[#000052]/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }}></div>
                        <span className="text-sm text-[#000052]">{stream.title}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#000052]">${stream.total.toLocaleString()}</div>
                        <div className="text-xs text-[#000052]/60">{percent}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Быстрые действия */}
        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4">Быстрые действия</h2>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/ceo/contracts')}
              className="w-full flex items-center gap-3 p-3 bg-[#000052]/5 hover:bg-[#000052]/10 rounded-lg transition text-left"
            >
              <CheckCircle className="w-5 h-5 text-[#B8860B]" />
              <div>
                <div className="text-sm font-semibold text-[#000052]">Контракты</div>
                <div className="text-xs text-[#000052]/60">Управление смарт-контрактами</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/ceo/agents')}
              className="w-full flex items-center gap-3 p-3 bg-[#000052]/5 hover:bg-[#000052]/10 rounded-lg transition text-left"
            >
              <Users className="w-5 h-5 text-[#B8860B]" />
              <div>
                <div className="text-sm font-semibold text-[#000052]">Агенты</div>
                <div className="text-xs text-[#000052]/60">Команда и эффективность</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/ceo/integrations')}
              className="w-full flex items-center gap-3 p-3 bg-[#000052]/5 hover:bg-[#000052]/10 rounded-lg transition text-left"
            >
              <Shield className="w-5 h-5 text-[#B8860B]" />
              <div>
                <div className="text-sm font-semibold text-[#000052]">Интеграции</div>
                <div className="text-xs text-[#000052]/60">CRM и оракул</div>
              </div>
            </button>

            <button
              onClick={() => navigate('/ceo/accounting')}
              className="w-full flex items-center gap-3 p-3 bg-[#000052]/5 hover:bg-[#000052]/10 rounded-lg transition text-left"
            >
              <DollarSign className="w-5 h-5 text-[#B8860B]" />
              <div>
                <div className="text-sm font-semibold text-[#000052]">Бухгалтерия</div>
                <div className="text-xs text-[#000052]/60">Финансовые отчёты</div>
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Эффективность агентов */}
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <BarChart3 className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">Эффективность агентов</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-[#000052]/10">
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Агент</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Специализация</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Средний KPI</th>
                <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase">Статус</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#000052]/5">
              {DEMO_AGENTS.map((agent) => {
                const kpi = calculateAgentKPI(agent);
                return (
                  <tr key={agent.id} onClick={() => navigate(`/ceo/agents/${agent.id}`)} className="hover:bg-[#000052]/5 cursor-pointer transition">
                    <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{agent.full_name}</td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70">{agent.specialization}</td>
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-2 bg-[#000052]/10 rounded-full overflow-hidden max-w-[100px]">
                          <div 
                            className={`h-full rounded-full ${kpi > 100 ? 'bg-[#B8860B]' : kpi < 80 ? 'bg-red-600' : 'bg-[#000052]'}`} 
                            style={{ width: `${Math.min(kpi, 100)}%` }}
                          ></div>
                        </div>
                        <span className={`text-sm font-bold ${kpi > 100 ? 'text-[#B8860B]' : kpi < 80 ? 'text-red-600' : 'text-[#000052]'}`}>
                          {kpi}%
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-semibold rounded-full">
                        Активен
                      </span>
                    </td>
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