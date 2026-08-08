import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import {
  DollarSign,
  Shield,
  Users,
  TrendingUp,
  Clock,
  CheckCircle,
  PieChart as PieChartIcon,
  BarChart3,
} from 'lucide-react';
import { DEMO_AGENTS } from '../../lib/demoData';
import { getEscrowAmount, getPaidAmount } from '../../lib/annualBonus';

const isActiveContract = (contract: any) =>
  contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS';

const numberValue = (value: any) => Number(value || 0);

const salesPlanPercent = (contract: any) => {
  const plannedRevenue = numberValue(
    contract.planned_revenue || contract.sales_plan || contract.target_revenue
  );
  const actualRevenue = numberValue(
    contract.actual_revenue || contract.revenue || contract.sales_amount
  );

  if (plannedRevenue > 0) {
    return Math.max(0, Math.round((actualRevenue / plannedRevenue) * 100));
  }

  const pairs = [
    [contract.actual_calls, contract.kpi_calls],
    [contract.actual_meetings, contract.kpi_meetings],
    [contract.actual_proposals, contract.kpi_proposals],
    [contract.actual_clients, contract.target_clients],
  ].filter(([, target]) => numberValue(target) > 0);

  if (pairs.length > 0) {
    return Math.max(
      0,
      Math.round(
        pairs.reduce(
          (sum, [actual, target]) =>
            sum + (numberValue(actual) / numberValue(target)) * 100,
          0
        ) / pairs.length
      )
    );
  }

  return 0;
};

const getPeriodStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const isInCurrentPeriod = (stream: any) => {
  const dateValue = stream.paid_at || stream.payment_date || stream.updated_at || stream.created_at;
  if (!dateValue) return false;
  const date = new Date(dateValue);
  return !Number.isNaN(date.getTime()) && date >= getPeriodStart();
};

