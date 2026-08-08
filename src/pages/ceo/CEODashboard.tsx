import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Shield, TrendingUp, CheckCircle, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { DEMO_AGENTS } from '../../lib/demoData';
import { getEscrowAmount, getPaidAmount } from '../../lib/annualBonus';

const numberValue = (value: any) => Number(value || 0);
const isActiveContract = (contract: any) => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS';

/*
 * План продаж = "Общая выручка по договорам" при создании договора.
 * KPI звонков/встреч/предложений здесь НЕ используются.
 * Факт = фактическая выручка/продажи по договору.
 */
const getSalesPlan = (contract: any) => numberValue(
  contract.revenue ??
  contract.total_revenue ??
  contract.planned_revenue ??
  contract.sales_plan ??
  contract.target_revenue
);

const getActualSales = (contract: any) => numberValue(
  contract.actual_revenue ??
  contract.sales_amount ??
  contract.actual_sales ??
  contract.realized_revenue
);

const getPeriodStart = () => {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
};

const isInCurrentPeriod = (stream: any) => {
  const value = stream.paid_at || stream.payment_date || stream.updated_at || stream.created_at;
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
        const demoContracts = DEMO_AGENTS.flatMap(agent => agent.contracts.map(contract => ({ ...contract, agent_id: agent.id, agent_name: agent.full_name, is_demo: true })));
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        let realContracts: any[] = [];
        let realStreams: any[] = [];
        let realAgents: any[] = [];

        if (companyData) {
          const { data: agents, error: agentsError } = await supabase.from('agents').select('*').eq('company_id', companyData.id);
          if (agentsError) throw agentsError;
          realAgents = agents || [];
          const { data: contracts, error: contractsError } = await supabase.from('contracts').select('*').eq('company_id', companyData.id);
          if (contractsError) throw contractsError;
          realContracts = contracts || [];
          const ids = realContracts.map(c => c.id).filter(Boolean);
          if (ids.length) {
            const { data: streams, error: streamsError } = await supabase.from('contract_payout_streams').select('*').in('contract_id', ids);
            if (streamsError) throw streamsError;
            realStreams = streams || [];
          }
        }

        const names = new Map(realAgents.map(a => [a.id, a.full_name || a.name || a.email || 'Агент']));
        const normalized = realContracts.map(c => ({ ...c, agent_name: names.get(c.agent_id) || 'Агент', is_demo: false }));
        const byId = new Map<string, any>();
        [...demoContracts, ...normalized].forEach(c => byId.set(c.id, c));
        const allContracts = [...byId.values()];
        const activeContracts = allContracts.filter(isActiveContract);
        const activeRealIds = new Set(realContracts.filter(isActiveContract).map(c => c.id));
        const activeRealStreams = realStreams.filter(s => activeRealIds.has(s.contract_id));

        let totalRevenue = 0, totalEscrow = 0, totalPaidToAgents = 0, netProfit = 0, roiSum = 0, roiCount = 0, pendingPayouts = 0, periodPaid = 0, periodPending = 0;
        const grouped: Record<string, { key: string; title: string; total: number }> = {};
        const efficiency: Record<string, { name: string; plan: number; actual: number }> = {};

        activeContracts.forEach(contract => {
          const isDemo = contract.is_demo === true;
          const streams = isDemo ? contract.payout_streams || [] : activeRealStreams.filter(s => s.contract_id === contract.id);
          const escrow = isDemo ? getEscrowAmount(contract, streams) : numberValue(contract.escrow_amount);
          const paid = isDemo ? getPaidAmount(streams) : streams.filter(s => s.status === 'PAID').reduce((sum, s) => sum + numberValue(s.amount), 0);
          const pending = streams.filter(s => s.status === 'UNLOCKED' || s.status === 'PAYABLE').reduce((sum, s) => sum + numberValue(s.amount), 0);
          const revenue = getSalesPlan(contract);
          const profit = isDemo ? revenue - escrow : numberValue(contract.company_profit ?? revenue - escrow);
          totalRevenue += revenue; totalEscrow += escrow; totalPaidToAgents += paid; pendingPayouts += pending; netProfit += profit;

          if (contract.roi_percentage != null) { roiSum += numberValue(contract.roi_percentage); roiCount++; }
          else if (revenue > 0) { roiSum += Math.round((profit / revenue) * 100); roiCount++; }

          streams.filter(s => s.stream_key !== 'annual').forEach(stream => {
            const key = stream.stream_key || 'other';
            if (!grouped[key]) grouped[key] = { key, title: stream.title || key, total: 0 };
            grouped[key].total += numberValue(stream.amount);
          });

          const key = contract.agent_id || contract.agent_name || contract.id;
          if (!efficiency[key]) efficiency[key] = { name: contract.agent_name || 'Агент', plan: 0, actual: 0 };
          efficiency[key].plan += getSalesPlan(contract);
          efficiency[key].actual += getActualSales(contract);
        });

        realAgents.forEach(agent => {
          if (!efficiency[agent.id]) efficiency[agent.id] = { name: agent.full_name || agent.name || agent.email || 'Агент', plan: 0, actual: 0 };
        });

        realStreams.forEach(stream => {
          const amount = numberValue(stream.amount);
          if (stream.status === 'PAID' && isInCurrentPeriod(stream)) periodPaid += amount;
          if (stream.status === 'UNLOCKED' || stream.status === 'PAYABLE') periodPending += amount;
        });

        setAgentEfficiency(Object.values(efficiency).map(item => ({
          name: item.name,
          plan: item.plan,
          actual: item.actual,
          value: item.plan > 0 ? Math.round((item.actual / item.plan) * 100) : 0,
        })).sort((a, b) => b.value - a.value));
        setStreamsByType(Object.values(grouped).filter(item => item.key !== 'annual'));
        setMetrics({ totalRevenue, totalEscrow, totalPaidToAgents, netProfit, avgROI: roiCount ? Math.round(roiSum / roiCount) : 0, activeContracts: activeContracts.length, pendingPayouts, periodPaid, periodPending });
      } catch (error) {
        console.error('Ошибка загрузки финансового ядра:', error);
        setStreamsByType([]); setAgentEfficiency([]);
      } finally { setLoading(false); }
    };
    loadMetrics();
  }, [user]);

  if (loading) return <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]" /><p className="mt-4 text-[#000052]">Загрузка...</p></div>;

  const kpis = [
    ['Общая выручка', metrics.totalRevenue, DollarSign, 'bg-[#000052]', 'text-white', '$', ''],
    ['Прибыль', metrics.netProfit, TrendingUp, 'bg-white', 'text-[#000052]', '$', ''],
    ['Средний ROI', metrics.avgROI, BarChart3, 'bg-green-600', 'text-white', '', '%'],
    ['Активные контракты', metrics.activeContracts, CheckCircle, 'bg-white', 'text-[#000052]', '', ''],
  ];
  const totalStreams = streamsByType.reduce((sum, s) => sum + s.total, 0);
  const paymentBase = metrics.periodPaid + metrics.periodPending;
  const paymentProgress = paymentBase ? Math.min(100, Math.round(metrics.periodPaid / paymentBase * 100)) : 0;
  const colors = ['#000052', '#B8860B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];
  const status = (value: number) => value < 80 ? ['bg-red-500', 'Критично'] : value > 100 ? ['bg-emerald-500', 'Перевыполнение'] : value === 100 ? ['bg-emerald-500', 'План выполнен'] : ['bg-[#B8860B]', 'Выполнение плана'];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Финансовое ядро</h1><p className="text-sm text-[#000052]/70 mt-1">Ключевые финансовые показатели компании</p></div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(([label, value, Icon, color, textColor, prefix, suffix], i) => <div key={i} className={`${color} ${textColor} p-5 rounded-xl border border-[#000052]/10`}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-80">{label as string}</h3><Icon className="w-5 h-5 opacity-80" /></div><p className="text-2xl font-bold">{prefix as string}{Number(value).toLocaleString()}{suffix as string}</p></div>)}
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Движение средств за август</h2></div><p className="text-sm text-[#000052]/60 mt-1">Эскроу, фактически выплаченные и ожидающие выплаты агентам</p></div><div className="text-right"><div className="text-xs text-[#000052]/60">В эскроу</div><div className="text-xl font-bold text-[#000052]">${metrics.totalEscrow.toLocaleString()}</div></div></div>
        <div className="h-5 bg-[#000052]/10 rounded-full overflow-hidden flex"><div className="h-full bg-emerald-500 transition-all" style={{ width: `${paymentProgress}%` }} /><div className="h-full bg-[#B8860B] transition-all" style={{ width: `${100 - paymentProgress}%` }} /></div>
        <div className="grid grid-cols-3 gap-4 mt-4 text-sm"><div><span className="text-[#000052]/60">Эскроу</span><div className="font-bold text-[#000052] mt-1">${metrics.totalEscrow.toLocaleString()}</div></div><div><span className="text-[#000052]/60">Выплачено в августе</span><div className="font-bold text-emerald-600 mt-1">${metrics.periodPaid.toLocaleString()}</div></div><div><span className="text-[#000052]/60">Ожидает выплаты</span><div className="font-bold text-[#B8860B] mt-1">${metrics.periodPending.toLocaleString()}</div></div></div>
        <div className="flex justify-between mt-3 text-xs text-[#000052]/60"><span>Выплачено: {paymentProgress}%</span><span>Ожидает: {100 - paymentProgress}%</span></div>
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-5"><BarChart3 className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">Выполнение плана агентами</h2><p className="text-sm text-[#000052]/60">План = «Общая выручка по договорам» при создании контрактов. KPI не учитывается.</p></div></div>
        <div className="flex flex-wrap gap-3 mb-6 text-xs text-[#000052]/70"><span>🔴 Ниже 80% — критично</span><span>🟡 80–99% — выполнение плана</span><span>🟢 100% — план выполнен</span><span>🟢 Выше 100% — перевыполнение</span></div>
        {agentEfficiency.length === 0 ? <div className="text-center py-8 text-[#000052]/60">Данные по выполнению плана пока недоступны</div> : <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-end">{agentEfficiency.map((agent, index) => { const [bar, label] = status(agent.value); const height = Math.max(8, Math.min(180, agent.value / 120 * 180)); return <div key={`${agent.name}-${index}`} className="flex flex-col items-center"><div className="w-full h-[190px] flex items-end justify-center relative border-b border-[#000052]/10"><div className={`w-12 sm:w-16 ${bar} rounded-t-lg relative`} style={{ height: `${height}px` }}><span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-[#000052] whitespace-nowrap">{agent.value}%</span></div><div className="absolute left-0 right-0 bottom-[30px] border-t border-dashed border-[#B8860B]/40" /></div><div className="text-center mt-3 w-full"><div className="font-semibold text-sm text-[#000052] truncate">{agent.name}</div><div className="text-xs text-[#000052]/60 mt-1">{label}</div><div className="text-[11px] text-[#000052]/50 mt-1">${agent.actual.toLocaleString()} / ${agent.plan.toLocaleString()}</div></div></div>; })}</div>}
      </div>

      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex items-center gap-2 mb-6"><PieChartIcon className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Распределение бюджета</h2></div>
        {streamsByType.length === 0 ? <div className="text-center py-12 text-[#000052]/60"><PieChartIcon className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" /><p>Активных потоков выплат пока нет</p></div> : <div className="space-y-2">{streamsByType.map((stream, index) => { const percent = totalStreams ? stream.total / totalStreams * 100 : 0; return <div key={stream.key} className="flex items-center gap-3"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[index % colors.length] }} /><div className="flex-1"><div className="flex justify-between text-sm"><span className="text-[#000052]">{stream.title}</span><b className="text-[#000052]">${stream.total.toLocaleString()}</b></div><div className="h-2 bg-[#000052]/10 rounded-full mt-1"><div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: colors[index % colors.length] }} /></div></div><span className="text-xs text-[#000052]/60 w-12 text-right">{percent.toFixed(1)}%</span></div>; })}</div>}
      </div>
    </div>
  );
}
