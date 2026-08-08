import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Shield, TrendingUp, CheckCircle, PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { DEMO_AGENTS } from '../../lib/demoData';
import { getEscrowAmount, getPaidAmount } from '../../lib/annualBonus';

const n = (v: any) => Number(v || 0);
const active = (c: any) => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS';
const demoKPI = (c: any) => c.kpi_calls > 0 ? Math.round((n(c.actual_calls) / n(c.kpi_calls)) * 100) : 0;
const realKPI = (c: any) => {
  const pairs = [[c.actual_calls, c.kpi_calls], [c.actual_meetings, c.kpi_meetings], [c.actual_proposals, c.kpi_proposals], [c.actual_clients, c.target_clients]].filter(([, t]) => n(t) > 0);
  if (pairs.length) return Math.round(pairs.reduce((s, [a, t]) => s + (n(a) / n(t)) * 100, 0) / pairs.length);
  const planned = n(c.planned_revenue || c.sales_plan || c.target_revenue);
  return planned > 0 ? Math.round((n(c.actual_revenue || c.revenue || c.sales_amount) / planned) * 100) : 0;
};
const monthStart = () => { const d = new Date(); return new Date(d.getFullYear(), d.getMonth(), 1); };
const inAugust = (s: any) => { const v = s.paid_at || s.unlocked_at || s.payment_date || s.updated_at || s.created_at; if (!v) return false; const d = new Date(v); return !Number.isNaN(d.getTime()) && d >= monthStart(); };

