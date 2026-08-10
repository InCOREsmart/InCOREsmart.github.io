import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, DollarSign, ShieldCheck, CheckCircle, Clock, History, Activity, Radio } from 'lucide-react';
import { evaluateContractTransition } from '../../lib/smart-contract/engine';
import { createCorrelationId } from '../../lib/smart-contract/audit';
import { recordContractStatusChange, getContractStatusHistory, type ContractStatusHistoryRecord } from '../../lib/smart-contract/statusHistory';
import { ContractStatus } from '../../lib/smart-contract/stateMachine';
import { checkContractHealth, type ContractHealthCheck } from '../../lib/smart-contract/healthCheck';
import { getOracleTrustLevel, type OracleTrust } from '../../lib/smart-contract/oracleTrust';
import { getAnnualBonusForAgent } from '../../lib/annualBonus';

const CANONICAL_GMV = 18750;

function payoutModel(gmv: number, annualBonus: number) {
  const newProperty = Math.round(gmv * 0.04);
  const newCasco = Math.round(gmv * 0.03);
  const newDms = Math.round(gmv * 0.02);
  const renewal = Math.round(gmv * 0.03);
  const crossSell = Math.round(gmv * 0.02);
  const planBonus = Math.round(gmv * 0.10);
  const retention = 200;
  const newSales = newProperty + newCasco + newDms;
  const escrow = newSales + renewal + crossSell + planBonus + retention;
  const platformFee = Math.round(escrow * 0.12);
  const companyProfit = gmv - escrow;
  return { newSales, renewal, crossSell, planBonus, retention, annualBonus, escrow, platformFee, companyProfit, roi: gmv > 0 ? Math.round((companyProfit / gmv) * 100) : 0, newProperty, newCasco, newDms };
}

