import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Shield, TrendingUp, CheckCircle, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { DEMO_AGENTS, calculateContractKPI } from '../../lib/demoData';
import { getEscrowAmount, getPaidAmount } from '../../lib/annualBonus';

const numberValue = (value: any) => Number(value || 0);
const isActive = (contract: any) => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS';

const getRealKPI = (contract: any) => {
  const pairs = [
    [contract.actual_calls, contract.kpi_calls],
    [contract.actual_meetings, contract.kpi_meetings],
    [contract.actual_proposals, contract.kpi_proposals],
    [contract.actual_clients, contract.target_clients],
  ].filter(([, target]) => numberValue(target) > 0);
  if (pairs.length) {
    return Math.round(pairs.reduce((sum, [actual, target]) => sum + (numberValue(actual) / numberValue(target)) * 100, 0) / pairs.length);
  }
  const planned = numberValue(contract.planned_revenue || contract.sales_plan || contract.target_revenue);
  const actual = numberValue(contract.actual_revenue || contract.revenue || contract.sales_amount);
  return planned > 0 ? Math.round((actual / planned) * 100) : 0;
};

const getPeriodStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const isCurrentMonth = (stream: any) => {
  const value = stream.paid_at || stream.unlocked_at || stream.payment_date || stream.updated_at || stream.created_at;
  if (!value) return false;
  const date = new Date(value);
  return !Number.isNaN(date.getTime()) && date >= getPeriodStart();
};