export function CEODashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalRevenue: 0, totalEscrow: 0, totalPaidToAgents: 0, netProfit: 0, avgROI: 0, activeContracts: 0, pendingPayouts: 0, periodPaid: 0, periodPending: 0 });
  const [streams, setStreams] = useState<any[]>([]);
  const [efficiency, setEfficiency] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const load = async () => {
      try {
        const demos = DEMO_AGENTS.flatMap(a => a.contracts.map(c => ({ ...c, agent_id: a.id, agent_name: a.full_name, is_demo: true })));
        const { data: company, error: companyError } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyError) throw companyError;
        let agents: any[] = [], contracts: any[] = [], payoutStreams: any[] = [];
        if (company?.id) {
          const a = await supabase.from('agents').select('*').eq('company_id', company.id);
          if (a.error) throw a.error;
          agents = a.data || [];
          const c = await supabase.from('contracts').select('*').eq('company_id', company.id);
          if (c.error) throw c.error;
          contracts = c.data || [];
          const ids = contracts.map(c => c.id).filter(Boolean);
          if (ids.length) {
            const s = await supabase.from('contract_payout_streams').select('*').in('contract_id', ids);
            if (s.error) throw s.error;
            payoutStreams = s.data || [];
          }
        }
        const names = new Map(agents.map(a => [a.id, a.full_name || a.name || a.email || 'Агент']));
        const real = contracts.map(c => ({ ...c, agent_name: names.get(c.agent_id) || 'Агент', is_demo: false }));
        const currentDemo = demos.filter(active);
        const all = [...currentDemo, ...real];
        let totalRevenue = 0, totalEscrow = 0, totalPaid = 0, profit = 0, roiSum = 0, roiCount = 0, pending = 0, periodPaid = 0, periodPending = 0;
        const grouped: Record<string, any> = {};
        const people: Record<string, any> = {};

        all.forEach(c => {
          const ps = c.is_demo ? (c.payout_streams || []) : payoutStreams.filter(s => s.contract_id === c.id);
          const escrowFromStreams = getEscrowAmount(c, ps);
          const escrow = escrowFromStreams || n(c.escrow_amount);
          const paid = getPaidAmount(ps);
          const currentPending = ps.filter(s => (s.status === 'UNLOCKED' || s.status === 'PAYABLE') && inAugust(s)).reduce((s, x) => s + n(x.amount), 0);
          const revenue = n(c.revenue || c.planned_revenue);
          const companyProfit = c.is_demo ? revenue - escrow : n(c.company_profit || revenue - escrow);
          const roi = c.roi_percentage != null ? n(c.roi_percentage) : revenue > 0 ? Math.round(companyProfit / revenue * 100) : 0;
          totalRevenue += revenue; totalEscrow += escrow; totalPaid += paid; profit += companyProfit; pending += currentPending;
          if (revenue > 0) { roiSum += roi; roiCount++; }
          ps.filter(s => s.stream_key !== 'annual').forEach(s => {
            const key = s.stream_key || 'other';
            if (!grouped[key]) grouped[key] = { key, title: s.title || key, total: 0 };
            grouped[key].total += n(s.amount);
            if (s.status === 'PAID' && inAugust(s)) periodPaid += n(s.amount);
          });
          const key = c.agent_id || c.agent_name || c.id;
          if (!people[key]) people[key] = { name: c.agent_name || 'Агент', total: 0, count: 0 };
          people[key].total += c.is_demo ? demoKPI(c) : realKPI(c); people[key].count++;
        });
        agents.forEach(a => { if (!people[a.id]) people[a.id] = { name: a.full_name || a.name || a.email || 'Агент', total: 0, count: 0 }; });
        periodPending = pending;
        setMetrics({ totalRevenue, totalEscrow, totalPaidToAgents: totalPaid, netProfit: profit, avgROI: roiCount ? Math.round(roiSum / roiCount) : 0, activeContracts: all.length, pendingPayouts: pending, periodPaid, periodPending });
        setStreams(Object.values(grouped));
        setEfficiency(Object.values(people).map(p => ({ name: p.name, value: p.count ? Math.round(p.total / p.count) : 0 })).sort((a, b) => b.value - a.value));
      } catch (e) {
        console.error('Ошибка загрузки финансового ядра:', e);
        setMetrics({ totalRevenue: 0, totalEscrow: 0, totalPaidToAgents: 0, netProfit: 0, avgROI: 0, activeContracts: 0, pendingPayouts: 0, periodPaid: 0, periodPending: 0 }); setStreams([]); setEfficiency([]);
      } finally { setLoading(false); }
    };
    load();
  }, [user]);

  if (loading) return <div className="p-8 text-center text-[#000052]">Загрузка...</div>;
  const paymentBase = metrics.periodPaid + metrics.periodPending;
  const paymentProgress = paymentBase ? Math.round(metrics.periodPaid / paymentBase * 100) : 0;
  const totalStreams = streams.reduce((s, x) => s + x.total, 0);
  const colors = ['#000052', '#B8860B', '#10B981', '#3B82F6', '#EF4444', '#8B5CF6'];
  const barClass = (v: number) => v < 80 ? 'bg-red-500' : v > 100 ? 'bg-emerald-500' : 'bg-[#B8860B]';
  const label = (v: number) => v < 80 ? 'Критично' : v > 100 ? 'Перевыполнение' : v === 100 ? 'План выполнен' : 'Выполнение плана';
  const cards = [
    ['Общая выручка', `$${metrics.totalRevenue.toLocaleString()}`, DollarSign, 'bg-[#000052]', 'text-white'],
    ['Прибыль', `$${metrics.netProfit.toLocaleString()}`, TrendingUp, 'bg-white', 'text-[#000052]'],
    ['Средний ROI', `${metrics.avgROI}%`, BarChart3, 'bg-green-600', 'text-white'],
    ['Активные контракты', metrics.activeContracts.toLocaleString(), CheckCircle, 'bg-white', 'text-[#000052]'],
  ];

  return <div className="p-4 md:p-6 space-y-6">
    <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">Финансовое ядро</h1><p className="text-sm text-[#000052]/70 mt-1">Ключевые финансовые показатели компании</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">{cards.map(([title, value, Icon, bg, fg]: any, i) => <div key={i} className={`${bg} ${fg} p-5 rounded-xl border border-[#000052]/10`}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-80">{title}</h3><Icon className="w-5 h-5 opacity-80" /></div><p className="text-2xl font-bold">{value}</p></div>)}</div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-start justify-between gap-4 mb-5"><div><div className="flex items-center gap-2"><Shield className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Движение средств за август</h2></div><p className="text-sm text-[#000052]/60 mt-1">Эскроу, фактически выплаченные и ожидающие выплаты всем 7 агентам</p></div><div className="text-right"><div className="text-xs text-[#000052]/60">В эскроу</div><div className="text-xl font-bold text-[#000052]">${metrics.totalEscrow.toLocaleString()}</div></div></div><div className="h-5 bg-[#000052]/10 rounded-full overflow-hidden flex"><div className="h-full bg-emerald-500" style={{ width: `${paymentProgress}%` }} /><div className="h-full bg-[#B8860B]" style={{ width: `${100 - paymentProgress}%` }} /></div><div className="grid grid-cols-3 gap-4 mt-4 text-sm"><div><div className="text-[#000052]/60">Эскроу</div><div className="font-bold mt-1">${metrics.totalEscrow.toLocaleString()}</div></div><div><div className="text-[#000052]/60">Выплачено в августе</div><div className="font-bold text-emerald-600 mt-1">${metrics.periodPaid.toLocaleString()}</div></div><div><div className="text-[#000052]/60">Ожидает выплаты</div><div className="font-bold text-[#B8860B] mt-1">${metrics.periodPending.toLocaleString()}</div></div></div><div className="flex justify-between mt-3 text-xs text-[#000052]/60"><span>Выплачено: {paymentProgress}%</span><span>Ожидает: {100 - paymentProgress}%</span></div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-5"><BarChart3 className="w-5 h-5 text-[#B8860B]" /><div><h2 className="text-lg font-bold text-[#000052]">Выполнение плана агентами</h2><p className="text-sm text-[#000052]/60">Процент выполнения плана продаж по каждому агенту</p></div></div><div className="flex flex-wrap gap-3 mb-6 text-xs text-[#000052]/70"><span>🔴 Ниже 80% — критично</span><span>🟡 80–100% — выполнение плана</span><span>🟢 Выше 100% — перевыполнение</span></div><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5 items-end">{efficiency.map((a, i) => { const h = Math.max(8, Math.min(180, a.value / 120 * 180)); return <div key={`${a.name}-${i}`} className="flex flex-col items-center"><div className="w-full h-[190px] flex items-end justify-center relative border-b border-[#000052]/10"><div className={`w-12 sm:w-16 ${barClass(a.value)} rounded-t-lg relative`} style={{ height: `${h}px` }}><span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-[#000052] whitespace-nowrap">{a.value}%</span></div></div><div className="text-center mt-3 w-full"><div className="font-semibold text-sm text-[#000052] truncate">{a.name}</div><div className="text-xs text-[#000052]/60 mt-1">{label(a.value)}</div></div></div>; })}</div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><div className="flex items-center gap-2 mb-6"><PieChartIcon className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Распределение бюджета</h2></div><div className="flex flex-col md:flex-row items-center gap-6"><svg viewBox="0 0 200 200" className="w-48 h-48 flex-shrink-0">{(() => { let cp = 0; return streams.map((s, i) => { const p = totalStreams ? s.total / totalStreams * 100 : 0; const sa = cp / 100 * 360; cp += p; const ea = cp / 100 * 360; const sr = (sa - 90) * Math.PI / 180; const er = (ea - 90) * Math.PI / 180; const x1 = 100 + 80 * Math.cos(sr), y1 = 100 + 80 * Math.sin(sr), x2 = 100 + 80 * Math.cos(er), y2 = 100 + 80 * Math.sin(er); return <path key={s.key} d={`M 100 100 L ${x1} ${y1} A 80 80 0 ${p > 50 ? 1 : 0} 1 ${x2} ${y2} Z`} fill={colors[i % colors.length]} opacity="0.85"><title>{`${s.title}: $${s.total.toLocaleString()} (${p.toFixed(1)}%)`}</title></path>; }); })()}<circle cx="100" cy="100" r="40" fill="white" /><text x="100" y="95" textAnchor="middle" fontSize="12" fill="#000052" fontWeight="bold">Всего</text><text x="100" y="112" textAnchor="middle" fontSize="14" fill="#B8860B" fontWeight="bold">${(totalStreams / 1000).toFixed(0)}K</text></svg><div className="flex-1 space-y-2 w-full">{streams.map((s, i) => <div key={s.key} className="flex items-center justify-between p-2 hover:bg-[#000052]/5 rounded-lg"><div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full" style={{ backgroundColor: colors[i % colors.length] }} /><span className="text-sm text-[#000052]">{s.title}</span></div><div className="text-right"><div className="text-sm font-bold text-[#000052]">${s.total.toLocaleString()}</div><div className="text-xs text-[#000052]/60">{totalStreams ? (s.total / totalStreams * 100).toFixed(1) : '0'}%</div></div></div>)}</div></div></div>
  </div>;
}