export function AgentContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [history, setHistory] = useState<ContractStatusHistoryRecord[]>([]);
  const [health, setHealth] = useState<ContractHealthCheck | null>(null);
  const [oracleTrust, setOracleTrust] = useState<OracleTrust | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

  useEffect(() => {
    const fetchContract = async () => {
      if (!user || !id) { setLoading(false); return; }
      try {
        const { data, error: fetchError } = await supabase.from('contracts').select('*').eq('id', id).maybeSingle();
        if (fetchError) setError(fetchError.message);
        else if (!data) setError(t('agentContractDetail.errorTitle'));
        else {
          setContract(data);
          setHealth(checkContractHealth({ id: data.id, status: data.status as ContractStatus, engineVersion: data.engine_version || '1.0', version: data.version ?? 1 }));
          const oracleResult = await supabase.from('oracle_events').select('id,event_type,payload,created_at').eq('contract_id', data.id).order('created_at', { ascending: false }).limit(1).maybeSingle();
          if (!oracleResult.error && oracleResult.data) {
            const payload = (oracleResult.data.payload || {}) as Record<string, unknown>;
            setOracleTrust(getOracleTrustLevel({ confirmed: payload.confirmed === true || payload.status === 'confirmed' || payload.status === 'CONFIRMED', signatureValid: typeof payload.signatureValid === 'boolean' ? payload.signatureValid : undefined, duplicate: payload.duplicate === true, stale: payload.stale === true }));
          } else setOracleTrust(getOracleTrustLevel({ confirmed: false }));
        }
        if (!fetchError && data) {
          const historyResult = await getContractStatusHistory(data.id);
          if (!historyResult.error) setHistory((historyResult.data ?? []) as ContractStatusHistoryRecord[]);
        }
      } catch { setError(t('agentContractDetail.errorTitle')); } finally { setLoading(false); }
    };
    fetchContract();
  }, [user, id, t]);

  const handleAccept = async () => {
    if (!contract || !user) return;
    setAccepting(true);
    const fromStatus = contract.status as ContractStatus;
    const targetStatus = ContractStatus.ACTIVE;
    const transition = evaluateContractTransition({ contractId: contract.id, currentStatus: fromStatus, actorRole: 'agent', engineVersion: contract.engine_version || '1.0' }, targetStatus);
    if (!transition.allowed) { setAccepting(false); alert(`${t('agentContractDetail.errorTitle')}: ${transition.reason}`); return; }
    const correlationId = createCorrelationId();
    try {
      const { error: updateError } = await supabase.from('contracts').update({ status: targetStatus }).eq('id', contract.id).eq('status', fromStatus);
      if (updateError) throw updateError;
      const historyResult = await recordContractStatusChange({ contractId: contract.id, fromStatus, toStatus: targetStatus, actorId: user.id, correlationId, reason: 'agent_acceptance' });
      if (historyResult.error) throw historyResult.error;
      const historyItem: ContractStatusHistoryRecord = { id: correlationId, contract_id: contract.id, from_status: fromStatus, to_status: targetStatus, actor_id: user.id, correlation_id: correlationId, reason: 'agent_acceptance', metadata: null, created_at: new Date().toISOString() };
      setHistory(previous => [...previous, historyItem]);
      const nextContract = { ...contract, status: targetStatus, engine_version: contract.engine_version || '1.0' };
      setContract(nextContract);
      setHealth(checkContractHealth({ id: nextContract.id, status: targetStatus, engineVersion: nextContract.engine_version, version: nextContract.version ?? 1 }));
      alert(t('agentContractDetail.accepted'));
    } catch (err: any) {
      await supabase.from('contracts').update({ status: fromStatus }).eq('id', contract.id).eq('status', targetStatus);
      alert(`${t('agentContractDetail.errorTitle')}: ${err.message}`);
    } finally { setAccepting(false); }
  };

  const locale = i18n.language === 'ru' ? 'ru-RU' : i18n.language === 'az' ? 'az-AZ' : i18n.language === 'kk' || i18n.language === 'kz' ? 'kk-KZ' : 'en-US';
  if (loading) return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]" /><p className="mt-2">{t('common.loading')}</p></div>;
  if (error || !contract) return <div className="p-8 max-w-2xl mx-auto"><div className="bg-[#000052]/5 border border-[#000052]/10 rounded-xl p-6"><h3 className="text-lg font-bold text-[#000052] mb-2">{t('agentContractDetail.errorTitle')}</h3><p className="text-sm text-[#000052]/70 mb-4">{error || t('contract.noContracts')}</p><button onClick={() => navigate('/agent/contracts')} className="px-4 py-2 bg-[#000052] text-white rounded-lg text-sm">{t('agentContractDetail.backShort')}</button></div></div>;

  const gmv = Number(contract.revenue || contract.kpi_revenue || CANONICAL_GMV);
  const annualBonus = getAnnualBonusForAgent({ contracts: [contract] }, 2026);
  const model = payoutModel(gmv, annualBonus.accruedBonus);
  const escrow = model.escrow;
  const deadlineDate = new Date(contract.deadline);
  const daysLeft = Math.ceil((deadlineDate.getTime() - Date.now()) / 86400000);
  const isExpired = daysLeft <= 0;
  const isCompleted = contract.status === 'COMPLETED';
  const status = String(isCompleted ? t('agentContractDetail.completed') : isExpired ? t('agentContractDetail.expired') : t(`contract.statuses.${contract.status}`, contract.status));
  const healthLabel = String(health?.healthy ? t('smartContract.healthHealthy', 'Здоров') : t('smartContract.healthWarning', 'Требует внимания'));
  const trustLabel = String(oracleTrust ? t(oracleTrust.labelKey, oracleTrust.level) : t('oracleTrust.untrusted', 'Не подтвержден'));
  const streams = [
    { key: 'newSales', label: String(t('agentContractDetail.newSales')), value: model.newSales, detail: `Имущество $${model.newProperty} · КАСКО $${model.newCasco} · ДМС $${model.newDms}` },
    { key: 'renewal', label: String(t('agentContractDetail.renewal')), value: model.renewal },
    { key: 'crossSell', label: String(t('agentContractDetail.crossSell')), value: model.crossSell },
    { key: 'planBonus', label: String(t('agentContractDetail.planBonus')), value: model.planBonus },
    { key: 'retention', label: String(t('agentContractDetail.retention')), value: model.retention, detail: String(t('agentContractDetail.retentionCondition')) },
    { key: 'annualBonus', label: String(t('agentContractDetail.annualBonus')), value: model.annualBonus, detail: `Накоплено ${annualBonus.progressPercent}% годового плана. Выплата в январе 2027.` },
  ];

  const paidAmount = streams.filter(stream => stream.key !== 'annualBonus').reduce((sum, stream) => sum + (stream.key === 'newSales' ? model.newProperty : 0), 0);
  const lockedAmount = Math.max(0, escrow - paidAmount);
  const clawback = 0;

  return <div className="p-6 space-y-6 max-w-5xl mx-auto">
    <button onClick={() => navigate('/agent/contracts')} className="flex items-center text-[#000052]/70 mb-4"><ArrowLeft className="w-4 h-4 mr-2" />{t('agentContractDetail.back')}</button>
    <div className="flex items-center justify-between"><h1 className="text-2xl font-bold text-[#000052]">{contract.title}</h1><span className="px-4 py-2 rounded-full text-sm font-semibold bg-[#000052]/5 text-[#000052]">{status}</span></div>
    <div className={`p-4 rounded-xl border ${isExpired ? 'bg-[#000052]/5 border-[#000052]/10' : 'bg-[#B8860B]/5 border-[#B8860B]/10'}`}><div className="flex items-center gap-3"><Clock className={`w-6 h-6 ${isExpired ? 'text-[#000052]' : 'text-[#B8860B]'}`} /><div><p className="font-semibold text-[#000052]">{isExpired ? t('agentContractDetail.deadlineClosed') : t('agentContractDetail.daysLeft', { count: daysLeft })}</p><p className="text-sm text-[#000052]/70">{t('agentContractDetail.closingDate')}: {deadlineDate.toLocaleDateString(locale)}</p></div></div></div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="bg-[#B8860B]/10 p-4 rounded-xl border border-[#B8860B]/20"><p className="text-xs text-[#B8860B] mb-1">{t('ui.escrow')}</p><p className="text-xl font-bold text-[#B8860B]">${escrow.toLocaleString()}</p></div><div className="bg-white p-4 rounded-xl border border-[#000052]/10"><p className="text-xs text-[#000052]/60 mb-1">{t('ui.gmv')}</p><p className="text-xl font-bold text-[#000052]">${gmv.toLocaleString()}</p></div><div className="bg-[#000052]/5 p-4 rounded-xl border border-[#000052]/10"><p className="text-xs text-[#000052]/60 mb-1">{t('agentContractDetail.smartContract')}</p><p className="text-sm font-semibold text-[#000052] flex items-center gap-1"><ShieldCheck className="w-4 h-4" />Ваши деньги защищены смарт-контрактом</p></div></div>

    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className={`p-5 rounded-xl border ${health?.healthy ? 'bg-emerald-50 border-emerald-200' : 'bg-[#B8860B]/10 border-[#B8860B]/20'}`}><div className="flex items-center gap-2 mb-2"><Activity className="w-5 h-5 text-[#000052]" /><h3 className="font-bold text-[#000052]">Contract Health</h3></div><p className="font-semibold text-[#000052]">{healthLabel}</p>{health?.issues.length ? <ul className="mt-2 text-xs text-[#000052]/70 list-disc list-inside">{health.issues.map(issue => <li key={issue}>{issue}</li>)}</ul> : <p className="mt-1 text-xs text-[#000052]/60">Движок и версия контракта присутствуют</p>}</div><div className="p-5 rounded-xl border bg-white border-[#000052]/10"><div className="flex items-center gap-2 mb-2"><Radio className="w-5 h-5 text-[#B8860B]" /><h3 className="font-bold text-[#000052]">Oracle Trust</h3></div><span className={`inline-flex px-3 py-1 rounded-full text-xs font-semibold ${oracleTrust?.level === 'trusted' ? 'bg-emerald-100 text-emerald-700' : oracleTrust?.level === 'verified' ? 'bg-blue-100 text-blue-700' : oracleTrust?.level === 'warning' ? 'bg-[#B8860B]/15 text-[#8a6500]' : 'bg-red-100 text-red-700'}`}>{trustLabel}</span><p className="mt-2 text-xs text-[#000052]/60">Доверие основано на последнем событии Oracle по этому контракту</p></div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-[#B8860B]" />6 потоков выплат</h3><div className="space-y-3">{streams.map(stream => <div key={stream.key} className={`flex justify-between items-center p-3 rounded-lg ${stream.key === 'annualBonus' ? 'bg-[#B8860B]/10 border border-[#B8860B]/20' : 'bg-[#000052]/5'}`}><div><span className="text-sm text-[#000052]/80">{stream.label}</span>{stream.detail && <p className="text-xs text-[#000052]/60 mt-1">{stream.detail}</p>}</div><span className="font-semibold text-[#000052]">${stream.value.toLocaleString()}</span></div>)}</div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4">Итоговый расчёт</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><div className="text-xs text-gray-400">Общая выручка по договорам</div><div className="font-bold text-[#000052] mt-1">${gmv.toLocaleString()}</div></div><div><div className="text-xs text-gray-400">Эскроу</div><div className="font-bold text-[#B8860B] mt-1">${escrow.toLocaleString()}</div></div><div><div className="text-xs text-gray-400">Комиссия InCORE (12%)</div><div className="font-bold text-[#000052] mt-1">${model.platformFee.toLocaleString()}</div></div><div><div className="text-xs text-gray-400">Прибыль компании</div><div className="font-bold text-emerald-600 mt-1">${model.companyProfit.toLocaleString()}</div></div></div><div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4"><span className="font-semibold text-[#000052]">ROI</span><span className="text-xl font-bold text-[#000052]">{model.roi}%</span></div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4">Состояние выплат</h3><div className="grid grid-cols-3 gap-4"><div><div className="text-xs text-gray-400">Выплачено</div><div className="text-sm font-bold text-emerald-600 mt-1">${paidAmount.toLocaleString()}</div></div><div><div className="text-xs text-gray-400">Заблокировано</div><div className="text-sm font-bold text-[#000052] mt-1">${lockedAmount.toLocaleString()}</div></div><div><div className="text-xs text-gray-400">Clawback</div><div className="text-sm font-bold text-[#000052] mt-1">${clawback.toLocaleString()}</div></div></div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4">{t('agentContractDetail.kpi')}</h3><div className="grid grid-cols-2 md:grid-cols-4 gap-4">{[[String(t('agentContractDetail.calls')), contract.kpi_calls], [String(t('agentContractDetail.meetings')), contract.kpi_meetings], [String(t('agentContractDetail.proposals')), contract.kpi_proposals], [String(t('agentContractDetail.clients')), contract.target_clients]].map(([label, value]) => <div key={String(label)} className="p-3 bg-[#000052]/5 rounded-lg text-center"><p className="text-xs text-[#000052]/60">{label}</p><p className="text-2xl font-bold text-[#000052]">{value || 0}</p></div>)}</div></div>

    <div className="bg-white p-6 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><History className="w-5 h-5 text-[#B8860B]" />Timeline</h3><div className="space-y-3">{history.length === 0 ? <p className="text-sm text-[#000052]/60">История статусов пока отсутствует</p> : history.map(item => <div key={item.id} className="flex items-start gap-3 p-3 bg-[#000052]/5 rounded-lg"><div className="mt-1 w-2 h-2 rounded-full bg-[#B8860B] flex-shrink-0" /><div className="min-w-0"><p className="text-sm font-semibold text-[#000052]">{String(t(`contract.statuses.${item.from_status}`, item.from_status || '—'))} → {String(t(`contract.statuses.${item.to_status}`, item.to_status))}</p><p className="text-xs text-[#000052]/60">{new Date(item.created_at).toLocaleString(locale)}{item.reason ? ` · ${item.reason}` : ''}</p></div></div>)}</div></div>

    {contract.status === 'PENDING_APPROVAL' && !isExpired && <div className="bg-[#B8860B]/5 border border-[#B8860B]/20 p-6 rounded-xl"><div className="flex items-center justify-between"><div><h3 className="text-lg font-bold text-[#000052] mb-1">{t('agentContractDetail.pendingApproval')}</h3><p className="text-sm text-[#000052]/70">{t('agentContractDetail.acceptHint')}</p></div><button onClick={handleAccept} disabled={accepting} className="px-8 py-3 bg-[#B8860B] text-white font-semibold rounded-lg flex items-center gap-2 disabled:opacity-50"><CheckCircle className="w-5 h-5" />{accepting ? '...' : t('agentContractDetail.accept')}</button></div></div>}
    {(isExpired || isCompleted) && <div className="bg-[#000052]/5 border border-[#000052]/10 p-6 rounded-xl"><div className="flex items-start gap-3"><CheckCircle className="w-6 h-6 text-[#B8860B] flex-shrink-0 mt-1" /><div><h3 className="text-lg font-bold text-[#000052] mb-2">{isCompleted ? t('agentContractDetail.closedCompleted') : t('agentContractDetail.closedExpired')}</h3><p className="text-sm text-[#000052]/70">{t('agentContractDetail.payoutNotice', { amount: `$${escrow.toLocaleString()}` })}</p></div></div></div>}
  </div>;
}