import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Shield, TrendingUp, CheckCircle, BarChart3, Wallet, Award } from 'lucide-react';
import { DEMO_AGENTS, calculateContractKPI } from '../../lib/demoData';
import { calculateAnnualBonusProgress, getEscrowAmount, getPaidAmount } from '../../lib/annualBonus';
import { PLATFORM_FEE_PERCENT } from '../../lib/smartContractLogic';

const n = (value: any) => Number(value || 0);
const active = (contract: any) => contract?.status === 'ACTIVE' || contract?.status === 'IN_PROGRESS';
const isCurrentMonth = (value: any) => {
  if (!value) return false;
  const date = new Date(value);
  const now = new Date();
  return !Number.isNaN(date.getTime()) && date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
};

const realKPI = (contract: any) => {
  if (!active(contract)) return 0;
  const pairs: Array<[any, any]> = [
    [contract.actual_calls, contract.kpi_calls],
    [contract.actual_meetings, contract.kpi_meetings],
    [contract.actual_proposals, contract.kpi_proposals],
    [contract.actual_clients, contract.target_clients],
  ].filter(([, target]) => n(target) > 0) as Array<[any, any]>;

  if (pairs.length) return Math.round(pairs.reduce((sum, [actual, target]) => sum + (n(actual) / n(target)) * 100, 0) / pairs.length);

  const planned = n(contract.kpi_revenue || contract.planned_revenue || contract.sales_plan || contract.target_revenue);
  const actual = n(contract.actual_revenue || contract.sales_amount);
  return planned > 0 ? Math.round((actual / planned) * 100) : 0;
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

        const { data: company, error: companyError } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyError) throw companyError;

        let agents: any[] = [];
        let realContracts: any[] = [];
        let payoutStreams: any[] = [];

        if (company?.id) {
          const agentsResult = await supabase.from('agents').select('*').eq('company_id', company.id);
          if (agentsResult.error) throw agentsResult.error;
          agents = agentsResult.data || [];

          const contractsResult = await supabase.from('contracts').select('*').eq('company_id', company.id);
          if (contractsResult.error) throw contractsResult.error;
          realContracts = contractsResult.data || [];

          const contractIds = realContracts.map(contract => contract.id).filter(Boolean);
          if (contractIds.length) {
            const streamsResult = await supabase.from('contract_payout_streams').select('*').in('contract_id', contractIds);
            if (streamsResult.error) throw streamsResult.error;
            payoutStreams = streamsResult.data || [];
          }
        }

        const names = new Map(agents.map(agent => [agent.id, agent.full_name || agent.name || agent.email || t('agent.agentNotFound')]));
        const realContractsWithNames = realContracts.map(contract => ({ ...contract, agent_name: names.get(contract.agent_id) || t('agent.agentNotFound'), is_demo: false }));
        const allContracts = [...demoContracts, ...realContractsWithNames];
        const activeContracts = allContracts.filter(active);

        let totalRevenue = 0;
        let totalEscrow = 0;
        let totalPaid = 0;
        let profit = 0;
        let roiSum = 0;
        let roiCount = 0;
        let periodPaid = 0;
        let pending = 0;
        let locked = 0;
        let liability = 0;

        const efficiencyByAgent: Record<string, { name: string; total: number; count: number }> = {};
        const expectedByAgent: Record<string, { name: string; amount: number }> = {};
        const annualByAgent: Record<string, any[]> = {};

        agents.forEach(agent => {
          const name = agent.full_name || agent.name || agent.email || t('agent.agentNotFound');
          efficiencyByAgent[agent.id] = { name, total: 0, count: 0 };
          expectedByAgent[agent.id] = { name, amount: 0 };
          annualByAgent[agent.id] = [];
        });

        DEMO_AGENTS.forEach(agent => {
          efficiencyByAgent[agent.id] = { name: agent.full_name, total: 0, count: 0 };
          expectedByAgent[agent.id] = { name: agent.full_name, amount: 0 };
          annualByAgent[agent.id] = agent.contracts;
        });

        // Финансовое ядро считает только активные контракты. Страница
        // «Контракты» отдельно показывает общий GMV всех 7 контрактов.
        activeContracts.forEach(contract => {
          const streams: any[] = contract.is_demo ? (contract.payout_streams || []) : payoutStreams.filter(stream => stream.contract_id === contract.id);
          const financialStreams = streams.filter(stream => stream.stream_key !== 'annual');

          const escrow = getEscrowAmount(contract, streams) || n(contract.escrow_amount);
          const paid = getPaidAmount(streams);
          const revenue = n(contract.revenue || contract.planned_revenue);
          const platformFee = Math.round(escrow * PLATFORM_FEE_PERCENT / 100);
          const companyProfit = revenue - escrow - platformFee;
          const roi = revenue > 0 ? Math.round((companyProfit / revenue) * 100) : 0;

          totalRevenue += revenue;
          totalEscrow += escrow;
          totalPaid += paid;
          profit += companyProfit;
          if (revenue > 0) { roiSum += roi; roiCount += 1; }

          const key = contract.agent_id || contract.agent_name || contract.id;
          if (!efficiencyByAgent[key]) efficiencyByAgent[key] = { name: contract.agent_name || t('agent.agentNotFound'), total: 0, count: 0 };
          const kpi = contract.is_demo ? calculateContractKPI(contract) : realKPI(contract);
          efficiencyByAgent[key].total += kpi;
          efficiencyByAgent[key].count += 1;

          if (!expectedByAgent[key]) expectedByAgent[key] = { name: contract.agent_name || t('agent.agentNotFound'), amount: 0 };
          if (!annualByAgent[key]) annualByAgent[key] = [];
          if (contract.is_demo) annualByAgent[key].push(contract);

          financialStreams.forEach(stream => {
            const amount = n(stream.amount);
            const eventDate = stream.paid_at || stream.unlocked_at || stream.payment_date || stream.updated_at || stream.created_at;

            if (stream.status === 'LOCKED') locked += amount;
            if (stream.status === 'PAID') {
              totalPaid += 0;
              if (isCurrentMonth(eventDate)) periodPaid += amount;
            }
            if (stream.status === 'LOCKED' || stream.status === 'UNLOCKED' || stream.status === 'PAYABLE') liability += amount;
            if (stream.status === 'UNLOCKED' || stream.status === 'PAYABLE') {
              pending += amount;
              if (eventDate && isCurrentMonth(eventDate)) {
                expectedByAgent[key].amount += amount;
              } else {
                expectedByAgent[key].amount += amount;
              }
            }
          });
        });

        // Реальные контракты агента участвуют в годовом бонусе независимо от
        // того, активен контракт сейчас или уже завершён.
        realContractsWithNames.forEach(contract => {
          const key = contract.agent_id || contract.agent_name || contract.id;
          if (!annualByAgent[key]) annualByAgent[key] = [];
          annualByAgent[key].push(contract);
        });

        const annualBonusRows = Object.entries(annualByAgent)
          .map(([key, contracts]) => {
            const progress = calculateAnnualBonusProgress(contracts, 2026);
            const name = efficiencyByAgent[key]?.name || expectedByAgent[key]?.name || t('agent.agentNotFound');
            return { id: key, name, ...progress };
          })
          .filter(row => row.monthsCounted > 0)
          .sort((a, b) => b.progressPercent - a.progressPercent);

        const efficiencyRows = Object.values(efficiencyByAgent)
          .filter(agent => agent.count > 0)
          .map(agent => ({ name: agent.name, value: Math.round(agent.total / agent.count) }))
          .sort((a, b) => b.value - a.value);

        setMetrics({
          totalRevenue,
          totalEscrow,
          totalPaidToAgents: totalPaid,
          netProfit: profit,
          avgROI: roiCount ? Math.round(roiSum / roiCount) : 0,
          activeContracts: activeContracts.length,
          pendingPayouts: pending,
          periodPaid,
          periodPending: pending,
          locked,
          released: totalPaid,
          liability,
        });
        setEfficiency(efficiencyRows);
        setExpectedIncome(Object.values(expectedByAgent).filter(agent => agent.amount > 0).sort((a, b) => b.amount - a.amount));
        setAnnualBonuses(annualBonusRows);
      } catch (error) {
        console.error('Ошибка загрузки финансового ядра:', error);
        setMetrics({ totalRevenue: 0, totalEscrow: 0, totalPaidToAgents: 0, netProfit: 0, avgROI: 0, activeContracts: 0, pendingPayouts: 0, periodPaid: 0, periodPending: 0, locked: 0, released: 0, liability: 0 });
        setEfficiency([]);
        setExpectedIncome([]);
        setAnnualBonuses([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, t]);

  if (loading) return <div className="p-8 text-center text-[#000052]">{t('ui.loading')}</div>;

  const paymentBase = metrics.periodPaid + metrics.periodPending;
  const paymentProgress = paymentBase ? Math.round((metrics.periodPaid / paymentBase) * 100) : 0;
  const barClass = (value: number) => value < 80 ? 'bg-red-500' : value > 100 ? 'bg-emerald-500' : 'bg-[#B8860B]';
  const label = (value: number) => value < 80 ? t('ui.critical') : value > 100 ? t('ui.overachieved') : t('ui.planAchievement');

  const cards = [
    [t('ui.totalRevenue'), `$${metrics.totalRevenue.toLocaleString()}`, DollarSign, 'bg-[#000052]', 'text-white'],
    [t('ui.profit'), `$${metrics.netProfit.toLocaleString()}`, TrendingUp, 'bg-white', 'text-[#000052]'],
    [t('ui.averageROI'), `${metrics.avgROI}%`, BarChart3, 'bg-green-600', 'text-white'],
    [t('ui.activeContracts'), String(metrics.activeContracts), CheckCircle, 'bg-white', 'text-[#000052]'],
  ];

  return <div className="p-4 md:p-6 space-y-6">
    <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('ui.financialCore')}</h1><p className="text-sm text-[#000052]/70 mt-1">{t('ui.financialOverview')}</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{cards.map(([title, value, Icon, bg, fg]: any, index: number) => <div key={index} className={`${bg} ${fg} p-5 rounded-xl border border-[#000052]/10`}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-80">{title}</h3><Icon className="w-5 h-5 opacity-80" /></div><p className="text-2xl font-bold">{value}</p></div>)}</div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60">{t('ui.locked', 'Заблокировано')}</p><p className="text-2xl font-bold text-[#B8860B] mt-1">${metrics.locked.toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.lockedDescription', 'Средства заблокированы')}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60">{t('ui.released', 'Выплачено')}</p><p className="text-2xl font-bold text-emerald-600 mt-1">${metrics.released.toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.releasedDescription', 'Средства выплачены')}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60">{t('ui.liability', 'Обязательства')}</p><p className="text-2xl font-bold text-[#000052] mt-1">${metrics.liability.toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.liabilityDescription', 'Текущие обязательства по выплатам')}</p></div>
    </div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
      <div className="flex items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">{t('ui.cashMovementAugust')}</h2></div><p className="text-sm text-[#000052]/60 mt-1">{t('ui.cashMovementDescription')}</p></div><div className="text-right"><div className="text-xs text-[#000052]/60">{t('ui.inEscrow')}</div><div className="text-xl font-bold text-[#000052]">${metrics.totalEscrow.toLocaleString()}</div></div></div>
      <div className="h-5 bg-[#000052]/10 rounded-full overflow-hidden flex"><div className="h-full bg-emerald-500" style={{ width: `${paymentProgress}%` }} /><div className="h-full bg-[#B8860B]" style={{ width: `${100 - paymentProgress}%` }} /></div>
      <div className="grid grid-cols-3 gap-4 mt-4 text-sm"><div><div className="text-[#000052]/60">{t('ui.escrow')}</div><div className="font-bold mt-1">${metrics.totalEscrow.toLocaleString()}</div></div><div><div className="text-[#000052]/60">{t('ui.paidInAugust')}</div><div className="font-bold text-emerald-600 mt-1">${metrics.periodPaid.toLocaleString()}</div></div><div><div className="text-[#000052]/60">{t('ui.pendingPayout')}</div><div className="font-bold text-[#B8860B] mt-1">${metrics.periodPending.toLocaleString()}</div></div></div>
      <div className="flex justify-between mt-3 text-xs text-[#000052]/60"><span>{t('ui.paid')}: {paymentProgress}%</span><span>{t('ui.pending')}: {100 - paymentProgress}%</span></div>
    </div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-5"><Wallet className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">{t('ui.agentExpectedIncome', 'Ожидаемый доход агентов')}</h2><p className="text-sm text-[#000052]/60">{t('ui.agentExpectedIncomeDescription', 'Невыплаченные потоки по активным обязательствам')}</p></div></div><div className="space-y-3">{expectedIncome.map((agent: any) => <div key={agent.name} className="flex items-center justify-between p-3 bg-[#000052]/5 rounded-lg"><span className="font-medium text-[#000052]">{agent.name}</span><span className="font-bold text-[#B8860B]">${agent.amount.toLocaleString()}</span></div>)}{expectedIncome.length === 0 && <p className="text-sm text-[#000052]/60">Нет ожидаемых выплат</p>}</div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-5"><Award className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">{t('ui.annualBonusProgress', 'Годовой бонус')}</h2><p className="text-sm text-[#000052]/60">{t('ui.annualBonusProgressDescription', 'Накопление бонуса по выполнению годового плана продаж. Бонус не входит в эскроу.')}</p></div></div><div className="space-y-4">{annualBonuses.map((agent: any) => <div key={agent.id} className="p-4 bg-[#000052]/5 rounded-lg"><div className="flex items-center justify-between gap-4 mb-2"><div><div className="font-semibold text-[#000052]">{agent.name}</div><div className="text-xs text-[#000052]/60">{agent.planAchievementPercent}% {t('ui.planAchievement')}</div></div><div className="text-right"><div className="font-bold text-[#B8860B]">${agent.accruedBonus.toLocaleString()} / ${agent.maxBonus.toLocaleString()}</div><div className="text-xs text-[#000052]/60">{agent.progressPercent}%</div></div></div><div className="h-3 bg-[#000052]/10 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${Math.min(agent.progressPercent, 100)}%` }} /></div></div>)}{annualBonuses.length === 0 && <p className="text-sm text-[#000052]/60">Нет агентов</p>}</div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-5"><BarChart3 className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">{t('ui.agentPlanAchievement')}</h2><p className="text-sm text-[#000052]/60 mt-1">{t('ui.agentPlanDescription')}</p></div></div><div className="flex flex-wrap gap-4 mb-6 text-xs text-[#000052]/70"><span>🔴 {t('ui.below80')} — {t('ui.critical')}</span><span>🟡 100% — {t('ui.planAchievement')}</span><span>🟢 {t('ui.above100')} — {t('ui.overachieved')}</span></div><div className="overflow-x-auto"><div className="grid grid-cols-7 min-w-[1050px] border border-[#000052]/10 rounded-lg overflow-hidden">{efficiency.map((agent: any, index: number) => { const height = Math.max(8, Math.min(180, agent.value / 120 * 180)); return <div key={`${agent.name}-${index}`} className={`flex flex-col items-center min-w-0 px-3 py-4 ${index < efficiency.length - 1 ? 'border-r border-[#000052]/10' : ''}`}><div className="w-full h-[190px] flex items-end justify-center relative border-b border-[#000052]/10"><div className={`w-12 ${barClass(agent.value)} rounded-t-lg relative`} style={{ height: `${height}px` }}><span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-[#000052] whitespace-nowrap">{agent.value}%</span></div></div><div className="text-center mt-3 w-full"><div className="font-semibold text-sm text-[#000052] leading-tight" title={agent.name}>{agent.name}</div><div className="text-xs text-[#000052]/60 mt-1">{label(agent.value)}</div></div></div>; })}</div></div></div>
  </div>;
}
