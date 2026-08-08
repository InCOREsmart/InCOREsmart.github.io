import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, DollarSign, Lock, Shield, TrendingUp, XCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DemoPayoutStream, getDemoContractById } from '../../lib/demoData';
import { getContractFullData, releasePayment } from '../../lib/smartContractLogic';

export function CEOContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'streams' | 'escrow' | 'oracle' | 'disputes'>('streams');

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const demo = getDemoContractById(id);
        if (demo) {
          const { DEMO_AGENTS } = await import('../../lib/demoData');
          const agent = DEMO_AGENTS.find(item => item.contracts.some(contract => contract.id === id));
          setData({
            contract: demo,
            streams: demo.payout_streams,
            escrowEvents: demo.escrow_events,
            oracleEvents: demo.oracle_events,
            disputes: [],
            agent,
            financials: {
              plannedRevenue: demo.revenue,
              totalEscrow: demo.escrow_amount,
              totalLocked: demo.total_locked,
              totalUnlocked: demo.total_paid,
              companyProfit: demo.company_profit,
              platformFee: demo.platform_fee,
            },
            isDemo: true,
          });
          return;
        }
        if (!user) return;
        const real = await getContractFullData(id);
        if (real) setData({ ...real, isDemo: false });
      } catch (error) {
        console.error('Ошибка загрузки данных контракта:', error);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [id, user]);

  const refreshReal = async () => {
    if (!id || !user) return;
    const real = await getContractFullData(id);
    if (real) setData({ ...real, isDemo: false });
  };

  const handleRelease = async (stream: DemoPayoutStream | any) => {
    if (!id || data?.isDemo || !user) return;
    const result = await releasePayment(id, stream.id, user.id);
    if (!result.success) alert(result.error || 'Не удалось разблокировать выплату');
    await refreshReal();
  };

  if (loading) return <div className="p-8 text-center text-[#000052]">Загрузка данных контракта...</div>;
  if (!data) return <div className="p-8 text-center"><XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" /><p className="text-lg text-[#000052]">Контракт не найден</p><button onClick={() => navigate('/ceo/contracts')} className="mt-4 px-6 py-2 bg-[#000052] text-white rounded-lg">Вернуться к контрактам</button></div>;

  const { contract, streams, escrowEvents, oracleEvents, disputes, agent, financials } = data;
  const streamList = streams || [];
  const escrowList = escrowEvents || [];
  const oracleList = oracleEvents || [];
  const disputeList = disputes || [];
  const paid = streamList.filter((stream: any) => stream.status === 'PAID').reduce((sum: number, stream: any) => sum + Number(stream.amount || 0), 0);
  const locked = streamList.filter((stream: any) => stream.status === 'LOCKED').reduce((sum: number, stream: any) => sum + Number(stream.amount || 0), 0);
  const plannedRevenue = Number(financials?.plannedRevenue ?? contract.revenue ?? contract.planned_revenue ?? 0);
  const totalEscrow = Number(financials?.totalEscrow ?? contract.escrow_amount ?? 0);
  const companyProfit = Number(financials?.companyProfit ?? contract.company_profit ?? 0);
  const platformFee = Number(financials?.platformFee ?? contract.platform_fee ?? 0);
  const totalPaid = Number(financials?.totalUnlocked ?? paid);
  const totalLocked = Number(financials?.totalLocked ?? locked);

  const kpiValues = [
    contract.kpi_calls ? Number(contract.actual_calls || 0) / Number(contract.kpi_calls) : 0,
    contract.kpi_meetings ? Number(contract.actual_meetings || 0) / Number(contract.kpi_meetings) : 0,
    contract.kpi_proposals ? Number(contract.actual_proposals || 0) / Number(contract.kpi_proposals) : 0,
    contract.target_clients ? Number(contract.actual_clients || 0) / Number(contract.target_clients) : 0,
  ];
  const kpi = Math.round(kpiValues.reduce((a: number, b: number) => a + b, 0) / kpiValues.length * 100);

  const statusLabel = (status: string) => ({ LOCKED: 'Заблокирован', UNLOCKED: 'Разблокирован', PAYABLE: 'К выплате', PAID: 'Выплачено', CLAWED_BACK: 'Возврат', CANCELLED: 'Отменён' }[status] || status);
  const eventLabel = (type: string) => ({ ESCROW_CREATED: 'Создание эскроу', ESCROW_FUNDED: 'Пополнение эскроу', PARTIAL_RELEASE: 'Частичная разблокировка', PAYOUT_TO_AGENT: 'Выплата агенту', REFUND_TO_CEO: 'Возврат компании', CLAWBACK: 'Clawback', CLIENT_PAYMENT_CONFIRMED: 'Оплата клиента подтверждена', RETENTION_PERIOD_PASSED: 'Период удержания пройден', RENEWAL_CONFIRMED: 'Продление подтверждено', CROSS_SELL_CONFIRMED: 'Cross-sell подтверждён', PLAN_ACHIEVED: 'План выполнен', ANNUAL_BONUS_CONFIRMED: 'Годовой бонус подтверждён' }[type] || type);

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        <div><button onClick={() => navigate('/ceo/contracts')} className="flex items-center text-sm text-[#000052]/60 hover:text-[#000052] mb-2"><ArrowLeft className="w-4 h-4 mr-2" />Назад к контрактам</button><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{contract.title}</h1><p className="text-sm text-[#000052]/60 mt-1">Агент: {agent?.full_name || 'Не назначен'} · {contract.start_date || contract.start_at || contract.created_at} — {contract.deadline || contract.end_date || contract.end_at || '—'}</p></div>
        <span className="px-3 py-1 rounded-full bg-[#B8860B]/10 text-[#B8860B] text-sm font-semibold">{contract.status}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl"><div className="flex gap-2 mb-2"><DollarSign className="w-5 h-5" /><span className="text-sm opacity-80">Плановая выручка</span></div><p className="text-2xl font-bold">${plannedRevenue.toLocaleString()}</p></div>
        <div className="bg-[#B8860B] text-white p-5 rounded-xl"><div className="flex gap-2 mb-2"><Shield className="w-5 h-5" /><span className="text-sm opacity-80">Эскроу</span></div><p className="text-2xl font-bold">${totalEscrow.toLocaleString()}</p></div>
        <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm text-[#000052]/70">Выплачено</span></div><p className="text-2xl font-bold text-[#000052]">${totalPaid.toLocaleString()}</p></div>
        <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex gap-2 mb-2"><Lock className="w-5 h-5 text-[#B8860B]" /><span className="text-sm text-[#000052]/70">Заблокировано</span></div><p className="text-2xl font-bold text-[#000052]">${totalLocked.toLocaleString()}</p></div>
        <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex gap-2 mb-2"><TrendingUp className="w-5 h-5 text-[#B8860B]" /><span className="text-sm text-[#000052]/70">Результат компании</span></div><p className="text-2xl font-bold text-[#000052]">${companyProfit.toLocaleString()}</p><p className="text-xs text-[#000052]/60">Комиссия ${platformFee.toLocaleString()}</p></div>
      </div>

      <div className="bg-white p-5 rounded-xl border border-[#000052]/10">
        <div className="flex justify-between mb-3"><h2 className="font-bold text-[#000052]">KPI контракта</h2><span className="font-bold text-[#B8860B]">{kpi}%</span></div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[[`Звонки`, contract.actual_calls, contract.kpi_calls], [`Встречи`, contract.actual_meetings, contract.kpi_meetings], [`КП`, contract.actual_proposals, contract.kpi_proposals], [`Клиенты`, contract.actual_clients, contract.target_clients]].map(([label, actual, target]) => { const progress = Number(target) > 0 ? Math.min(Number(actual || 0) / Number(target) * 100, 100) : 0; return <div key={String(label)}><div className="flex justify-between text-xs mb-1"><span>{label}</span><b>{actual || 0}/{target || 0}</b></div><div className="h-2 bg-[#000052]/10 rounded-full"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${progress}%` }} /></div></div>; })}
        </div>
      </div>

      <div className="border-b border-[#000052]/10"><div className="flex gap-5 overflow-x-auto">{([['streams', `Потоки выплат (${streamList.length})`], ['escrow', `Журнал эскроу (${escrowList.length})`], ['oracle', `События Oracle (${oracleList.length})`], ['disputes', `Споры (${disputeList.length})`]] as const).map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`pb-3 px-2 text-sm font-semibold whitespace-nowrap ${tab === key ? 'text-[#B8860B] border-b-2 border-[#B8860B]' : 'text-[#000052]/60'}`}>{label}</button>)}</div></div>

      {tab === 'streams' && <div className="space-y-4"><h2 className="text-xl font-bold text-[#000052]">8 потоков выплат</h2>{streamList.map((stream: any) => <div key={stream.id} className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h3 className="font-bold text-[#000052]">{stream.title}</h3><p className="text-xs text-[#000052]/60 mt-1">{stream.unlock_condition || 'Условие не указано'}</p></div><div className="text-right"><p className="text-2xl font-bold text-[#000052]">${Number(stream.amount || 0).toLocaleString()}</p><span className="px-3 py-1 rounded-full bg-[#000052]/5 text-xs font-semibold">{statusLabel(stream.status)}</span></div></div>{stream.unlocked_at && <p className="text-xs text-[#000052]/60 mt-3">Разблокировано: {new Date(stream.unlocked_at).toLocaleString('ru-RU')}</p>}{stream.paid_at && <p className="text-xs text-green-600 mt-1">Выплачено: {new Date(stream.paid_at).toLocaleString('ru-RU')}</p>}{stream.status === 'UNLOCKED' && !data.isDemo && <button onClick={() => handleRelease(stream)} className="mt-3 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold">Разблокировать выплату</button>}</div>)}</div>}

      {tab === 'escrow' && <div className="space-y-4"><h2 className="text-xl font-bold text-[#000052]">Журнал эскроу</h2>{escrowList.map((event: any) => <div key={event.id} className="bg-white p-4 rounded-xl border border-[#000052]/10 flex items-start gap-4"><Clock className="w-5 h-5 text-[#B8860B] mt-1" /><div className="flex-1"><p className="font-semibold text-[#000052]">{eventLabel(event.event_type)}</p><p className="text-xs text-[#000052]/60 mt-1">{new Date(event.created_at).toLocaleString('ru-RU')} · {event.actor_role || 'SYSTEM'}</p></div><b className="text-[#000052]">{event.amount != null ? `$${Number(event.amount).toLocaleString()}` : '—'}</b></div>)}</div>}

      {tab === 'oracle' && <div className="space-y-4"><h2 className="text-xl font-bold text-[#000052]">События Oracle</h2>{oracleList.map((event: any) => <div key={event.id} className="bg-white p-4 rounded-xl border border-[#000052]/10"><div className="flex justify-between gap-4"><div><p className="font-semibold text-[#000052]">{eventLabel(event.event_type)}</p><p className="text-xs text-[#000052]/60 mt-1">{new Date(event.created_at).toLocaleString('ru-RU')} · {event.source || 'SYSTEM'}</p></div><CheckCircle className="w-5 h-5 text-green-600" /></div>{event.payload && <pre className="mt-3 text-xs bg-[#000052]/5 rounded-lg p-3 overflow-auto">{JSON.stringify(event.payload, null, 2)}</pre>}</div>)}</div>}

      {tab === 'disputes' && <div className="space-y-4"><h2 className="text-xl font-bold text-[#000052]">Споры</h2>{disputeList.length === 0 ? <div className="bg-white p-6 rounded-xl border border-[#000052]/10 text-[#000052]/60">Споров по этому контракту нет.</div> : disputeList.map((dispute: any) => <div key={dispute.id} className="bg-white p-5 rounded-xl border border-[#000052]/10"><p className="font-semibold text-[#000052]">{dispute.reason}</p><p className="text-xs text-[#000052]/60 mt-2">Статус: {dispute.status}</p></div>)}</div>}
    </div>
  );
}
