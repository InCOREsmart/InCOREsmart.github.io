import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Shield, TrendingUp, CheckCircle, BarChart3, Wallet, Award } from 'lucide-react';
import { DEMO_AGENTS } from '../../lib/demoData';
import { calculateAnnualBonusProgress, getEscrowAmount, getPaidAmount } from '../../lib/annualBonus';
import { PLATFORM_FEE_PERCENT } from '../../lib/smartContractLogic';

const n = (v: any) => Number(v || 0);
const active = (c: any) => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS';
const demoKPI = (c: any) => c.kpi_calls > 0 ? Math.round((n(c.actual_calls) / n(c.kpi_calls)) * 100) : 0;
const realKPI = (c: any) => {
  if (!active(c)) return 0;
  const pairs: Array<[any, any]> = [[c.actual_calls, c.kpi_calls], [c.actual_meetings, c.kpi_meetings], [c.actual_proposals, c.kpi_proposals], [c.actual_clients, c.target_clients]].filter(([, target]) => n(target) > 0) as Array<[any, any]>;
  if (pairs.length) return Math.round(pairs.reduce((sum, [actual, target]) => sum + (n(actual) / n(target)) * 100, 0) / pairs.length);
  const planned = n(c.kpi_revenue || c.planned_revenue || c.sales_plan || c.target_revenue);
  const actual = n(c.actual_revenue || c.revenue || c.sales_amount);
  return planned > 0 ? Math.round((actual / planned) * 100) : 0;
};
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const inAugust = (s: any) => { const v = s.paid_at || s.unlocked_at || s.payment_date || s.updated_at || s.created_at; if (!v) return false; const d = new Date(v); return !Number.isNaN(d.getTime()) && d >= monthStart(); };

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
        const demos = DEMO_AGENTS.flatMap(a => a.contracts.map(c => ({ ...c, agent_id: a.id, agent_name: a.full_name, is_demo: true })));
        const currentDemo = demos.filter(active);
        const { data: company, error: companyError } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyError) throw companyError;
        let agents: any[] = [], contracts: any[] = [], payoutStreams: any[] = [];
        if (company?.id) {
          const a = await supabase.from('agents').select('*').eq('company_id', company.id); if (a.error) throw a.error; agents = a.data || [];
          const c = await supabase.from('contracts').select('*').eq('company_id', company.id); if (c.error) throw c.error; contracts = c.data || [];
          const ids = contracts.map(c => c.id).filter(Boolean);
          if (ids.length) { const s = await supabase.from('contract_payout_streams').select('*').in('contract_id', ids); if (s.error) throw s.error; payoutStreams = s.data || []; }
        }
        const names = new Map(agents.map(a => [a.id, a.full_name || a.name || a.email || t('agent.agentNotFound')]));
        const real = contracts.map(c => ({ ...c, agent_name: names.get(c.agent_id) || t('agent.agentNotFound'), is_demo: false }));
        const all = [...currentDemo, ...real];
        let totalRevenue = 0, totalEscrow = 0, totalPaid = 0, profit = 0, roiSum = 0, roiCount = 0, pending = 0, periodPaid = 0, locked = 0, released = 0, liability = 0;
        const people: Record<string, any> = {};
        const income: Record<string, any> = {};
        const agentContracts: Record<string, any[]> = {};
        all.forEach(c => {
          const ps: any[] = c.is_demo ? (c.payout_streams || []) : payoutStreams.filter((s: any) => s.contract_id === c.id);
          const financialStreams = ps.filter((s: any) => s.stream_key !== 'annual');
          const escrowFromStreams = getEscrowAmount(c, ps); const escrow = escrowFromStreams || n(c.escrow_amount); const paid = getPaidAmount(ps);
          const currentPending = financialStreams.filter((s: any) => (s.status === 'UNLOCKED' || s.status === 'PAYABLE') && inAugust(s)).reduce((sum: number, x: any) => sum + n(x.amount), 0);
          const revenue = n(c.revenue || c.planned_revenue);
          const platformFee = Math.round(escrow * PLATFORM_FEE_PERCENT / 100);
          // Единая финансовая модель: выручка минус обязательства агентам и комиссия InCORE.
          // annual bonus не участвует в escrow и поэтому здесь тоже не учитывается.
          const companyProfit = revenue - escrow - platformFee;
          const roi = c.roi_percentage != null ? n(c.roi_percentage) : revenue > 0 ? Math.round(companyProfit / revenue * 100) : 0;
          totalRevenue += revenue; totalEscrow += escrow; totalPaid += paid; profit += companyProfit; pending += currentPending; if (revenue > 0) { roiSum += roi; roiCount++; }
          financialStreams.forEach((s: any) => {
            const amount = n(s.amount);
            if (s.status === 'LOCKED') locked += amount;
            if (s.status === 'PAID') released += amount;
            if (s.status === 'LOCKED' || s.status === 'PAYABLE' || s.status === 'UNLOCKED') liability += amount;
            if (s.status === 'PAID' && inAugust(s)) periodPaid += amount;
            if (s.status !== 'PAID' && s.status !== 'CLAWED_BACK') {
              const key = c.agent_id || c.agent_name || c.id;
              if (!income[key]) income[key] = { name: c.agent_name || t('agent.agentNotFound'), amount: 0 };
              income[key].amount += amount;
            }
          });
          const key = c.agent_id || c.agent_name || c.id;
          if (!people[key]) people[key] = { name: c.agent_name || t('agent.agentNotFound'), total: 0, count: 0 };
          people[key].total += c.is_demo ? demoKPI(c) : realKPI(c); people[key].count++;
          if (!agentContracts[key]) agentContracts[key] = [];
          agentContracts[key].push(c);
        });
        agents.forEach(a => {
          const key = a.id;
          if (!people[key]) people[key] = { name: a.full_name || a.name || a.email || t('agent.agentNotFound'), total: 0, count: 0 };
          if (!income[key]) income[key] = { name: a.full_name || a.name || a.email || t('agent.agentNotFound'), amount: 0 };
          if (!agentContracts[key]) agentContracts[key] = [];
        });
        const annualBonusRows = Object.entries(agentContracts).map(([key, agentAgentContracts]) => {
          const name = people[key]?.name || t('agent.agentNotFound');
          const progress = calculateAnnualBonusProgress(agentAgentContracts, new Date().getFullYear());
          return { id: key, name, ...progress };
        }).sort((a, b) => b.progressPercent - a.progressPercent);
        setMetrics({ totalRevenue, totalEscrow, totalPaidToAgents: totalPaid, netProfit: profit, avgROI: roiCount ? Math.round(roiSum / roiCount) : 0, activeContracts: all.filter(active).length, pendingPayouts: pending, periodPaid, periodPending: pending, locked, released, liability });
        setEfficiency(Object.values(people).map(p => ({ name: p.name, value: p.count ? Math.round(p.total / p.count) : 0 })).sort((a, b) => b.value - a.value));
        setExpectedIncome(Object.values(income).sort((a: any, b: any) => b.amount - a.amount));
        setAnnualBonuses(annualBonusRows);
      } catch (e) {
        console.error('Financial core load error:', e);
        setMetrics({ totalRevenue: 0, totalEscrow: 0, totalPaidToAgents: 0, netProfit: 0, avgROI: 0, activeContracts: 0, pendingPayouts: 0, periodPaid: 0, periodPending: 0, locked: 0, released: 0, liability: 0 }); setEfficiency([]); setExpectedIncome([]); setAnnualBonuses([]);
      } finally { setLoading(false); }
    }; load();
  }, [user, t]);
  if (loading) return <div className="p-8 text-center text-[#000052]">{t('ui.loading')}</div>;
  const paymentBase = metrics.periodPaid + metrics.periodPending; const paymentProgress = paymentBase ? Math.round(metrics.periodPaid / paymentBase * 100) : 0;
  const barClass = (v: number) => v < 80 ? 'bg-red-500' : v > 100 ? 'bg-emerald-500' : 'bg-[#B8860B]';
  const label = (v: number) => v < 80 ? t('ui.critical') : v > 100 ? t('ui.overachievement') : t('ui.planAchievement');
  const cards = [[t('ui.totalRevenue'), `$${metrics.totalRevenue.toLocaleString()}`, DollarSign, 'bg-[#000052]', 'text-white'], [t('ui.profit'), `$${metrics.netProfit.toLocaleString()}`, TrendingUp, 'bg-white', 'text-[#000052]'], [t('ui.averageROI'), `${metrics.avgROI}%`, BarChart3, 'bg-green-600', 'text-white'], [t('ui.activeContracts'), metrics.activeContracts.toLocaleString(), CheckCircle, 'bg-white', 'text-[#000052]']];
  return <div className="p-4 md:p-6 space-y-6">
    <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('ui.financialCore')}</h1><p className="text-sm text-[#000052]/70 mt-1">{t('ui.financialOverview')}</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{cards.map(([title, value, Icon, bg, fg]: any, i: number) => <div key={i} className={`${bg} ${fg} p-5 rounded-xl border border-[#000052]/10`}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-80">{title}</h3><Icon className="w-5 h-5 opacity-80" /></div><p className="text-2xl font-bold">{value}</p></div>)}</div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60">{t('ui.locked', 'Locked')}</p><p className="text-2xl font-bold text-[#B8860B] mt-1">${metrics.locked.toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.lockedDescription', 'Средства заблокированы')}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60">{t('ui.released', 'Released')}</p><p className="text-2xl font-bold text-emerald-600 mt-1">${metrics.released.toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.releasedDescription', 'Средства выплачены')}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><p className="text-sm text-[#000052]/60">{t('ui.liability', 'Liability')}</p><p className="text-2xl font-bold text-[#000052] mt-1">${metrics.liability.toLocaleString()}</p><p className="text-xs text-[#000052]/50 mt-1">{t('ui.liabilityDescription', 'Текущие обязательства по выплатам')}</p></div>
    </div>
    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">{t('ui.cashMovementAugust')}</h2></div><p className="text-sm text-[#000052]/60 mt-1">{t('ui.cashMovementDescription')}</p></div><div className="text-right"><div className="text-xs text-[#000052]/60">{t('ui.inEscrow')}</div><div className="text-xl font-bold text-[#000052]">${metrics.totalEscrow.toLocaleString()}</div></div></div><div className="h-5 bg-[#000052]/10 rounded-full overflow-hidden flex"><div className="h-full bg-emerald-500" style={{ width: `${paymentProgress}%` }} /><div className="h-full bg-[#B8860B]" style={{ width: `${100 - paymentProgress}%` }} /></div><div className="grid grid-cols-3 gap-4 mt-4 text-sm"><div><div className="text-[#000052]/60">{t('ui.escrow')}</div><div className="font-bold mt-1">${metrics.totalEscrow.toLocaleString()}</div></div><div><div className="text-[#000052]/60">{t('ui.paidInAugust')}</div><div className="font-bold text-emerald-600 mt-1">${metrics.periodPaid.toLocaleString()}</div></div><div><div className="text-[#000052]/60">{t('ui.pendingPayout')}</div><div className="font-bold text-[#B8860B] mt-1">${metrics.periodPending.toLocaleString()}</div></div></div><div className="flex justify-between mt-3 text-xs text-[#000052]/60"><span>{t('ui.paid')}: {paymentProgress}%</span><span>{t('ui.pending')}: {100 - paymentProgress}%</span></div></div>
    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-5"><Wallet className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">{t('ui.agentExpectedIncome', 'Ожидаемый доход агентов')}</h2><p className="text-sm text-[#000052]/60">{t('ui.agentExpectedIncomeDescription', 'Невыплаченные потоки по активным обязательствам')}</p></div></div><div className="space-y-3">{expectedIncome.map((a: any) => <div key={a.name} className="flex items-center justify-between p-3 bg-[#000052]/5 rounded-lg"><span className="font-medium text-[#000052]">{a.name}</span><span className="font-bold text-[#B8860B]">${a.amount.toLocaleString()}</span></div>)}{expectedIncome.length === 0 && <p className="text-sm text-[#000052]/60">{t('ui.noExpectedIncome', 'Нет ожидаемых выплат')}</p>}</div></div>
    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-5"><Award className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">{t('ui.annualBonusProgress', 'Годовой бонус')}</h2><p className="text-sm text-[#000052]/60">{t('ui.annualBonusProgressDescription', 'Накопление бонуса по выполнению годового плана продаж. Бонус не входит в escrow.')}</p></div></div><div className="space-y-4">{annualBonuses.map((a: any) => <div key={a.id} className="p-4 bg-[#000052]/5 rounded-lg"><div className="flex items-center justify-between gap-4 mb-2"><div><div className="font-semibold text-[#000052]">{a.name}</div><div className="text-xs text-[#000052]/60">{a.planAchievementPercent}% {t('ui.planAchievement', 'плана')}</div></div><div className="text-right"><div className="font-bold text-[#B8860B]">${a.accruedBonus.toLocaleString()} / ${a.maxBonus.toLocaleString()}</div><div className="text-xs text-[#000052]/60">{a.progressPercent}%</div></div></div><div className="h-3 bg-[#000052]/10 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${a.progressPercent}%` }} /></div></div>)}{annualBonuses.length === 0 && <p className="text-sm text-[#000052]/60">{t('ui.noAgents', 'Нет агентов')}</p>}</div></div>
    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-5"><BarChart3 className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">{t('ui.agentPlanAchievement')}</h2><p className="text-sm text-[#000052]/60">{t('ui.agentPlanDescription')}</p></div></div><div className="flex flex-wrap gap-4 mb-6 text-xs text-[#000052]/70"><span>🔴 {t('ui.below80')} — {t('ui.critical')}</span><span>🟡 100% — {t('ui.planAchievement')}</span><span>🟢 {t('ui.above100')} — {t('ui.overachievement')}</span></div><div className="overflow-x-auto"><div className="grid grid-cols-7 min-w-[1050px] border border-[#000052]/10 rounded-lg overflow-hidden">{efficiency.map((a: any, i: number) => { const h = Math.max(8, Math.min(180, a.value / 120 * 180)); return <div key={`${a.name}-${i}`} className={`flex flex-col items-center min-w-0 px-3 py-4 ${i < efficiency.length - 1 ? 'border-r border-[#000052]/10' : ''}`}><div className="w-full h-[190px] flex items-end justify-center relative border-b border-[#000052]/10"><div className={`w-12 ${barClass(a.value)} rounded-t-lg relative`} style={{ height: `${h}px` }}><span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-[#000052] whitespace-nowrap">{a.value}%</span></div></div><div className="text-center mt-3 w-full"><div className="font-semibold text-sm text-[#000052] leading-tight" title={a.name}>{a.name}</div><div className="text-xs text-[#000052]/60 mt-1">{label(a.value)}</div></div></div>; })}</div></div></div>
  </div>;
}