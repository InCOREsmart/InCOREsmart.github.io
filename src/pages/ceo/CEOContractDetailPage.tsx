import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, CheckCircle, Clock, DollarSign, Lock, Shield, TrendingUp, XCircle, Pencil, Scale } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { DemoPayoutStream, getDemoContractById } from '../../lib/demoData';
import { getEscrowStreams, getEscrowAmount, getPaidAmount, getLockedAmount } from '../../lib/annualBonus';
import { getContractFullData, releasePayment } from '../../lib/smartContractLogic';
import { EditDraftContractModal } from '../../components/ui/EditDraftContractModal';
import { supabase } from '../../lib/supabase';

export function CEOContractDetailPage() {
  const { t, i18n } = useTranslation(); const { id } = useParams<{ id: string }>(); const { user } = useAuth(); const navigate = useNavigate();
  const [loading, setLoading] = useState(true); const [data, setData] = useState<any>(null); const [tab, setTab] = useState<'streams' | 'escrow' | 'oracle' | 'disputes'>('streams');
  const [editOpen, setEditOpen] = useState(false); const [arbitrationStream, setArbitrationStream] = useState<any>(null); const [arbitrationReason, setArbitrationReason] = useState(''); const [arbitrationSaving, setArbitrationSaving] = useState(false);
  useEffect(() => { const load = async () => { if (!id) return; try { const demo = getDemoContractById(id); if (demo) { const { DEMO_AGENTS } = await import('../../lib/demoData'); const agent = DEMO_AGENTS.find(item => item.contracts.some(contract => contract.id === id)); const escrowStreams = getEscrowStreams(demo.payout_streams); const escrowAmount = getEscrowAmount(demo, escrowStreams); const totalPaid = getPaidAmount(escrowStreams); const totalLocked = getLockedAmount(escrowStreams); const escrowEvents = demo.escrow_events.map(event => ({ ...event, amount: event.event_type === 'ESCROW_CREATED' || event.event_type === 'ESCROW_FUNDED' ? escrowAmount : event.amount, metadata: event.metadata ? { ...event.metadata, streams_count: escrowStreams.length, total_escrow: escrowAmount } : event.metadata })); setData({ contract: demo, streams: escrowStreams, escrowEvents, oracleEvents: demo.oracle_events, disputes: [], agent, financials: { plannedRevenue: demo.revenue, totalEscrow: escrowAmount, totalLocked, totalUnlocked: totalPaid, companyProfit: demo.revenue - escrowAmount, platformFee: demo.platform_fee }, isDemo: true }); return; } if (!user) return; const real = await getContractFullData(id); if (real) setData({ ...real, isDemo: false }); } catch (error) { console.error(error); } finally { setLoading(false); } }; load(); }, [id, user]);
  const refreshReal = async () => { if (!id || !user) return; const real = await getContractFullData(id); if (real) setData({ ...real, isDemo: false }); };
  const handleRelease = async (stream: DemoPayoutStream | any) => { if (!id || data?.isDemo || !user) return; const result = await releasePayment(id, stream.id, user.id); if (!result.success) alert(result.error || t('contractDetail.releasePayout')); await refreshReal(); };
  const submitArbitration = async () => { if (!arbitrationStream || !arbitrationReason.trim() || !user || !id || data?.isDemo) return; setArbitrationSaving(true); try { const { error } = await supabase.from('disputes').insert({ company_id: data.contract.company_id, contract_id: id, agent_id: data.contract.agent_id, type: 'payment_issue', status: 'OPEN', amount: Number(arbitrationStream.amount || 0), title: t('actions.payoutError'), description: arbitrationReason.trim() }); if (error) throw error; setArbitrationStream(null); setArbitrationReason(''); setTab('disputes'); await refreshReal(); } catch (error) { console.error(error); alert(t('common.error')); } finally { setArbitrationSaving(false); } };
  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'kk' || i18n.language === 'kz' ? 'kk-KZ' : 'en-US'; const formatDate = (value: string | null) => value ? new Date(value).toLocaleString(locale) : '—';
  const statusLabel = (status: string) => ({ LOCKED: t('contractDetail.statusLocked'), UNLOCKED: t('contractDetail.statusUnlocked'), PAYABLE: t('contractDetail.statusPayable'), PAID: t('contractDetail.statusPaid'), CLAWED_BACK: t('contractDetail.statusClawedBack'), CANCELLED: t('contractDetail.statusCancelled') }[status] || status);
  const eventLabel = (type: string) => ({ ESCROW_CREATED: t('contractDetail.eventEscrowCreated'), ESCROW_FUNDED: t('contractDetail.eventEscrowFunded'), PARTIAL_RELEASE: t('contractDetail.eventPartialRelease'), PAYOUT_TO_AGENT: t('contractDetail.eventPayout'), REFUND_TO_CEO: t('contractDetail.eventRefund'), CLAWBACK: t('contractDetail.eventClawback'), CLIENT_PAYMENT_CONFIRMED: t('contractDetail.eventClientPayment'), RETENTION_PERIOD_PASSED: t('contractDetail.eventRetention'), RENEWAL_CONFIRMED: t('contractDetail.eventRenewal'), CROSS_SELL_CONFIRMED: t('contractDetail.eventCrossSell'), PLAN_ACHIEVED: t('contractDetail.eventPlan'), ANNUAL_BONUS_CONFIRMED: t('contractDetail.eventAnnualBonus') }[type] || type);
  const contractStatusColor: Record<string, string> = { ACTIVE: 'bg-emerald-50 text-emerald-600', IN_PROGRESS: 'bg-[#000052]/5 text-[#000052]', PENDING_APPROVAL: 'bg-[#B8860B]/10 text-[#B8860B]', COMPLETED: 'bg-emerald-50 text-emerald-600', DRAFT: 'bg-gray-100 text-gray-500', DISPUTED: 'bg-red-50 text-red-600', PENDING_PAYMENT: 'bg-amber-50 text-amber-600', CANCELLED: 'bg-gray-100 text-gray-500' };
  const streamStatusColor: Record<string, string> = { LOCKED: 'bg-gray-100 text-gray-500', UNLOCKED: 'bg-[#000052]/5 text-[#000052]', PAYABLE: 'bg-[#B8860B]/10 text-[#B8860B]', PAID: 'bg-emerald-50 text-emerald-600', CLAWED_BACK: 'bg-red-50 text-red-600', CANCELLED: 'bg-gray-100 text-gray-500' };
  if (loading) return <div className="p-8 text-center text-[#000052]">{t('ui.loading')}</div>;
  if (!data) return <div className="p-8 text-center"><div className="w-16 h-16 mx-auto rounded-2xl bg-red-50 flex items-center justify-center mb-4"><XCircle className="w-8 h-8 text-red-500" /></div><p className="text-lg text-[#000052]">{t('contract.noContracts')}</p><button onClick={() => navigate('/ceo/contracts')} className="mt-4 px-6 py-2.5 bg-[#000052] text-white rounded-xl shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">{t('contractDetail.back')}</button></div>;
  const { contract, streams, escrowEvents, oracleEvents, disputes, agent, financials } = data; const streamList = getEscrowStreams(streams || []); const escrowList = escrowEvents || []; const oracleList = oracleEvents || []; const disputeList = disputes || [];
  const paid = getPaidAmount(streamList); const locked = getLockedAmount(streamList); const plannedRevenue = Number(financials?.plannedRevenue ?? contract.revenue ?? contract.planned_revenue ?? 0); const calculatedEscrow = streamList.length ? getEscrowAmount(contract, streamList) : Number(contract.escrow_amount ?? 0); const totalEscrow = Number(financials?.totalEscrow ?? calculatedEscrow); const companyProfit = Number(financials?.companyProfit ?? contract.company_profit ?? (plannedRevenue - totalEscrow)); const platformFee = Number(financials?.platformFee ?? contract.platform_fee ?? 0); const totalPaid = Number(financials?.totalUnlocked ?? paid); const totalLocked = Number(financials?.totalLocked ?? locked);
  const kpiValues = [contract.kpi_calls ? Number(contract.actual_calls || 0) / Number(contract.kpi_calls) : 0, contract.kpi_meetings ? Number(contract.actual_meetings || 0) / Number(contract.kpi_meetings) : 0, contract.kpi_proposals ? Number(contract.actual_proposals || 0) / Number(contract.kpi_proposals) : 0, contract.target_clients ? Number(contract.actual_clients || 0) / Number(contract.target_clients) : 0]; const kpi = Math.round(kpiValues.reduce((a: number, b: number) => a + b, 0) / kpiValues.length * 100); const kpis = [[t('contractDetail.calls'), contract.actual_calls, contract.kpi_calls], [t('contractDetail.meetings'), contract.actual_meetings, contract.kpi_meetings], [t('contractDetail.proposals'), contract.actual_proposals, contract.kpi_proposals], [t('contractDetail.clients'), contract.actual_clients, contract.target_clients]]; const tabs = [['streams', `${t('contractDetail.payoutStreams')} (${streamList.length})`], ['escrow', `${t('contractDetail.escrowJournal')} (${escrowList.length})`], ['oracle', `${t('contractDetail.oracleEvents')} (${oracleList.length})`], ['disputes', `${t('contractDetail.disputes')} (${disputeList.length})`]] as const;
  const kpiCards = [
    { icon: DollarSign, label: t('contractDetail.plannedRevenue'), value: `$${plannedRevenue.toLocaleString()}`, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: 'text-[#000052]', sub: null },
    { icon: Shield, label: t('ui.escrow'), value: `$${totalEscrow.toLocaleString()}`, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: 'text-[#B8860B]', sub: null },
    { icon: CheckCircle, label: t('contractDetail.paid'), value: `$${totalPaid.toLocaleString()}`, box: 'bg-emerald-50 text-emerald-600', valueColor: 'text-emerald-600', sub: null },
    { icon: Lock, label: t('contractDetail.locked'), value: `$${totalLocked.toLocaleString()}`, box: 'bg-[#000052]/5 text-[#000052]', valueColor: 'text-[#000052]', sub: null },
    { icon: TrendingUp, label: t('contractDetail.companyResult'), value: `$${companyProfit.toLocaleString()}`, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: 'text-[#000052]', sub: `${t('contractDetail.commission')} $${platformFee.toLocaleString()}` },
  ];
  return <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
      <div>
        <button onClick={() => navigate('/ceo/contracts')} className="flex items-center text-sm text-gray-400 hover:text-[#000052] mb-2 transition-colors"><ArrowLeft className="w-4 h-4 mr-2" />{t('contractDetail.back')}</button>
        <div className="flex items-center gap-3">
          <h1 className="text-[26px] md:text-3xl font-bold text-[#000052] tracking-tight">{contract.title}</h1>
          {contract.status === 'DRAFT' && !data.isDemo && <button onClick={() => setEditOpen(true)} className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#000052] text-white rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] transition-all duration-200"><Pencil className="w-4 h-4" />{t('actions.editDraft')}</button>}
        </div>
        <p className="text-sm text-gray-400 mt-1">{t('contractDetail.agent')}: {agent?.full_name || t('contractDetail.notAssigned')} · {formatDate(contract.start_date || contract.start_at || contract.created_at)} — {formatDate(contract.deadline || contract.end_date || contract.end_at)}</p>
      </div>
      <span className={`px-3 py-1 rounded-full text-sm font-semibold whitespace-nowrap ${contractStatusColor[contract.status] || 'bg-gray-100 text-gray-500'}`}>{statusLabel(contract.status)}</span>
    </div>

    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 md:gap-5">
      {kpiCards.map((card, i) => {
        const Icon = card.icon;
        return (
          <div key={i} className="bg-white p-5 rounded-2xl shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,82,0.12)]">
            <div className="flex items-start justify-between mb-4">
              <span className="text-sm font-medium text-gray-500 leading-tight">{card.label}</span>
              <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${card.box}`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <p className={`text-2xl font-bold tracking-tight ${card.valueColor}`}>{card.value}</p>
            {card.sub && <p className="text-xs text-gray-400 mt-1">{card.sub}</p>}
          </div>
        );
      })}
    </div>

    <div className="bg-[#B8860B]/5 border border-[#B8860B]/20 p-4 rounded-2xl text-sm text-[#000052]/70 flex items-center gap-3">
      <Shield className="w-5 h-5 text-[#B8860B] flex-shrink-0" />
      {t('contractDetail.annualBonusNotice')}
    </div>

    <div className="bg-white p-5 rounded-2xl shadow-sm">
      <div className="flex justify-between mb-4">
        <h2 className="font-bold text-[#000052]">{t('contractDetail.kpi')}</h2>
        <span className="font-bold text-[#B8860B] text-lg">{kpi}%</span>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(([label, actual, target]) => {
          const progress = Number(target) > 0 ? Math.min(Number(actual || 0) / Number(target) * 100, 100) : 0;
          return (
            <div key={String(label)}>
              <div className="flex justify-between text-xs mb-1.5"><span className="text-gray-500">{label}</span><b className="text-[#000052]">{actual || 0}/{target || 0}</b></div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4A017] rounded-full" style={{ width: `${progress}%` }} /></div>
            </div>
          );
        })}
      </div>
    </div>

    <div className="border-b border-gray-100">
      <div className="flex gap-5 overflow-x-auto">
        {tabs.map(([key, label]) => (
          <button key={key} onClick={() => setTab(key)} className={`pb-3 px-2 text-sm font-semibold whitespace-nowrap transition-colors ${tab === key ? 'text-[#000052] border-b-2 border-[#000052]' : 'text-gray-400 hover:text-[#000052]'}`}>{label}</button>
        ))}
      </div>
    </div>

    {tab === 'streams' && <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#000052]">{streamList.length} {t('contractDetail.payoutStreamCount')}</h2>
      {streamList.map((stream: any) => (
        <div key={stream.id} className="bg-white p-5 rounded-2xl shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-bold text-[#000052]">{stream.title}</h3>
              <p className="text-xs text-gray-400 mt-1">{stream.unlock_condition || t('contractDetail.conditionNotSpecified')}</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold text-[#000052] tracking-tight">${Number(stream.amount || 0).toLocaleString()}</p>
              <span className={`inline-block px-3 py-1 rounded-full text-xs font-semibold mt-1 ${streamStatusColor[stream.status] || 'bg-gray-100 text-gray-500'}`}>{statusLabel(stream.status)}</span>
            </div>
          </div>
          {stream.unlocked_at && <p className="text-xs text-gray-400 mt-3">{t('contractDetail.unlocked')}: {formatDate(stream.unlocked_at)}</p>}
          {stream.paid_at && <p className="text-xs text-emerald-600 font-semibold mt-1">{t('contractDetail.paid')}: {formatDate(stream.paid_at)}</p>}
          <div className="flex flex-wrap gap-2 mt-3">
            {stream.status === 'UNLOCKED' && !data.isDemo && <button onClick={() => handleRelease(stream)} className="px-4 py-2 bg-[#000052] text-white rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200">{t('contractDetail.releasePayout')}</button>}
            {stream.status === 'PAID' && !data.isDemo && <button onClick={() => { setArbitrationStream(stream); setArbitrationReason(''); }} className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 text-[#000052] rounded-xl text-sm font-semibold hover:border-[#000052] hover:bg-[#000052]/5 transition-all duration-200"><Scale className="w-4 h-4" />{t('actions.sendToArbitration')}</button>}
          </div>
        </div>
      ))}
    </div>}

    {tab === 'escrow' && <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#000052]">{t('contractDetail.escrowJournal')}</h2>
      {escrowList.map((event: any) => (
        <div key={event.id} className="bg-white p-4 rounded-2xl shadow-sm flex items-start gap-4">
          <div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0"><Clock className="w-5 h-5 text-[#B8860B]" /></div>
          <div className="flex-1">
            <p className="font-semibold text-[#000052]">{eventLabel(event.event_type)}</p>
            <p className="text-xs text-gray-400 mt-1">{formatDate(event.created_at)} · {event.actor_role || t('contractDetail.system')}</p>
          </div>
          <b className="text-[#000052]">{event.amount != null ? `$${Number(event.amount).toLocaleString()}` : '—'}</b>
        </div>
      ))}
    </div>}

    {tab === 'oracle' && <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#000052]">{t('contractDetail.oracleEvents')}</h2>
      {oracleList.map((event: any) => (
        <div key={event.id} className="bg-white p-4 rounded-2xl shadow-sm">
          <div className="flex justify-between gap-4">
            <div>
              <p className="font-semibold text-[#000052]">{eventLabel(event.event_type)}</p>
              <p className="text-xs text-gray-400 mt-1">{formatDate(event.created_at)} · {event.source || t('contractDetail.system')}</p>
            </div>
            <div className="w-10 h-10 rounded-[12px] bg-emerald-50 flex items-center justify-center flex-shrink-0"><CheckCircle className="w-5 h-5 text-emerald-600" /></div>
          </div>
          {event.payload && <pre className="mt-3 text-xs bg-[#F4F5F7] rounded-xl p-3 overflow-auto text-[#000052]">{JSON.stringify(event.payload, null, 2)}</pre>}
        </div>
      ))}
    </div>}

    {tab === 'disputes' && <div className="space-y-4">
      <h2 className="text-xl font-bold text-[#000052]">{t('contractDetail.disputes')}</h2>
      {disputeList.length === 0 ? (
        <div className="bg-white p-6 rounded-2xl shadow-sm text-gray-400">{t('contractDetail.noDisputes')}</div>
      ) : disputeList.map((dispute: any) => (
        <div key={dispute.id} className="bg-white p-5 rounded-2xl shadow-sm">
          <p className="font-semibold text-[#000052]">{dispute.reason || dispute.title}</p>
          <p className="text-xs text-gray-400 mt-2">{t('contractDetail.status')}: {dispute.status}</p>
        </div>
      ))}
    </div>}

    <EditDraftContractModal contract={contract} isOpen={editOpen} onClose={() => setEditOpen(false)} onSaved={updated => setData((prev: any) => ({ ...prev, contract: { ...prev.contract, ...updated } }))} />

    {arbitrationStream && <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-xl font-bold text-[#000052]">{t('actions.sendToArbitration')}</h2>
          <button onClick={() => setArbitrationStream(null)} className="text-gray-400 hover:text-[#000052] transition-colors"><XCircle className="w-5 h-5" /></button>
        </div>
        <p className="text-sm text-gray-500 mb-2">{arbitrationStream.title}</p>
        <p className="font-bold text-[#B8860B] text-xl mb-4">${Number(arbitrationStream.amount || 0).toLocaleString()}</p>
        <label className="block text-sm font-semibold text-[#000052] mb-2">{t('actions.reason')}</label>
        <textarea value={arbitrationReason} onChange={e => setArbitrationReason(e.target.value)} rows={5} placeholder={t('disputes.resolutionPlaceholder')} className="w-full px-4 py-3 border border-gray-200 rounded-[12px] text-[#000052] placeholder-gray-400 focus:ring-4 focus:ring-[#000052]/10 focus:border-[#000052] outline-none transition" />
        <div className="flex gap-3 mt-5">
          <button onClick={() => setArbitrationStream(null)} className="flex-1 py-3 bg-white border border-gray-200 text-[#000052] rounded-[14px] font-semibold hover:border-[#000052] hover:bg-[#000052]/5 transition-all duration-200">{t('common.cancel')}</button>
          <button onClick={submitArbitration} disabled={arbitrationSaving || !arbitrationReason.trim()} className="flex-1 py-3 bg-[#000052] text-white rounded-[14px] font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0">{arbitrationSaving ? t('common.loading') : t('disputes.confirm')}</button>
        </div>
      </div>
    </div>}
  </div>;
}