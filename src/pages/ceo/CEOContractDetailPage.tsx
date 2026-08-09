import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, DollarSign, Lock, Shield, TrendingUp, XCircle, Pencil, Scale, Activity } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DemoPayoutStream, getDemoContractById } from '../../lib/demoData';
import { getEscrowStreams, getEscrowAmount, getPaidAmount, getLockedAmount } from '../../lib/annualBonus';
import { getContractFullData, releasePayment } from '../../lib/smartContractLogic';
import { EditDraftContractModal } from '../../components/ui/EditDraftContractModal';
import { ContractTechnicalPanel } from '../../components/smart-contract/ContractTechnicalPanel';
import { getContractTimeline } from '../../lib/smart-contract/timelineService';
import { supabase } from '../../lib/supabase';

export function CEOContractDetailPage() {
  const { t, i18n } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<any>(null);
  const [tab, setTab] = useState<'streams' | 'escrow' | 'oracle' | 'timeline' | 'technical' | 'disputes'>('streams');
  const [timeline, setTimeline] = useState<any[]>([]);
  const [editOpen, setEditOpen] = useState(false);
  const [arbitrationStream, setArbitrationStream] = useState<any>(null);
  const [arbitrationReason, setArbitrationReason] = useState('');
  const [arbitrationSaving, setArbitrationSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      if (!id) return;
      try {
        const demo = getDemoContractById(id);
        if (demo) {
          const { DEMO_AGENTS } = await import('../../lib/demoData');
          const agent = DEMO_AGENTS.find(item => item.contracts.some(contract => contract.id === id));
          const escrowStreams = getEscrowStreams(demo.payout_streams);
          const escrowAmount = getEscrowAmount(demo, escrowStreams);
          const totalPaid = getPaidAmount(escrowStreams);
          const totalLocked = getLockedAmount(escrowStreams);
          const escrowEvents = demo.escrow_events.map(event => ({
            ...event,
            amount: event.event_type === 'ESCROW_CREATED' || event.event_type === 'ESCROW_FUNDED' ? escrowAmount : event.amount,
            metadata: event.metadata ? { ...event.metadata, streams_count: escrowStreams.length, total_escrow: escrowAmount } : event.metadata,
          }));
          setData({
            contract: demo,
            streams: escrowStreams,
            escrowEvents,
            oracleEvents: demo.oracle_events,
            disputes: [],
            agent,
            financials: { plannedRevenue: demo.revenue, totalEscrow: escrowAmount, totalLocked, totalUnlocked: totalPaid, companyProfit: demo.revenue - escrowAmount, platformFee: demo.platform_fee },
            isDemo: true,
          });
          setTimeline([]);
          return;
        }
        if (!user) return;
        const real = await getContractFullData(id);
        if (real) setData({ ...real, isDemo: false });
        const history = await getContractTimeline(id);
        if (!history.error) setTimeline(history.data || []);
      } catch (error) {
        console.error(error);
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
    const history = await getContractTimeline(id);
    if (!history.error) setTimeline(history.data || []);
  };

  const handleRelease = async (stream: DemoPayoutStream | any) => {
    if (!id || data?.isDemo || !user) return;
    const result = await releasePayment(id, stream.id, user.id);
    if (!result.success) alert(result.error || t('contractDetail.releasePayout'));
    await refreshReal();
  };

  const submitArbitration = async () => {
    if (!arbitrationStream || !arbitrationReason.trim() || !user || !id || data?.isDemo) return;
    setArbitrationSaving(true);
    try {
      const { error } = await supabase.from('disputes').insert({
        company_id: data.contract.company_id,
        contract_id: id,
        agent_id: data.contract.agent_id,
        type: 'payment_issue',
        status: 'OPEN',
        amount: Number(arbitrationStream.amount || 0),
        title: t('actions.payoutError'),
        description: arbitrationReason.trim(),
      });
      if (error) throw error;
      setArbitrationStream(null);
      setArbitrationReason('');
      setTab('disputes');
      await refreshReal();
    } catch (error) {
      console.error(error);
      alert(t('common.error'));
    } finally {
      setArbitrationSaving(false);
    }
  };

  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'kk' || i18n.language === 'kz' ? 'kk-KZ' : 'en-US';
  const formatDate = (value: string | null) => value ? new Date(value).toLocaleString(locale) : '—';
  const statusLabel = (status: string) => ({
    LOCKED: t('contractDetail.statusLocked'), UNLOCKED: t('contractDetail.statusUnlocked'), PAYABLE: t('contractDetail.statusPayable'),
    PAID: t('contractDetail.statusPaid'), CLAWED_BACK: t('contractDetail.statusClawedBack'), CANCELLED: t('contractDetail.statusCancelled'),
  }[status] || status);
  const eventLabel = (type: string) => ({
    ESCROW_CREATED: t('contractDetail.eventEscrowCreated'), ESCROW_FUNDED: t('contractDetail.eventEscrowFunded'), PARTIAL_RELEASE: t('contractDetail.eventPartialRelease'),
    PAYOUT_TO_AGENT: t('contractDetail.eventPayout'), REFUND_TO_CEO: t('contractDetail.eventRefund'), CLAWBACK: t('contractDetail.eventClawback'),
    CLIENT_PAYMENT_CONFIRMED: t('contractDetail.eventClientPayment'), RETENTION_PERIOD_PASSED: t('contractDetail.eventRetention'), RENEWAL_CONFIRMED: t('contractDetail.eventRenewal'),
    CROSS_SELL_CONFIRMED: t('contractDetail.eventCrossSell'), PLAN_ACHIEVED: t('contractDetail.eventPlan'), ANNUAL_BONUS_CONFIRMED: t('contractDetail.eventAnnualBonus'),
  }[type] || type);

  if (loading) return <div className="p-8 text-center text-[#000052]">{t('ui.loading')}</div>;
  if (!data) return <div className="p-8 text-center"><XCircle className="w-16 h-16 mx-auto text-red-500 mb-4" /><p className="text-lg text-[#000052]">{t('contract.noContracts')}</p><button onClick={() => navigate('/ceo/contracts')} className="mt-4 px-6 py-2 bg-[#000052] text-white rounded-lg">{t('contractDetail.back')}</button></div>;

  const { contract, streams, escrowEvents, oracleEvents, disputes, agent, financials } = data;
  const streamList = getEscrowStreams(streams || []);
  const escrowList = escrowEvents || [];
  const oracleList = oracleEvents || [];
  const disputeList = disputes || [];
  const paid = getPaidAmount(streamList);
  const locked = getLockedAmount(streamList);
  const plannedRevenue = Number(financials?.plannedRevenue ?? contract.revenue ?? contract.planned_revenue ?? 0);
  const calculatedEscrow = streamList.length ? getEscrowAmount(contract, streamList) : Number(contract.escrow_amount ?? 0);
  const totalEscrow = Number(financials?.totalEscrow ?? calculatedEscrow);
  const companyProfit = Number(financials?.companyProfit ?? contract.company_profit ?? (plannedRevenue - totalEscrow));
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
  const kpis = [
    [t('contractDetail.calls'), contract.actual_calls, contract.kpi_calls],
    [t('contractDetail.meetings'), contract.actual_meetings, contract.kpi_meetings],
    [t('contractDetail.proposals'), contract.actual_proposals, contract.kpi_proposals],
    [t('contractDetail.clients'), contract.actual_clients, contract.target_clients],
  ];
  const tabs = [
    ['streams', `${t('contractDetail.payoutStreams')} (${streamList.length})`],
    ['escrow', `${t('contractDetail.escrowJournal')} (${escrowList.length})`],
    ['oracle', `${t('contractDetail.oracleEvents')} (${oracleList.length})`],
    ['timeline', `${t('smartContract.timeline', 'Timeline')} (${timeline.length})`],
    ['technical', t('smartContract.technical', 'Technical')],
    ['disputes', `${t('contractDetail.disputes')} (${disputeList.length})`],
  ] as const;

  return <div className="p-4 md:p-6 space-y-6 max-w-7xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <button onClick={() => navigate('/ceo/contracts')} className="flex items-center text-sm text-[#000052]/60 mb-2"><ArrowLeft className="w-4 h-4 mr-2" />{t('contractDetail.back')}</button>
        <div className="flex items-center gap-3"><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{contract.title}</h1>{contract.status === 'DRAFT' && !data.isDemo && <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#000052] text-white rounded-lg text-sm font-semibold"><Pencil className="w-4 h-4" />{t('actions.editDraft')}</button>}</div>
        <p className="text-sm text-[#000052]/60 mt-1">{t('contractDetail.agent')}: {agent?.full_name || t('contractDetail.notAssigned')} · {formatDate(contract.start_date || contract.start_at || contract.created_at)} — {formatDate(contract.deadline || contract.end_date || contract.end_at)}</p>
      </div>
      <span className="px-3 py-1 rounded-full bg-[#B8860B]/10 text-[#B8860B] text-sm font-semibold">{statusLabel(contract.status)}</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
      <div className="bg-[#000052] text-white p-5 rounded-xl"><div className="flex gap-2 mb-2"><DollarSign className="w-5 h-5" /><span className="text-sm opacity-80">{t('contractDetail.plannedRevenue')}</span></div><p className="text-2xl font-bold">${plannedRevenue.toLocaleString()}</p></div>
      <div className="bg-[#B8860B] text-white p-5 rounded-xl"><div className="flex gap-2 mb-2"><Shield className="w-5 h-5" /><span className="text-sm opacity-80">{t('ui.escrow')}</span></div><p className="text-2xl font-bold">${totalEscrow.toLocaleString()}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex gap-2 mb-2"><CheckCircle className="w-5 h-5 text-green-600" /><span className="text-sm text-[#000052]/70">{t('contractDetail.paid')}</span></div><p className="text-2xl font-bold">${totalPaid.toLocaleString()}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex gap-2 mb-2"><Lock className="w-5 h-5 text-[#B8860B]" /><span className="text-sm text-[#000052]/70">{t('contractDetail.locked')}</span></div><p className="text-2xl font-bold">${totalLocked.toLocaleString()}</p></div>
      <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex gap-2 mb-2"><TrendingUp className="w-5 h-5 text-[#B8860B]" /><span className="text-sm text-[#000052]/70">{t('contractDetail.companyResult')}</span></div><p className="text-2xl font-bold">${companyProfit.toLocaleString()}</p><p className="text-xs text-[#000052]/60">{t('contractDetail.commission')} ${platformFee.toLocaleString()}</p></div>
    </div>

    <div className="bg-white p-4 rounded-xl border border-[#B8860B]/30 text-sm text-[#000052]/70">{t('contractDetail.annualBonusNotice')}</div>
    <div className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex justify-between mb-3"><h2 className="font-bold text-[#000052]">{t('contractDetail.kpi')}</h2><span className="font-bold text-[#B8860B]">{kpi}%</span></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{kpis.map(([label, actual, target]) => { const progress = Number(target) > 0 ? Math.min(Number(actual || 0) / Number(target) * 100, 100) : 0; return <div key={String(label)}><div className="flex justify-between text-xs mb-1"><span>{label}</span><b>{actual || 0}/{target || 0}</b></div><div className="h-2 bg-[#000052]/10 rounded-full"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${progress}%` }} /></div></div>; })}</div></div>

    <div className="border-b border-[#000052]/10"><div className="flex gap-5 overflow-x-auto">{tabs.map(([key, label]) => <button key={key} onClick={() => setTab(key)} className={`pb-3 px-2 text-sm font-semibold whitespace-nowrap ${tab === key ? 'text-[#B8860B] border-b-2 border-[#B8860B]' : 'text-[#000052]/60'}`}>{label}</button>)}</div></div>

    {tab === 'streams' && <div className="space-y-4"><h2 className="text-xl font-bold text-[#000052]">{streamList.length} {t('contractDetail.payoutStreamCount')}</h2>{streamList.map((stream: any) => <div key={stream.id} className="bg-white p-5 rounded-xl border border-[#000052]/10"><div className="flex flex-col md:flex-row md:items-center justify-between gap-3"><div><h3 className="font-bold text-[#000052]">{stream.title}</h3><p className="text-xs text-[#000052]/60 mt-1">{stream.unlock_condition || t('contractDetail.conditionNotSpecified')}</p></div><div className="text-right"><p className="text-2xl font-bold">${Number(stream.amount || 0).toLocaleString()}</p><span className="px-3 py-1 rounded-full bg-[#000052]/5 text-xs font-semibold">{statusLabel(stream.status)}</span></div></div>{stream.unlocked_at && <p className="text-xs text-[#000052]/60 mt-3">{t('contractDetail.unlocked')}: {formatDate(stream.unlocked_at)}</p>}{stream.paid_at && <p className="text-xs text-green-600 mt-1">{t('contractDetail.paid')}: {formatDate(stream.paid_at)}</p>}<div className="flex flex-wrap gap-2 mt-3">{stream.status === 'UNLOCKED' && !data.isDemo && <button onClick={() => handleRelease(stream)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-semibold">{t('contractDetail.releasePayout')}</button>}{stream.status === 'PAID' && !data.isDemo && <button onClick={() => { setArbitrationStream(stream); setArbitrationReason(''); }} className="inline-flex items-center gap-2 px-4 py-2 bg-[#000052] text-white rounded-lg text-sm font-semibold"><Scale className="w-4 h-4" />{t('actions.sendToArbitration')}</button>}</div></div>)}</div>}

    {tab === 'escrow' && <div className="space-y-4"><h2 className="text-xl font-bold text-[#000052]">{t('contractDetail.escrowJournal')}</h2>{escrowList.map((event: any) => <div key={event.id} className="bg-white p-4 rounded-xl border border-[#000052]/10 flex items-start gap-4"><Clock className="w-5 h-5 text-[#B8860B] mt-1" /><div className="flex-1"><p className="font-semibold text-[#000052]">{eventLabel(event.event_type)}</p><p className="text-xs text-[#000052]/60 mt-1">{formatDate(event.created_at)} · {event.actor_role || t('contractDetail.system')}</p></div><b>{event.amount != null ? `$${Number(event.amount).toLocaleString()}` : '—'}</b></div>)}</div>}

    {tab === 'oracle' && <div className="space-y-4"><h2 className="text-xl font-bold text-[#000052]">{t('contractDetail.oracleEvents')}</h2>{oracleList.map((event: any) => <div key={event.id} className="bg-white p-4 rounded-xl border border-[#000052]/10"><div className="flex justify-between gap-4"><div><p className="font-semibold text-[#000052]">{eventLabel(event.event_type)}</p><p className="text-xs text-[#000052]/60 mt-1">{formatDate(event.created_at)} · {event.source || t('contractDetail.system')}</p></div><CheckCircle className="w-5 h-5 text-green-600" /></div>{event.payload && <pre className="mt-3 text-xs bg-[#000052]/5 rounded-lg p-3 overflow-auto">{JSON.stringify(event.payload, null, 2)}</pre>}</div>)}</div>}

    {tab === 'timeline' && <div className="space-y-4"><div className="flex items-center gap-2"><Activity className="w-5 h-5 text-[#B8860B]" /><h2 className="text-xl font-bold text-[#000052]">{t('smartContract.timeline', 'Contract timeline')}</h2></div>{timeline.length === 0 ? <div className="bg-white p-6 rounded-xl border border-[#000052]/10 text-[#000052]/60">{t('smartContract.noTimeline', 'No status history yet')}</div> : <div className="space-y-3">{timeline.map((event: any) => <div key={event.id} className="bg-white p-4 rounded-xl border border-[#000052]/10"><div className="flex items-start gap-3"><div className="mt-1 w-2.5 h-2.5 rounded-full bg-[#B8860B]" /><div className="flex-1"><div className="flex flex-wrap items-center justify-between gap-2"><p className="font-semibold text-[#000052]">{event.status || event.eventType}</p><span className="text-xs text-[#000052]/50">{formatDate(event.occurredAt)}</span></div>{event.correlationId && <p className="text-xs text-[#000052]/50 mt-1">ID: {event.correlationId}</p>}</div></div></div>)}</div>}</div>}

    {tab === 'technical' && <ContractTechnicalPanel contract={contract} />}

    {tab === 'disputes' && <div className="space-y-4"><h2 className="text-xl font-bold text-[#000052]">{t('contractDetail.disputes')}</h2>{disputeList.length === 0 ? <div className="bg-white p-6 rounded-xl border border-[#000052]/10 text-[#000052]/60">{t('contractDetail.noDisputes')}</div> : disputeList.map((dispute: any) => <div key={dispute.id} className="bg-white p-5 rounded-xl border border-[#000052]/10"><p className="font-semibold text-[#000052]">{dispute.reason || dispute.title}</p><p className="text-xs text-[#000052]/60 mt-2">{t('contractDetail.status')}: {dispute.status}</p></div>)}</div>}

    <EditDraftContractModal contract={contract} isOpen={editOpen} onClose={() => setEditOpen(false)} onSaved={updated => setData((prev: any) => ({ ...prev, contract: { ...prev.contract, ...updated } }))} />
    {arbitrationStream && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"><div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl p-6"><div className="flex items-center justify-between mb-5"><h2 className="text-xl font-bold text-[#000052]">{t('actions.sendToArbitration')}</h2><button onClick={() => setArbitrationStream(null)}><XCircle className="w-5 h-5" /></button></div><p className="text-sm text-[#000052]/70 mb-2">{arbitrationStream.title}</p><p className="font-bold text-[#B8860B] mb-4">${Number(arbitrationStream.amount || 0).toLocaleString()}</p><label className="block text-sm font-semibold text-[#000052] mb-2">{t('actions.reason')}</label><textarea value={arbitrationReason} onChange={e => setArbitrationReason(e.target.value)} rows={5} placeholder={t('disputes.resolutionPlaceholder')} className="w-full px-4 py-3 border rounded-lg" /><div className="flex gap-3 mt-5"><button onClick={() => setArbitrationStream(null)} className="flex-1 py-3 bg-[#000052]/5 rounded-lg font-semibold">{t('common.cancel')}</button><button onClick={submitArbitration} disabled={arbitrationSaving || !arbitrationReason.trim()} className="flex-1 py-3 bg-[#B8860B] text-white rounded-lg font-semibold disabled:opacity-50">{arbitrationSaving ? t('common.loading') : t('disputes.confirm')}</button></div></div></div>}
  </div>;
}
