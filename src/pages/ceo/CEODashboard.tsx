import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, CheckCircle, BarChart3, Wallet, Award } from 'lucide-react';
import { DEMO_AGENTS } from '../../lib/demoData';
import { calculateAnnualBonusProgress } from '../../lib/annualBonus';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import { getContractAccountingSnapshot, getSalesPlanAchievement, money, PLATFORM_FEE_PERCENT } from '../../lib/contractFinance';

const n = (value: unknown) => Number(value || 0);
const active = (contract: any) => contract?.status === 'ACTIVE' || contract?.status === 'IN_PROGRESS';

const getStreamsForContract = (contract: any, payoutStreams: any[]) => (
  contract.is_demo
    ? (Array.isArray(contract.payout_streams) ? contract.payout_streams : [])
    : payoutStreams.filter((stream: any) => stream.contract_id === contract.id)
);

/** Financial core uses contract value. Sales achievement uses confirmed realized sales separately. */
const getDashboardAccounting = (contract: any, streams: any[]) => {
  const nonAnnual = streams.filter((stream: any) => stream?.stream_key !== 'annual');
  const storedPayout = nonAnnual.reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
  const contractRevenue = money(contract?.planned_revenue ?? contract?.revenue);

  if (storedPayout > 0) {
    const paid = nonAnnual.filter((stream: any) => stream?.status === 'PAID').reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
    const locked = nonAnnual.filter((stream: any) => stream?.status === 'LOCKED').reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
    const liability = nonAnnual.filter((stream: any) => ['LOCKED', 'UNLOCKED', 'PAYABLE'].includes(stream?.status)).reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
    const pending = nonAnnual.filter((stream: any) => ['UNLOCKED', 'PAYABLE'].includes(stream?.status)).reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
    const commission = money(storedPayout * PLATFORM_FEE_PERCENT / 100);
    return { revenue: contractRevenue, escrow: storedPayout, payout: storedPayout, paid, locked, liability, pending, commission, companyProfit: money(contractRevenue - storedPayout - commission) };
  }

  const snapshot = getContractAccountingSnapshot({ ...contract, payout_streams: streams });
  return { revenue: contractRevenue, escrow: snapshot.escrow, payout: snapshot.payout, paid: snapshot.paid, locked: snapshot.locked, liability: snapshot.locked, pending: 0, commission: snapshot.commission, companyProfit: money(contractRevenue - snapshot.payout - snapshot.commission) };
};

