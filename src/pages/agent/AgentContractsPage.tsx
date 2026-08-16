import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { getActualContractRevenue, getContractAccountingSnapshot } from '../../lib/contractFinance';
import {
  FileText,
  DollarSign,
  Clock,
  CheckCircle,
  Shield,
  AlertTriangle,
  Send,
  Lock,
  Unlock,
} from 'lucide-react';

const getStreamAmount = (stream: any) =>
  stream.stream_key === 'annual' ? 0 : Number(stream.amount || 0);

export function AgentContractsPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [streamsByContract, setStreamsByContract] = useState<Record<string, any[]>>({});
  const [acceptingContractId, setAcceptingContractId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!agentData) {
          setLoading(false);
          return;
        }

        setAgent(agentData);

        const { data: contractsData, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('agent_id', agentData.id)
          .order('created_at', { ascending: false });

        if (contractsError) throw contractsError;
        setContracts(contractsData || []);

        if (contractsData?.length) {
          const { data: streams, error: streamsError } = await supabase
            .from('contract_payout_streams')
            .select('*')
            .in('contract_id', contractsData.map((c) => c.id));

          if (streamsError) throw streamsError;

          const grouped: Record<string, any[]> = {};
          (streams || []).forEach((stream) => {
            (grouped[stream.contract_id] ||= []).push(stream);
          });
          setStreamsByContract(grouped);
        } else {
          setStreamsByContract({});
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const handleAcceptContract = async (contractId: string) => {
    if (!user || !agent || acceptingContractId) return;
    setAcceptingContractId(contractId);

    try {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .select('id, company_id, title, status, escrow_status, agent_id')
        .eq('id', contractId)
        .eq('agent_id', agent.id)
        .maybeSingle();

      if (contractError) throw contractError;
      if (!contract) throw new Error(t('ui.contractNotFound', 'Контракт не найден'));

      if (!['DRAFT', 'PENDING_PAYMENT'].includes(contract.status)) {
        setContracts((prev) =>
          prev.map((c) => (c.id === contractId ? { ...c, status: contract.status } : c)),
        );
        return;
      }

      const { error: updateError } = await supabase
        .from('contracts')
        .update({ status: 'IN_PROGRESS' })
        .eq('id', contractId)
        .eq('agent_id', agent.id)
        .in('status', ['DRAFT', 'PENDING_PAYMENT']);

      if (updateError) throw updateError;

      setContracts((prev) =>
        prev.map((c) => (c.id === contractId ? { ...c, status: 'IN_PROGRESS' } : c)),
      );

      alert(t('ui.contractAccepted', 'Контракт принят и переведён в работу'));
    } catch (err) {
      console.error(err);
      alert(t('ui.contractAcceptError', 'Не удалось принять контракт'));
    } finally {
      setAcceptingContractId(null);
    }
  };

  const handleSendWork = async (contractId: string) => {
    if (!window.confirm(t('ui.submitWorkConfirm'))) return;

    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'PENDING_APPROVAL' })
        .eq('id', contractId);

      if (error) throw error;

      const { data: contract } = await supabase
        .from('contracts')
        .select('company_id, title')
        .eq('id', contractId)
        .single();

      if (contract) {
        await supabase.from('notifications').insert({
          user_id: contract.company_id,
          title: t('ui.workSubmitted'),
          message: `${t('ui.contract')}: ${contract.title}`,
          type: 'WORK_SUBMITTED',
          is_read: false,
        });
      }

      alert(t('ui.workSubmitted'));
      window.location.reload();
    } catch (err) {
      console.error(err);
      alert(t('ui.workSubmitError'));
    }
  };

  const getStatusInfo = (status: string) => {
    const map: Record<string, { icon: any; color: string; label: string }> = {
      DRAFT: { icon: FileText, color: 'bg-gray-100 text-gray-500', label: t('ui.draft') },
      PENDING_PAYMENT: { icon: Clock, color: 'bg-amber-50 text-amber-600', label: t('ui.pendingPayment') },
      ACTIVE: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', label: t('ui.active') },
      IN_PROGRESS: { icon: Send, color: 'bg-[#000052]/5 text-[#000052]', label: t('ui.inProgress') },
      PENDING_APPROVAL: { icon: Clock, color: 'bg-[#B8860B]/10 text-[#B8860B]', label: t('ui.pendingApproval') },
      COMPLETED: { icon: CheckCircle, color: 'bg-emerald-50 text-emerald-600', label: t('ui.completed') },
      DISPUTED: { icon: AlertTriangle, color: 'bg-red-50 text-red-600', label: t('ui.disputed') },
      CANCELLED: { icon: FileText, color: 'bg-gray-100 text-gray-500', label: t('ui.cancelled') },
    };

    return map[status] || { icon: FileText, color: 'bg-gray-100 text-gray-500', label: status };
  };

  const formatDate = (value: string | null) => {
    if (!value) return '—';
    const locale =
      i18n.language === 'ru'
        ? 'ru-RU'
        : i18n.language === 'az'
          ? 'az-AZ'
          : i18n.language === 'kk' || i18n.language === 'kz'
            ? 'kk-KZ'
            : 'en-US';
    return new Date(value).toLocaleDateString(locale);
  };

  if (loading) {
    return (
      <div className="p-6 md:p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]" />
        <p className="mt-4 text-[#000052]">{t('common.loading')}</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-6 md:p-8 text-center">
        <p className="text-lg text-[#000052]">{t('ui.agentNotFound')}</p>
      </div>
    );
  }

  // All financial totals come from contractFinance.ts.
  // This page no longer maintains a second escrow/revenue formula.
  const accountingByContract = new Map(
    contracts.map((contract) => {
      const streams = streamsByContract[contract.id] || [];
      return [contract.id, getContractAccountingSnapshot({ ...contract, payout_streams: streams })];
    }),
  );

  const totalEscrow = contracts.reduce(
    (sum, contract) => sum + accountingByContract.get(contract.id)!.escrow,
    0,
  );

  const totalRevenue = contracts.reduce(
    (sum, contract) => sum + accountingByContract.get(contract.id)!.revenue,
    0,
  );

  const activeCount = contracts.filter(
    (contract) => contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS',
  ).length;

  const kpis = [
    {
      label: t('agent.activeContracts'),
      value: String(activeCount),
      sub: t('ui.ofTotal', { count: contracts.length }),
      icon: FileText,
      box: 'bg-[#000052]/5 text-[#000052]',
      valueColor: activeCount > 0 ? 'text-[#000052]' : 'text-[#64748B]',
    },
    {
      label: t('ui.escrow'),
      value: `$${totalEscrow.toLocaleString()}`,
      sub: t('ui.protectedBySmartContract'),
      icon: Shield,
      box: 'bg-[#B8860B]/10 text-[#B8860B]',
      valueColor: totalEscrow > 0 ? 'text-[#B8860B]' : 'text-[#64748B]',
    },
    {
      label: t('ui.totalRevenue'),
      value: `$${totalRevenue.toLocaleString()}`,
      sub: t('ui.allContracts'),
      icon: DollarSign,
      box: 'bg-[#B8860B]/10 text-[#B8860B]',
      valueColor: totalRevenue > 0 ? 'text-[#000052]' : 'text-[#64748B]',
    },
  ];

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-hidden p-3 sm:p-4 md:p-8 space-y-5 md:space-y-6">
      <div className="min-w-0">
        <h1 className="text-2xl sm:text-[26px] md:text-3xl font-bold text-[#000052] tracking-tight break-words">
          {t('agent.myActiveContracts')}
        </h1>
        <p className="text-sm text-gray-400 mt-1 break-words">{t('agent.subtitle')}</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 md:gap-5">
        {kpis.map((kpi, index) => {
          const Icon = kpi.icon;
          return (
            <div key={index} className="bg-white p-4 sm:p-5 rounded-2xl shadow-sm min-w-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,82,0.12)]">
              <div className="flex items-start justify-between gap-3 mb-4">
                <h3 className="min-w-0 text-sm font-medium text-gray-500 leading-tight break-words">{kpi.label}</h3>
                <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${kpi.box}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <p className={`text-2xl sm:text-[26px] font-bold tracking-tight break-all ${kpi.valueColor}`}>{kpi.value}</p>
              <p className="text-xs text-gray-400 mt-1 break-words">{kpi.sub}</p>
            </div>
          );
        })}
      </div>

      <div className="bg-[#000052] p-4 sm:p-5 rounded-2xl shadow-[0_4px_16px_rgba(0,0,82,0.25)] min-w-0">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-[12px] bg-white/10 flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-[#D4A017]" />
          </div>
          <div className="min-w-0">
            <p className="font-bold text-sm text-white break-words">{t('agent.fundsVerified')}</p>
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed break-words">{t('agent.clawbackWarning')}</p>
          </div>
        </div>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-2xl shadow-sm text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#000052]/5 flex items-center justify-center">
            <FileText className="w-8 h-8 text-[#000052]/30" />
          </div>
          <p className="text-lg font-semibold text-[#000052] mb-2 break-words">{t('ui.noContracts')}</p>
          <p className="text-sm text-gray-400 break-words">{t('ui.noContractsDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4 sm:space-y-5">
          {contracts.map((contract) => {
            const statusInfo = getStatusInfo(contract.status);
            const StatusIcon = statusInfo.icon;
            const rawStreams = streamsByContract[contract.id] || [];
            const accounting = accountingByContract.get(contract.id)!;
            const revenue = getActualContractRevenue(contract);

            const streams = rawStreams
              .map((stream) => ({ ...stream, amount: getStreamAmount(stream) }))
              .filter((stream) => stream.stream_key !== 'annual');

            const totalStreamAmount = accounting.escrow;
            const paidAmount = accounting.paid;
            const lockedAmount = accounting.locked;
            const unlockedAmount = Math.max(0, totalStreamAmount - lockedAmount);
            const progress = totalStreamAmount > 0
              ? Math.min((unlockedAmount / totalStreamAmount) * 100, 100)
              : 0;

            const canAccept = contract.status === 'DRAFT' || contract.status === 'PENDING_PAYMENT';

            return (
              <div key={contract.id} className="bg-white rounded-2xl shadow-sm overflow-hidden min-w-0 transition-all duration-200 hover:shadow-[0_12px_40px_rgba(0,0,82,0.12)]">
                <div className="p-4 sm:p-5 md:p-6 min-w-0">
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-5">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-bold text-[#000052] text-lg break-words">{contract.title}</h3>
                      {contract.description && <p className="text-sm text-gray-400 mt-1 leading-relaxed break-words">{contract.description}</p>}
                    </div>
                    <span className={`self-start inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold max-w-full ${statusInfo.color}`}>
                      <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                      <span className="break-words">{statusInfo.label}</span>
                    </span>
                  </div>

                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 text-sm">
                    <div className="min-w-0">
                      <div className="text-xs text-gray-400">{t('ui.revenue')}</div>
                      <div className="font-bold text-[#000052] mt-1 break-all">${revenue.toLocaleString()}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-400">{t('ui.escrow')}</div>
                      <div className="font-bold text-[#B8860B] mt-1 break-all">${totalStreamAmount.toLocaleString()}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-400">{t('ui.deadline')}</div>
                      <div className="font-bold text-[#000052] mt-1 break-words">{formatDate(contract.deadline)}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs text-gray-400">{t('ui.escrowStatus')}</div>
                      <div className="font-bold text-[#000052] mt-1 flex items-center gap-1.5 min-w-0">
                        {contract.escrow_status === 'FUNDED' ? (
                          <><Unlock className="w-3.5 h-3.5 text-emerald-600 shrink-0" /><span className="break-words">{t('ui.locked')}</span></>
                        ) : (
                          <><Lock className="w-3.5 h-3.5 text-gray-400 shrink-0" /><span className="break-words">{t('ui.notLocked')}</span></>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {rawStreams.length > 0 && (
                  <div className="px-4 sm:px-5 md:px-6 py-4 bg-[#F4F5F7] border-t border-gray-100 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#000052] break-words">{t('ui.paymentStreams')} ({streams.length})</h4>
                      <div className="text-xs text-gray-400 break-words">{t('ui.unlocked')}: ${unlockedAmount.toLocaleString()} / ${totalStreamAmount.toLocaleString()}</div>
                    </div>

                    <div className="h-[10px] bg-gray-200/70 rounded-full overflow-hidden my-4">
                      <div className="h-full bg-gradient-to-r from-[#B8860B] to-[#D4A017] rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                      {streams.slice(0, 4).map((stream) => (
                        <div key={stream.id} className="bg-white p-3 rounded-xl border border-gray-100 min-w-0">
                          <div className="text-gray-400 truncate" title={stream.title}>{stream.title}</div>
                          <div className="text-sm font-bold text-[#000052] mt-1 break-all">${stream.amount.toLocaleString()}</div>
                          <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide mt-1 break-words">{stream.status}</div>
                        </div>
                      ))}
                      {streams.length > 4 && (
                        <div className="bg-white p-3 rounded-xl border border-gray-100 flex items-center justify-center text-gray-400 font-semibold min-h-[82px]">+{streams.length - 4}</div>
                      )}
                    </div>

                    <div className="mt-4 p-4 bg-white rounded-xl border border-gray-100 min-w-0">
                      <div className="text-xs font-semibold text-gray-500 mb-3">{t('ui.contractTotals', 'Итого по контракту')}</div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="min-w-0">
                          <div className="text-xs text-gray-400">{t('ui.paid')}</div>
                          <div className="text-sm font-bold text-emerald-600 mt-0.5 break-all">${paidAmount.toLocaleString()}</div>
                        </div>
                        <div className="min-w-0 text-right">
                          <div className="text-xs text-gray-400">{t('ui.lockedAmount')}</div>
                          <div className="text-sm font-bold text-[#000052] mt-0.5 break-all">${lockedAmount.toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 flex flex-col sm:flex-row gap-2 border-t border-gray-100">
                  <button
                    type="button"
                    onClick={() => navigate(`/agent/contracts/${contract.id}`)}
                    className="w-full sm:flex-1 min-w-0 py-2.5 px-4 bg-white border border-gray-200 text-[#000052] rounded-xl text-sm font-semibold hover:border-[#000052] hover:bg-[#000052]/5 transition-all duration-200"
                  >
                    {t('ui.details')}
                  </button>

                  {canAccept && (
                    <button
                      type="button"
                      onClick={() => handleAcceptContract(contract.id)}
                      disabled={acceptingContractId === contract.id}
                      className="w-full sm:flex-1 min-w-0 py-2.5 px-4 bg-[#000052] text-white rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {acceptingContractId === contract.id ? t('common.loading') : t('ui.acceptContract', 'Принять контракт')}
                    </button>
                  )}

                  {(contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS') && (
                    <button
                      type="button"
                      onClick={() => handleSendWork(contract.id)}
                      className="w-full sm:flex-1 min-w-0 flex items-center justify-center gap-2 py-2.5 px-4 bg-[#000052] text-white rounded-xl text-sm font-semibold shadow-[0_4px_16px_rgba(0,0,82,0.25)] hover:bg-[#14147a] hover:-translate-y-0.5 active:translate-y-0 transition-all duration-200"
                    >
                      <Send className="w-4 h-4 shrink-0" />
                      <span className="break-words">{t('ui.sendWork')}</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
