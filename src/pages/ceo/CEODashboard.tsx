import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Shield, Users, TrendingUp, Clock, CheckCircle, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { DEMO_AGENTS } from '../../lib/demoData';
import { getEscrowAmount, getPaidAmount, getLockedAmount } from '../../lib/annualBonus';

const isActiveContract = (contract: any) =>
  contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS';

const numberValue = (value: any) => Number(value || 0);

export function CEODashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
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
    if (!user) {
      setLoading(false);
      return;
    }

    const loadMetrics = async () => {
      try {
        // Демо-контракты всегда входят в финансовое ядро вместе с реальными.
        const demoContracts = DEMO_AGENTS.flatMap(agent =>
          agent.contracts.map(contract => ({
            ...contract,
            agent_id: agent.id,
            is_demo: true,
          }))
        );

        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        let realContracts: any[] = [];
        let realStreams: any[] = [];

        if (companyData) {
          const { data: contracts, error: contractsError } = await supabase
            .from('contracts')
            .select('*')
            .eq('company_id', companyData.id);

          if (contractsError) throw contractsError;
          realContracts = contracts || [];

          const contractIds = realContracts.map(c => c.id).filter(Boolean);
          if (contractIds.length > 0) {
            const { data: streams, error: streamsError } = await supabase
              .from('contract_payout_streams')
              .select('*')
              .in('contract_id', contractIds);

            if (streamsError) throw streamsError;
            realStreams = streams || [];
          }
        }

        // Объединяем по ID, затем считаем только активные контракты.
        const contractsById = new Map<string, any>();
        [...demoContracts, ...realContracts].forEach(contract => contractsById.set(contract.id, contract));
        const allContracts = Array.from(contractsById.values());
        const activeContracts = allContracts.filter(isActiveContract);
        const activeIds = new Set(activeContracts.map(c => c.id));
        const activeRealIds = new Set(realContracts.filter(isActiveContract).map(c => c.id));

        const activeRealStreams = realStreams.filter(stream => activeRealIds.has(stream.contract_id));

        let totalRevenue = 0;
        let totalEscrow = 0;
        let totalPaidToAgents = 0;
        let totalLocked = 0;
        let netProfit = 0;
        let roiSum = 0;
        let roiCount = 0;
        let pendingPayouts = 0;

        const grouped: Record<string, { key: string; title: string; total: number }> = {};

        activeContracts.forEach(contract => {
          const isDemo = contract.is_demo === true;
          const streams = isDemo ? (contract.payout_streams || []) : activeRealStreams.filter(s => s.contract_id === contract.id);

          const escrow = isDemo
            ? getEscrowAmount(contract, streams)
            : numberValue(contract.escrow_amount);
          const paid = isDemo
            ? getPaidAmount(streams)
            : streams.filter(s => s.status === 'PAID').reduce((sum, s) => sum + numberValue(s.amount), 0);
          const locked = isDemo
            ? getLockedAmount(streams)
            : streams.filter(s => s.status === 'LOCKED').reduce((sum, s) => sum + numberValue(s.amount), 0);
          const pending = streams
            .filter(s => s.status === 'UNLOCKED' || s.status === 'PAYABLE')
            .reduce((sum, s) => sum + numberValue(s.amount), 0);
          const revenue = numberValue(contract.revenue || contract.planned_revenue);
          const profit = isDemo ? revenue - escrow : numberValue(contract.company_profit || (revenue - escrow));

          totalRevenue += revenue;
          totalEscrow += escrow;
          totalPaidToAgents += paid;
          totalLocked += locked;
          pendingPayouts += pending;
          netProfit += profit;

          if (contract.roi_percentage != null) {
            roiSum += numberValue(contract.roi_percentage);
            roiCount += 1;
          } else if (revenue > 0) {
            roiSum += Math.round((profit / revenue) * 100);
            roiCount += 1;
          }

          streams.filter(s => s.stream_key !== 'annual').forEach(stream => {
            const key = stream.stream_key || 'other';
            if (!grouped[key]) {
              grouped[key] = { key, title: stream.title || key, total: 0 };
            }
            grouped[key].total += numberValue(stream.amount);
          });
        });

        // Не показываем годовой бонус в распределении бюджета: это не escrow.
        setStreamsByType(Object.values(grouped).filter(item => item.key !== 'annual'));
        setMetrics({
          totalRevenue,
          totalEscrow,
          totalPaidToAgents,
          netProfit,
          avgROI: roiCount > 0 ? Math.round(roiSum / roiCount) : 0,
          activeContracts: activeIds.size,
          pendingPayouts,
        });
      } catch (error) {
        console.error('Ошибка загрузки финансового ядра:', error);
        setMetrics({
          totalRevenue: 0,
          totalEscrow: 0,
          totalPaidToAgents: 0,
          netProfit: 0,
          avgROI: 0,
          activeContracts: 0,
          pendingPayouts: 0,
        });
        setStreamsByType([]);
      } finally {
        setLoading(false);
      }
    };

    loadMetrics();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]" />
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

  const totalStreams = streamsByType.reduce((sum, stream) => sum + stream.total, 0);
  const colors = ['#000052', '#B8860B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Финансовое ядро</h1>
        <p className="text-sm text-[#000052]/70 mt-1">Ключевые метрики по всем активным контрактам</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className={`${kpi.color} ${kpi.textColor} p-5 rounded-xl border border-[#000052]/10`}>
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

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-[#000052]/10">
          <div className="flex items-center gap-2 mb-6">
            <PieChartIcon className="w-5 h-5 text-[#B8860B]" />
            <h2 className="text-lg font-bold text-[#000052]">Распределение бюджета</h2>
          </div>

          {streamsByType.length === 0 ? (
            <div className="text-center py-12 text-[#000052]/60">
              <PieChartIcon className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
              <p>Активных потоков выплат пока нет</p>
            </div>
          ) : (
            <div className="flex flex-col md:flex-row items-center gap-6">
              <svg viewBox="0 0 200 200" className="w-48 h-48 flex-shrink-0">
                {(() => {
                  let cumulativePercent = 0;
                  return streamsByType.map((stream, index) => {
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
                      <path key={stream.key} d={d} fill={colors[index % colors.length]} opacity="0.85">
                        <title>{`${stream.title}: $${stream.total.toLocaleString()} (${percent.toFixed(1)}%)`}</title>
                      </path>
                    );
                  });
                })()}
                <circle cx="100" cy="100" r="40" fill="white" />
                <text x="100" y="95" textAnchor="middle" fontSize="12" fill="#000052" fontWeight="bold">Всего</text>
                <text x="100" y="112" textAnchor="middle" fontSize="14" fill="#B8860B" fontWeight="bold">${(totalStreams / 1000).toFixed(0)}K</text>
              </svg>

              <div className="flex-1 space-y-2 w-full">
                {streamsByType.map((stream, index) => {
                  const percent = totalStreams > 0 ? ((stream.total / totalStreams) * 100).toFixed(1) : '0';
                  return (
                    <div key={stream.key} className="flex items-center justify-between p-2 hover:bg-[#000052]/5 rounded-lg">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} />
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

        <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
          <h2 className="text-lg font-bold text-[#000052] mb-4">Быстрые действия</h2>
          <div className="space-y-3">
            <button onClick={() => navigate('/ceo/contracts')} className="w-full flex items-center gap-3 p-3 bg-[#000052]/5 hover:bg-[#000052]/10 rounded-lg transition text-left">
              <CheckCircle className="w-5 h-5 text-[#B8860B]" />
              <div><div className="text-sm font-semibold text-[#000052]">Контракты</div><div className="text-xs text-[#000052]/60">Управление смарт-контрактами</div></div>
            </button>
            <button onClick={() => navigate('/ceo/agents')} className="w-full flex items-center gap-3 p-3 bg-[#000052]/5 hover:bg-[#000052]/10 rounded-lg transition text-left">
              <Users className="w-5 h-5 text-[#B8860B]" />
              <div><div className="text-sm font-semibold text-[#000052]">Агенты</div><div className="text-xs text-[#000052]/60">Команда и эффективность</div></div>
            </button>
            <button onClick={() => navigate('/ceo/integrations')} className="w-full flex items-center gap-3 p-3 bg-[#000052]/5 hover:bg-[#000052]/10 rounded-lg transition text-left">
              <Shield className="w-5 h-5 text-[#B8860B]" />
              <div><div className="text-sm font-semibold text-[#000052]">Интеграции</div><div className="text-xs text-[#000052]/60">CRM и оракул</div></div>
            </button>
            <button onClick={() => navigate('/ceo/accounting')} className="w-full flex items-center gap-3 p-3 bg-[#000052]/5 hover:bg-[#000052]/10 rounded-lg transition text-left">
              <DollarSign className="w-5 h-5 text-[#B8860B]" />
              <div><div className="text-sm font-semibold text-[#000052]">Бухгалтерия</div><div className="text-xs text-[#000052]/60">Экспорт финансовых данных</div></div>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