export function CEODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalEscrow: 0, totalPaidToAgents: 0, netProfit: 0, avgROI: 0, activeContracts: 0, pendingPayouts: 0, periodPaid: 0, periodPending: 0, locked: 0, released: 0, liability: 0 });
  const [efficiency, setEfficiency] = useState<any[]>([]);
  const [expectedIncome, setExpectedIncome] = useState<any[]>([]);
  const [annualBonuses, setAnnualBonuses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      try {
        const demoContracts = DEMO_AGENTS.flatMap(agent => agent.contracts.map(contract => ({ ...contract, agent_id: agent.id, agent_name: agent.full_name, is_demo: true })));
        const demoNames = new Set(DEMO_AGENTS.map(agent => agent.full_name.trim().toLowerCase()));
        const { data: company, error: companyError } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyError) throw companyError;
        let agents: any[] = [], realContracts: any[] = [], payoutStreams: any[] = [];
        if (company?.id) {
          const agentsResult = await supabase.from('agents').select('*').eq('company_id', company.id);
          if (agentsResult.error) throw agentsResult.error;
          agents = agentsResult.data || [];
          const contractsResult = await supabase.from('contracts').select('*').eq('company_id', company.id).order('created_at', { ascending: false });
          if (contractsResult.error) throw contractsResult.error;
          const realAgentNames = new Map(agents.map(agent => [agent.id, (agent.full_name || agent.name || agent.email || '').trim().toLowerCase()]));
          const latestByAgent = new Map<string, any>();
          (contractsResult.data || []).forEach(contract => {
            const name = (realAgentNames.get(contract.agent_id) || '').trim().toLowerCase();
            if (name && demoNames.has(name)) return;
            const key = contract.agent_id || contract.id;
            if (!latestByAgent.has(key)) latestByAgent.set(key, contract);
          });
          realContracts = Array.from(latestByAgent.values());
          const ids = realContracts.map(contract => contract.id).filter(Boolean);
          if (ids.length) {
            const streamsResult = await supabase.from('contract_payout_streams').select('*').in('contract_id', ids);
            if (streamsResult.error) throw streamsResult.error;
            payoutStreams = streamsResult.data || [];
          }
        }
        const names = new Map(agents.map(agent => [agent.id, agent.full_name || agent.name || agent.email || t('agent.agentNotFound')]));
        const realContractsWithNames = realContracts.map(contract => ({ ...contract, agent_name: names.get(contract.agent_id) || t('agent.agentNotFound'), is_demo: false }));
        const allContracts = [...demoContracts, ...realContractsWithNames];
        const activeContracts = allContracts.filter(active);
        let totalRevenue = 0, totalEscrow = 0, totalPaid = 0, profit = 0, roiSum = 0, roiCount = 0, periodPaid = 0, pending = 0, locked = 0, liability = 0;
        const efficiencyByAgent: Record<string, { name: string; value: number; count: number }> = {};
        const expectedByAgent: Record<string, { name: string; amount: number }> = {};
        const annualByAgent: Record<string, any[]> = {};

        allContracts.forEach(contract => {
          const streams = getStreamsForContract(contract, payoutStreams);
          const accounting = getDashboardAccounting(contract, streams);
          const key = contract.agent_id || contract.agent_name || contract.id;
          const name = contract.agent_name || t('agent.agentNotFound');
          if (!efficiencyByAgent[key]) efficiencyByAgent[key] = { name, value: 0, count: 0 };
          if (!expectedByAgent[key]) expectedByAgent[key] = { name, amount: 0 };
          if (!annualByAgent[key]) annualByAgent[key] = [];
          annualByAgent[key].push(contract);

          // This is SALES PLAN ACHIEVEMENT, not the average of operational KPIs.
          const planAchievement = getSalesPlanAchievement(contract);
          efficiencyByAgent[key].value += planAchievement;
          efficiencyByAgent[key].count += 1;

          if (active(contract)) expectedByAgent[key].amount += accounting.payout;
          if (!active(contract)) return;
          totalRevenue += accounting.revenue;
          totalEscrow += accounting.escrow;
          totalPaid += accounting.paid;
          profit += accounting.companyProfit;
          locked += accounting.locked;
          pending += accounting.pending;
          liability += accounting.liability;
          if (accounting.revenue > 0) { roiSum += accounting.companyProfit / accounting.revenue * 100; roiCount += 1; }
          streams.filter((stream: any) => stream.stream_key !== 'annual').forEach((stream: any) => {
            if (stream.status !== 'PAID') return;
            const eventDate = stream.paid_at || stream.payment_date || stream.updated_at || stream.created_at;
            if (!eventDate) return;
            const d = new Date(eventDate), now = new Date();
            if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) periodPaid += money(stream.amount);
          });
        });

        const annualBonusRows = Object.entries(annualByAgent).map(([key, contracts]) => ({ id: key, name: efficiencyByAgent[key]?.name || expectedByAgent[key]?.name || t('agent.agentNotFound'), ...calculateAnnualBonusProgress(contracts, 2026) })).filter(row => row.monthsCounted > 0).sort((a, b) => b.progressPercent - a.progressPercent);
        const efficiencyRows = Object.values(efficiencyByAgent).map(agent => ({ name: agent.name, value: Math.round(agent.value / agent.count) })).sort((a, b) => b.value - a.value);
        setMetrics({ totalRevenue, totalEscrow, totalPaidToAgents: totalPaid, netProfit: Math.round(profit), avgROI: roiCount ? Math.round(roiSum / roiCount) : 0, activeContracts: activeContracts.length, pendingPayouts: pending, periodPaid, periodPending: pending, locked, released: totalPaid, liability });
        setEfficiency(efficiencyRows);
        setExpectedIncome(Object.values(expectedByAgent).filter(agent => agent.amount > 0).sort((a, b) => b.amount - a.amount));
        setAnnualBonuses(annualBonusRows);
      } catch (error) {
        console.error('Ошибка загрузки финансового ядра:', error);
        setMetrics({ totalRevenue: 0, totalEscrow: 0, totalPaidToAgents: 0, netProfit: 0, avgROI: 0, activeContracts: 0, pendingPayouts: 0, periodPaid: 0, periodPending: 0, locked: 0, released: 0, liability: 0 });
        setEfficiency([]); setExpectedIncome([]); setAnnualBonuses([]);
      } finally { setLoading(false); }
    };
    load();
  }, [user, t]);

  if (loading) return <div className="p-8 text-center text-[#000052]">{t('ui.loading')}</div>;
  const paymentBase = metrics.periodPaid + metrics.periodPending;
  const paymentProgress = paymentBase ? Math.round((metrics.periodPaid / paymentBase) * 100) : 0;
  const label = (value: number) => value < 80 ? t('ui.critical') : value > 100 ? t('ui.overachieved') : t('ui.planAchievement');

  const cards = [
    [t('ui.totalRevenue'), `$${Math.round(metrics.totalRevenue).toLocaleString()}`, DollarSign, 'bg-[#000052]', 'text-white', 'Стоимость активных контрактов. Фактические продажи используются отдельно для выполнения плана.'],
    [t('ui.profit'), `$${metrics.netProfit.toLocaleString()}`, TrendingUp, 'bg-white', 'text-[#000052]', 'Прибыль компании: стоимость активных контрактов минус payout агентам и комиссия InCORE.'],
    [t('ui.averageROI'), `${metrics.avgROI}%`, BarChart3, 'bg-[#1E3A5F]', 'text-white', 'Средний ROI активных контрактов.'],
    [t('ui.activeContracts'), String(metrics.activeContracts), CheckCircle, 'bg-white', 'text-[#000052]', 'Количество контрактов со статусом ACTIVE или IN_PROGRESS.'],
  ];

  return <div className="w-full min-w-0 overflow-x-hidden p-4 md:p-6 space-y-6">
    <div className="min-w-0"><h1 className="text-2xl md:text-3xl font-bold text-[#000052] break-words">{t('ui.financialCore')}</h1><p className="text-sm text-[#000052]/70 mt-1 break-words">{t('ui.financialOverview')}</p></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 min-w-0">
      {cards.map(([title, value, Icon, bg, fg, hint]: any, index: number) => <div key={index} className={`${bg} ${fg} min-w-0 p-5 rounded-xl border border-[#000052]/10`}><div className="flex items-start justify-between gap-3 mb-3"><h3 className="min-w-0 text-sm font-medium opacity-80 flex items-center break-words">{title}<InfoTooltip>{hint}</InfoTooltip></h3><Icon className="w-5 h-5 opacity-80 shrink-0" /></div><p className="text-2xl font-bold break-words">{value}</p></div>)}
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
      <div className="bg-white min-w-0 p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60 flex items-center">{t('ui.locked')}<InfoTooltip>{t('ui.lockedTooltip')}</InfoTooltip></p><p className="text-2xl font-bold text-[#000052] mt-1">${Math.round(metrics.locked).toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.lockedFunds')}</p></div>
      <div className="bg-white min-w-0 p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60 flex items-center">{t('ui.paid')}<InfoTooltip>{t('ui.paidTooltip')}</InfoTooltip></p><p className="text-2xl font-bold text-[#000052] mt-1">${Math.round(metrics.totalPaidToAgents).toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.paidFunds')}</p></div>
      <div className="bg-white min-w-0 p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60 flex items-center">{t('ui.liabilities')}<InfoTooltip>{t('ui.liabilitiesTooltip')}</InfoTooltip></p><p className="text-2xl font-bold text-[#000052] mt-1">${Math.round(metrics.liability).toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.currentPayoutLiabilities')}</p></div>
    </div>
    <div className="bg-white rounded-xl border border-[#000052]/10 p-5 min-w-0"><div className="flex items-center gap-2 mb-4"><Wallet className="w-5 h-5 text-[#000052]"/><h2 className="text-lg font-bold text-[#000052]">{t('ui.cashFlowAugust')}</h2></div><p className="text-sm text-[#000052]/60 mb-4">{t('ui.cashFlowDescription')}</p><div className="grid grid-cols-1 sm:grid-cols-3 gap-4"><div><p className="text-sm text-[#000052]/60">{t('ui.inEscrow')}</p><p className="text-xl font-bold text-[#000052]">${Math.round(metrics.totalEscrow).toLocaleString()}</p></div><div><p className="text-sm text-[#000052]/60">{t('ui.paidInAugust')}</p><p className="text-xl font-bold text-[#000052]">${Math.round(metrics.periodPaid).toLocaleString()}</p></div><div><p className="text-sm text-[#000052]/60">{t('ui.pendingPayout')}</p><p className="text-xl font-bold text-[#000052]">${Math.round(metrics.pendingPayouts).toLocaleString()}</p></div></div><div className="mt-4"><div className="h-2 rounded-full bg-[#000052]/10 overflow-hidden"><div className="h-full bg-[#000052]" style={{ width: `${paymentProgress}%` }}/></div><div className="flex justify-between text-xs text-[#000052]/60 mt-1"><span>{t('ui.paidPercent')}: {paymentProgress}%</span><span>{t('ui.pendingPercent')}: {100 - paymentProgress}%</span></div></div></div>
    <div className="bg-white rounded-xl border border-[#000052]/10 p-5 min-w-0"><h2 className="text-lg font-bold text-[#000052] mb-1">{t('ui.expectedAgentIncome')}</h2><p className="text-sm text-[#000052]/60 mb-4">{t('ui.payoutByActiveContract')}</p><div className="space-y-3">{expectedIncome.map((agent, index) => <div key={index} className="flex items-center justify-between gap-3"><span className="font-medium text-[#000052] min-w-0 break-words">{agent.name}</span><span className="font-bold text-[#000052] shrink-0">${Math.round(agent.amount).toLocaleString()}</span></div>)}</div></div>
    <div className="bg-white rounded-xl border border-[#000052]/10 p-5 min-w-0"><div className="flex items-center gap-2 mb-1"><Award className="w-5 h-5 text-[#000052]"/><h2 className="text-lg font-bold text-[#000052]">{t('ui.annualBonus')}</h2></div><p className="text-sm text-[#000052]/60 mb-4">{t('ui.annualBonusDescription')}</p><div className="space-y-4">{annualBonuses.map((row, index) => <div key={row.id || index} className="border-b border-[#000052]/10 pb-4 last:border-0 last:pb-0"><div className="flex justify-between gap-3"><span className="font-semibold text-[#000052]">{row.name}</span><span className="text-sm text-[#000052]/70">{row.progressPercent}% {t('ui.planAchievement')}</span></div><div className="mt-2 flex justify-between text-sm"><span>${row.accruedBonus.toLocaleString()} / $7,000</span><span>{row.progressPercent}%</span></div></div>)}</div></div>
    <div className="bg-white rounded-xl border border-[#000052]/10 p-5 min-w-0"><h2 className="text-lg font-bold text-[#000052] mb-1">{t('ui.agentPlanAchievement')}</h2><p className="text-sm text-[#000052]/60 mb-4">Фактические продажи / план продаж по активным контрактам</p><div className="space-y-3">{efficiency.map((agent, index) => <div key={index} className="flex items-center justify-between gap-4"><div className="min-w-0"><div className="font-medium text-[#000052] break-words">{agent.name}</div><div className="text-xs text-[#000052]/60">{label(agent.value)}</div></div><div className="text-xl font-bold text-[#000052] shrink-0">{agent.value}%</div></div>)}</div><div className="mt-4 flex gap-4 text-xs text-[#000052]/60"><span>Ниже 80% — {t('ui.critical')}</span><span>100% — {t('ui.planAchievement')}</span><span>Выше 100% — {t('ui.overachieved')}</span></div></div>
  </div>;
}