export function CEODashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalEscrow: 0, totalPaidToAgents: 0, netProfit: 0, avgROI: 0, activeContracts: 0, pendingPayouts: 0, periodPaid: 0, periodPending: 0 });
  const [streamsByType, setStreamsByType] = useState<any[]>([]);
  const [agentEfficiency, setAgentEfficiency] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }

    const loadMetrics = async () => {
      try {
        const demoContracts = DEMO_AGENTS.flatMap(agent => agent.contracts.map(contract => ({
          ...contract,
          agent_id: agent.id,
          agent_name: agent.full_name,
          is_demo: true,
        })));

        const { data: company, error: companyError } = await supabase
          .from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyError) throw companyError;

        let realAgents: any[] = [];
        let realContracts: any[] = [];
        let realStreams: any[] = [];

        if (company?.id) {
          const { data: agents, error: agentsError } = await supabase
            .from('agents').select('*').eq('company_id', company.id);
          if (agentsError) throw agentsError;
          realAgents = agents || [];

          const { data: contracts, error: contractsError } = await supabase
            .from('contracts').select('*').eq('company_id', company.id);
          if (contractsError) throw contractsError;
          realContracts = contracts || [];

          const ids = realContracts.map(c => c.id).filter(Boolean);
          if (ids.length) {
            const { data: streams, error: streamsError } = await supabase
              .from('contract_payout_streams').select('*').in('contract_id', ids);
            if (streamsError) throw streamsError;
            realStreams = streams || [];
          }
        }

        const names = new Map(realAgents.map(agent => [agent.id, agent.full_name || agent.name || agent.email || 'Агент']));
        const normalizedReal = realContracts.map(contract => ({ ...contract, agent_name: names.get(contract.agent_id) || 'Агент', is_demo: false }));

        // Финансовое ядро демонстрации: текущий контракт каждого из 6 демо-агентов + реальные контракты.
        // Реальный контракт Натальи учитывается независимо от его текущего статуса DRAFT, без изменения Supabase.
        const currentDemo = demoContracts.filter(isActive);
        const allContracts = [...currentDemo, ...normalizedReal];

        let totalRevenue = 0;
        let totalEscrow = 0;
        let totalPaidToAgents = 0;
        let netProfit = 0;
        let roiSum = 0;
        let roiCount = 0;
        let pendingPayouts = 0;
        let periodPaid = 0;
        let periodPending = 0;
        const grouped: Record<string, { key: string; title: string; total: number }> = {};
        const efficiency: Record<string, { name: string; total: number; count: number }> = {};

        allContracts.forEach(contract => {
          const streams = contract.is_demo
            ? contract.payout_streams || []
            : realStreams.filter(stream => stream.contract_id === contract.id);

          const streamEscrow = getEscrowAmount(contract, streams);
          const escrow = streamEscrow > 0 ? streamEscrow : numberValue(contract.escrow_amount);
          const paid = getPaidAmount(streams);
          const pending = streams
            .filter(stream => (stream.status === 'UNLOCKED' || stream.status === 'PAYABLE') && isCurrentMonth(stream))
            .reduce((sum, stream) => sum + numberValue(stream.amount), 0);

          const revenue = numberValue(contract.revenue || contract.planned_revenue);
          const profit = contract.is_demo ? revenue - escrow : numberValue(contract.company_profit || revenue - escrow);
          const roi = contract.roi_percentage != null ? numberValue(contract.roi_percentage) : revenue > 0 ? Math.round((profit / revenue) * 100) : 0;

          totalRevenue += revenue;
          totalEscrow += escrow;
          totalPaidToAgents += paid;
          pendingPayouts += pending;
          netProfit += profit;
          if (revenue > 0) { roiSum += roi; roiCount += 1; }

          streams.filter(stream => stream.stream_key !== 'annual').forEach(stream => {
            const key = stream.stream_key || 'other';
            if (!grouped[key]) grouped[key] = { key, title: stream.title || key, total: 0 };
            grouped[key].total += numberValue(stream.amount);
            if (stream.status === 'PAID' && isCurrentMonth(stream)) periodPaid += numberValue(stream.amount);
          });

          const agentKey = contract.agent_id || contract.agent_name || contract.id;
          if (!efficiency[agentKey]) efficiency[agentKey] = { name: contract.agent_name || 'Агент', total: 0, count: 0 };
          efficiency[agentKey].total += contract.is_demo ? calculateContractKPI(contract) : getRealKPI(contract);
          efficiency[agentKey].count += 1;
        });

        // Все реальные агенты компании должны присутствовать в списке, даже если у них нет контракта.
        realAgents.forEach(agent => {
          if (!efficiency[agent.id]) efficiency[agent.id] = { name: agent.full_name || agent.name || agent.email || 'Агент', total: 0, count: 0 };
        });

        periodPending = allContracts.reduce((sum, contract) => {
          const streams = contract.is_demo ? contract.payout_streams || [] : realStreams.filter(stream => stream.contract_id === contract.id);
          return sum + streams
            .filter(stream => (stream.status === 'UNLOCKED' || stream.status === 'PAYABLE') && isCurrentMonth(stream))
            .reduce((s, stream) => s + numberValue(stream.amount), 0);
        }, 0);

        setAgentEfficiency(Object.values(efficiency).map(item => ({
          name: item.name,
          value: item.count ? Math.max(0, Math.round(item.total / item.count)) : 0,
        })).sort((a, b) => b.value - a.value));

        setStreamsByType(Object.values(grouped).filter(item => item.key !== 'annual'));
        setMetrics({
          totalRevenue,
          totalEscrow,
          totalPaidToAgents,
          netProfit,
          avgROI: roiCount ? Math.round(roiSum / roiCount) : 0,
          activeContracts: allContracts.length,
          pendingPayouts,
          periodPaid,
          periodPending,
        });
      } catch (error) {
        console.error('Ошибка загрузки финансового ядра:', error);
        setMetrics({ totalRevenue: 0, totalEscrow: 0, totalPaidToAgents: 0, netProfit: 0, avgROI: 0, activeContracts: 0, pendingPayouts: 0, periodPaid: 0, periodPending: 0 });
        setStreamsByType([]);
        setAgentEfficiency([]);
      } finally { setLoading(false); }
    };
    loadMetrics();
  }, [user]);

  if (loading) return <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]" /><p className="mt-4 text-[#000052]">Загрузка...</p></div>;

  const kpis = [
    { label: 'Общая выручка', value: metrics.totalRevenue, icon: DollarSign, color: 'bg-[#000052]', textColor: 'text-white', prefix: '$' },
    { label: 'Прибыль', value: metrics.netProfit, icon: TrendingUp, color: 'bg-white', textColor: 'text-[#000052]', prefix: '$' },
    { label: 'Средний ROI', value: metrics.avgROI, icon: BarChart3, color: 'bg-green-600', textColor: 'text-white', suffix: '%' },
    { label: 'Активные контракты', value: metrics.activeContracts, icon: CheckCircle, color: 'bg-white', textColor: 'text-[#000052]' },
  ];
  const totalStreams = streamsByType.reduce((sum, stream) => sum + stream.total, 0);
  const paymentBase = metrics.periodPaid + metrics.periodPending;
  const paymentProgress = paymentBase ? Math.min(100, Math.round((metrics.periodPaid / paymentBase) * 100)) : 0;
  const colors = ['#000052', '#B8860B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];
  const performanceClass = (value: number) => value < 80 ? 'bg-red-500' : value > 100 ? 'bg-emerald-500' : 'bg-[#B8860B]';
  const performanceLabel = (value: number) => value < 80 ? 'Критично' : value > 100 ? 'Перевыполнение' : value === 100 ? 'План выполнен' : 'Выполнение плана';

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Финансовое ядро</h1><p className="text-sm text-[#000052]/70 mt-1">Ключевые финансовые показатели компании</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{kpis.map((kpi, index) => { const Icon = kpi.icon; return <div key={index} className={`${kpi.color} ${kpi.textColor} p-5 rounded-xl border border-[#000052]/10`}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-80">{kpi.label}</h3><Icon className="w-5 h-5 opacity-80" /></div><p className="text-2xl font-bold">{kpi.prefix || ''}{kpi.value.toLocaleString()}{kpi.suffix || ''}</p></div>; })}</div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Движение средств за август</h2></div><p className="text-sm text-[#000052]/60 mt-1">Эскроу, фактически выплаченные и ожидающие выплаты всем 7 агентам</p></div><div className="text-right"><div className="text-xs text-[#000052]/60">В эскроу</div><div className="text-xl font-bold text-[#000052]">${metrics.totalEscrow.toLocaleString()}</div></div></div>
        <div className="h-5 bg-[#000052]/10 rounded-full overflow-hidden flex"><div className="h-full bg-emerald-500" style={{ width: `${paymentProgress}%` }} title={`Выплачено: $${metrics.periodPaid.toLocaleString()}`} /><div className="h-full bg-[#B8860B]" style={{ width: `${100 - paymentProgress}%` }} title={`Ожидает выплаты: $${metrics.periodPending.toLocaleString()}`} /></div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm"><div><div className="text-[#000052]/60">Эскроу</div><div className="font-bold text-[#000052] mt-1">${metrics.totalEscrow.toLocaleString()}</div></div><div><div className="text-[#000052]/60">Выплачено в августе</div><div className="font-bold text-emerald-600 mt-1">${metrics.periodPaid.toLocaleString()}</div></div><div><div className="text-[#000052]/60">Ожидает выплаты</div><div className="font-bold text-[#B8860B] mt-1">${metrics.periodPending.toLocaleString()}</div></div></div>
        <div className="flex justify-between mt-3 text-xs text-[#000052]/60"><span>Выплачено: {paymentProgress}%</span><span>Ожидает: {100 - paymentProgress}%</span></div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-5"><BarChart3 className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">Выполнение плана агентами</h2><p className="text-sm text-[#000052]/60">Процент выполнения плана продаж по каждому агенту</p></div></div><div className="flex flex-wrap gap-3 mb-6 text-xs text-[#000052]/70"><span>🔴 Ниже 80% — критично</span><span>🟡 80–100% — выполнение плана</span><span>🟢 Выше 100% — перевыполнение</span></div>{agentEfficiency.length === 0 ? <div className="text-center py-8 text-[#000052]/60">Данные по выполнению плана пока недоступны</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-end">{agentEfficiency.map((agent, index) => { const barHeight = Math.max(8, Math.min(180, (agent.value / 120) * 180)); return <div key={`${agent.name}-${index}`} className="flex flex-col items-center"><div className="w-full h-[190px] flex items-end justify-center relative border-b border-[#000052]/10"><div className={`w-12 sm:w-16 ${performanceClass(agent.value)} rounded-t-lg relative`} style={{ height: `${barHeight}px` }}><span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-[#000052] whitespace-nowrap">{agent.value}%</span></div></div><div className="text-center mt-3 w-full"><div className="font-semibold text-sm text-[#000052] truncate">{agent.name}</div><div className="text-xs text-[#000052]/60 mt-1">{performanceLabel(agent.value)}</div></div></div>; })}</div>}</div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-6"><PieChartIcon className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Распределение бюджета</h2></div>{streamsByType.length === 0 ? <div className="text-center py-12 text-[#000052]/60">Активных потоков выплат пока нет</div> : <div className="flex flex-col md:flex-row items-center gap-6"><svg viewBox="0 0 200 200" className="w-48 h-48 flex-shrink-0">{(() => { let cumulative = 0; return streamsByType.map((stream, index) => { const percent = totalStreams ? stream.total / totalStreams * 100 : 0; const start = (cumulative / 100) * 360; cumulative += percent; const end = (cumulative / 100) * 360; const sr = (start - 90) * Math.PI / 180; const er = (end - 90) * Math.PI / 180; const x1 = 100 + 80 * Math.cos(sr); const y1 = 100 + 80 * Math.sin(sr); const x2 = 100 + 80 * Math.cos(er); const y2 = 100 + 80 * Math.sin(er); const d = `M 100 100 L ${x1} ${y1} A 80 80 0 ${percent > 50 ? 1 : 0} 1 ${x2} ${y2} Z`; return <path key={stream.key} d={d} fill={colors[index % colors.length]} opacity="0.85"><title>{`${stream.title}: $${stream.total.toLocaleString()} (${percent.toFixed(1)}%)`}</title></path>; }); })()}<circle cx="100" cy="100" r="40" fill="white" /><text x="100" y="95" textAnchor="middle" fontSize="12" fill="#000052" fontWeight="bold">Всего</text><text x="100" y="112" textAnchor="middle" fontSize="14" fill="#B8860B" fontWeight="bold">${(totalStreams / 1000).toFixed(0)}K</text></svg><div className="flex-1 space-y-2 w-full">{streamsByType.map((stream, index) => { const percent = totalStreams ? ((stream.total / totalStreams) * 100).toFixed(1) : '0'; return <div key={stream.key} className="flex items-center justify-between p-2 hover:bg-[#000052]/5 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><span className="text-sm text-[#000052]">{stream.title}</span></div><div className="text-right"><div className="text-sm font-bold text-[#000052]">${stream.total.toLocaleString()}</div><div className="text-xs text-[#000052]/60">{percent}%</div></div></div>; })}</div></div>}</div>
    </div>
  );
}