export function CEODashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalEscrow: 0,
    totalPaidToAgents: 0,
    netProfit: 0,
    avgROI: 0,
    activeContracts: 0,
    pendingPayouts: 0,
    periodPaid: 0,
    periodPending: 0,
  });
  const [streamsByType, setStreamsByType] = useState<any[]>([]);
  const [agentEfficiency, setAgentEfficiency] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const loadMetrics = async () => {
      try {
        const demoContracts = DEMO_AGENTS.flatMap(agent =>
          agent.contracts.map(contract => ({
            ...contract,
            agent_id: agent.id,
            agent_name: agent.full_name,
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
        let realAgents: any[] = [];

        if (companyData) {
          const { data: agents, error: agentsError } = await supabase
            .from('agents')
            .select('*')
            .eq('company_id', companyData.id);

          if (agentsError) throw agentsError;
          realAgents = agents || [];

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

        const realAgentNames = new Map(
          realAgents.map(agent => [
            agent.id,
            agent.full_name || agent.name || agent.email || 'Агент',
          ])
        );

        const normalizedRealContracts = realContracts.map(contract => ({
          ...contract,
          agent_name: realAgentNames.get(contract.agent_id) || 'Агент',
          is_demo: false,
        }));

        const contractsById = new Map<string, any>();
        [...demoContracts, ...normalizedRealContracts].forEach(contract =>
          contractsById.set(contract.id, contract)
        );

        const allContracts = Array.from(contractsById.values());
        const activeContracts = allContracts.filter(isActiveContract);
        const activeIds = new Set(activeContracts.map(c => c.id));
        const activeRealIds = new Set(
          realContracts.filter(isActiveContract).map(c => c.id)
        );
        const activeRealStreams = realStreams.filter(stream =>
          activeRealIds.has(stream.contract_id)
        );

        let totalRevenue = 0;
        let totalEscrow = 0;
        let totalPaidToAgents = 0;
        let netProfit = 0;
        let roiSum = 0;
        let roiCount = 0;
        let pendingPayouts = 0;
        let periodPaid = 0;
        let periodPending = 0;

        const grouped: Record<
          string,
          { key: string; title: string; total: number }
        > = {};
        const efficiencyGroups: Record<
          string,
          { name: string; total: number; count: number }
        > = {};

        activeContracts.forEach(contract => {
          const isDemo = contract.is_demo === true;
          const streams = isDemo
            ? contract.payout_streams || []
            : activeRealStreams.filter(s => s.contract_id === contract.id);

          const escrow = isDemo
            ? getEscrowAmount(contract, streams)
            : numberValue(contract.escrow_amount);

          const paid = isDemo
            ? getPaidAmount(streams)
            : streams
                .filter(s => s.status === 'PAID')
                .reduce((sum, s) => sum + numberValue(s.amount), 0);

          const pending = streams
            .filter(s => s.status === 'UNLOCKED' || s.status === 'PAYABLE')
            .reduce((sum, s) => sum + numberValue(s.amount), 0);

          const revenue = numberValue(
            contract.revenue || contract.planned_revenue
          );
          const profit = isDemo
            ? revenue - escrow
            : numberValue(contract.company_profit || revenue - escrow);

          totalRevenue += revenue;
          totalEscrow += escrow;
          totalPaidToAgents += paid;
          pendingPayouts += pending;
          netProfit += profit;

          if (contract.roi_percentage != null) {
            roiSum += numberValue(contract.roi_percentage);
            roiCount += 1;
          } else if (revenue > 0) {
            roiSum += Math.round((profit / revenue) * 100);
            roiCount += 1;
          }

          streams
            .filter(s => s.stream_key !== 'annual')
            .forEach(stream => {
              const key = stream.stream_key || 'other';
              if (!grouped[key]) {
                grouped[key] = {
                  key,
                  title: stream.title || key,
                  total: 0,
                };
              }
              grouped[key].total += numberValue(stream.amount);
            });

          const agentKey = contract.agent_id || contract.agent_name || contract.id;
          const agentName = contract.agent_name || 'Агент';

          if (!efficiencyGroups[agentKey]) {
            efficiencyGroups[agentKey] = {
              name: agentName,
              total: 0,
              count: 0,
            };
          }

          efficiencyGroups[agentKey].total += salesPlanPercent(contract);
          efficiencyGroups[agentKey].count += 1;
        });

        // Выплаты за текущий месяц. На 8 августа 2026 это август 2026.
        realStreams.forEach(stream => {
          const amount = numberValue(stream.amount);
          if (stream.status === 'PAID' && isInCurrentPeriod(stream)) {
            periodPaid += amount;
          }
          if (stream.status === 'UNLOCKED' || stream.status === 'PAYABLE') {
            periodPending += amount;
          }
        });

        realAgents.forEach(agent => {
          if (!efficiencyGroups[agent.id]) {
            efficiencyGroups[agent.id] = {
              name: agent.full_name || agent.name || agent.email || 'Агент',
              total: 0,
              count: 0,
            };
          }
        });

        setAgentEfficiency(
          Object.values(efficiencyGroups)
            .map(item => ({
              name: item.name,
              value:
                item.count > 0
                  ? Math.max(0, Math.round(item.total / item.count))
                  : 0,
            }))
            .sort((a, b) => b.value - a.value)
        );

        setStreamsByType(
          Object.values(grouped).filter(item => item.key !== 'annual')
        );

        setMetrics({
          totalRevenue,
          totalEscrow,
          totalPaidToAgents,
          netProfit,
          avgROI: roiCount > 0 ? Math.round(roiSum / roiCount) : 0,
          activeContracts: activeIds.size,
          pendingPayouts,
          periodPaid,
          periodPending,
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
          periodPaid: 0,
          periodPending: 0,
        });
        setStreamsByType([]);
        setAgentEfficiency([]);
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
    {
      label: 'Общая выручка',
      value: metrics.totalRevenue,
      icon: DollarSign,
      color: 'bg-[#000052]',
      textColor: 'text-white',
      prefix: '$',
    },
    {
      label: 'Прибыль',
      value: metrics.netProfit,
      icon: TrendingUp,
      color: 'bg-white',
      textColor: 'text-[#000052]',
      prefix: '$',
    },
    {
      label: 'Средний ROI',
      value: metrics.avgROI,
      icon: BarChart3,
      color: 'bg-green-600',
      textColor: 'text-white',
      suffix: '%',
    },
    {
      label: 'Активные контракты',
      value: metrics.activeContracts,
      icon: CheckCircle,
      color: 'bg-white',
      textColor: 'text-[#000052]',
    },
  ];

  const totalStreams = streamsByType.reduce(
    (sum, stream) => sum + stream.total,
    0
  );
  const paymentBase = metrics.periodPaid + metrics.periodPending;
  const paymentProgress =
    paymentBase > 0
      ? Math.min(100, Math.round((metrics.periodPaid / paymentBase) * 100))
      : 0;
  const colors = [
    '#000052',
    '#B8860B',
    '#10B981',
    '#3B82F6',
    '#EF4444',
    '#8B5CF6',
  ];

  const performanceClass = (value: number) => {
    if (value < 80) return 'bg-red-500';
    if (value > 100) return 'bg-emerald-500';
    return 'bg-[#B8860B]';
  };

  const performanceLabel = (value: number) => {
    if (value < 80) return 'Критично';
    if (value > 100) return 'Перевыполнение';
    if (value === 100) return 'План выполнен';
    return 'Выполнение плана';
  };

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">
          Финансовое ядро
        </h1>
        <p className="text-sm text-[#000052]/70 mt-1">
          Ключевые финансовые показатели компании
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div
              key={index}
              className={`${kpi.color} ${kpi.textColor} p-5 rounded-xl border border-[#000052]/10`}
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium opacity-80">{kpi.label}</h3>
                <Icon className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-2xl font-bold">
                {kpi.prefix || ''}
                {kpi.value.toLocaleString()}
                {kpi.suffix || ''}
              </p>
            </div>
          );
        })}
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[#B8860B]" />
              <h2 className="text-lg font-bold text-[#000052]">
                Движение средств за август
              </h2>
            </div>
            <p className="text-sm text-[#000052]/60 mt-1">
              Эскроу, фактически выплаченные и ожидающие выплаты агентам
            </p>
          </div>
          <div className="text-right">
            <div className="text-xs text-[#000052]/60">В эскроу</div>
            <div className="text-xl font-bold text-[#000052]">
              ${metrics.totalEscrow.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="h-5 bg-[#000052]/10 rounded-full overflow-hidden flex">
          <div
            className="h-full bg-emerald-500 transition-all"
            style={{ width: `${paymentProgress}%` }}
            title={`Выплачено: $${metrics.periodPaid.toLocaleString()}`}
          />
          <div
            className="h-full bg-[#B8860B] transition-all"
            style={{ width: `${Math.max(0, 100 - paymentProgress)}%` }}
            title={`Ожидает выплаты: $${metrics.periodPending.toLocaleString()}`}
          />
        </div>

        <div className="grid grid-cols-3 gap-4 mt-4 text-sm">
          <div>
            <div className="flex items-center gap-2 text-[#000052]/60">
              <span className="w-2.5 h-2.5 rounded-full bg-[#000052]" />
              Эскроу
            </div>
            <div className="font-bold text-[#000052] mt-1">
              ${metrics.totalEscrow.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[#000052]/60">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              Выплачено в августе
            </div>
            <div className="font-bold text-emerald-600 mt-1">
              ${metrics.periodPaid.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2 text-[#000052]/60">
              <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B]" />
              Ожидает выплаты
            </div>
            <div className="font-bold text-[#B8860B] mt-1">
              ${metrics.periodPending.toLocaleString()}
            </div>
          </div>
        </div>

        <div className="flex justify-between mt-3 text-xs text-[#000052]/60">
          <span>Выплачено: {paymentProgress}%</span>
          <span>Ожидает: {Math.max(0, 100 - paymentProgress)}%</span>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-5">
          <BarChart3 className="w-5 h-5 text-[#B8860B]" />
          <div>
            <h2 className="text-lg font-bold text-[#000052]">
              Выполнение плана агентами
            </h2>
            <p className="text-sm text-[#000052]/60">
              Процент выполнения плана продаж по каждому агенту
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 mb-6 text-xs text-[#000052]/70">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
            Ниже 80% — критично
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#B8860B]" />
            80–100% — выполнение плана
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            Выше 100% — перевыполнение
          </span>
        </div>

        {agentEfficiency.length === 0 ? (
          <div className="text-center py-8 text-[#000052]/60">
            Данные по выполнению плана пока недоступны
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-end">
            {agentEfficiency.map((agent, index) => {
              const barHeight = Math.max(8, Math.min(180, (agent.value / 120) * 180));
              const statusColor = performanceClass(agent.value);
              return (
                <div
                  key={`${agent.name}-${index}`}
                  className="flex flex-col items-center"
                >
                  <div className="w-full h-[190px] flex items-end justify-center relative border-b border-[#000052]/10">
                    <div
                      className={`w-12 sm:w-16 ${statusColor} rounded-t-lg transition-all relative`}
                      style={{ height: `${barHeight}px` }}
                    >
                      <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-[#000052] whitespace-nowrap">
                        {agent.value}%
                      </span>
                    </div>
                    <div className="absolute left-0 right-0 bottom-[150px] border-t border-dashed border-red-300/60" />
                    <div className="absolute left-0 right-0 bottom-[30px] border-t border-dashed border-[#B8860B]/40" />
                  </div>
                  <div className="text-center mt-3 w-full">
                    <div className="font-semibold text-sm text-[#000052] truncate">
                      {agent.name}
                    </div>
                    <div className="text-xs text-[#000052]/60 mt-1">
                      {performanceLabel(agent.value)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6">
          <PieChartIcon className="w-5 h-5 text-[#B8860B]" />
          <h2 className="text-lg font-bold text-[#000052]">
            Распределение бюджета
          </h2>
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
                    <path
                      key={stream.key}
                      d={d}
                      fill={colors[index % colors.length]}
                      opacity="0.85"
                    >
                      <title>{`${stream.title}: $${stream.total.toLocaleString()} (${percent.toFixed(1)}%)`}</title>
                    </path>
                  );
                });
              })()}
              <circle cx="100" cy="100" r="40" fill="white" />
              <text x="100" y="95" textAnchor="middle" fontSize="12" fill="#000052" fontWeight="bold">
                Всего
              </text>
              <text x="100" y="112" textAnchor="middle" fontSize="14" fill="#B8860B" fontWeight="bold">
                ${(totalStreams / 1000).toFixed(0)}K
              </text>
            </svg>

            <div className="flex-1 space-y-2 w-full">
              {streamsByType.map((stream, index) => {
                const percent =
                  totalStreams > 0
                    ? ((stream.total / totalStreams) * 100).toFixed(1)
                    : '0';
                return (
                  <div
                    key={stream.key}
                    className="flex items-center justify-between p-2 hover:bg-[#000052]/5 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{
                          backgroundColor: colors[index % colors.length],
                        }}
                      />
                      <span className="text-sm text-[#000052]">
                        {stream.title}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-[#000052]">
                        ${stream.total.toLocaleString()}
                      </div>
                      <div className="text-xs text-[#000052]/60">
                        {percent}%
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
