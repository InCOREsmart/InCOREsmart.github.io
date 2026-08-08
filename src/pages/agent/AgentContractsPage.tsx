import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { 
  FileText, 
  DollarSign, 
  Clock, 
  CheckCircle, 
  Shield, 
  AlertTriangle,
  Send,
  Lock,
  Unlock
} from 'lucide-react';

export function AgentContractsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [streamsByContract, setStreamsByContract] = useState<Record<string, any[]>>({});

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!agentData) { setLoading(false); return; }
        setAgent(agentData);

        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('agent_id', agentData.id)
          .order('created_at', { ascending: false });

        setContracts(contractsData || []);

        if (contractsData && contractsData.length > 0) {
          const contractIds = contractsData.map(c => c.id);
          const { data: streams } = await supabase
            .from('contract_payout_streams')
            .select('*')
            .in('contract_id', contractIds);

          // Группируем потоки по контракту
          const grouped: Record<string, any[]> = {};
          (streams || []).forEach(s => {
            if (!grouped[s.contract_id]) grouped[s.contract_id] = [];
            grouped[s.contract_id].push(s);
          });
          setStreamsByContract(grouped);
        }
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const handleSendWork = async (contractId: string) => {
    const confirmed = window.confirm(t('ui.submitWorkConfirm'));
    if (!confirmed) return;

    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'PENDING_APPROVAL' })
        .eq('id', contractId);

      if (error) throw error;

      // Создаём уведомление для CEO
      const { data: contract } = await supabase
        .from('contracts')
        .select('company_id, title')
        .eq('id', contractId)
        .single();

      if (contract) {
        await supabase.from('notifications').insert({
          user_id: contract.company_id,
          title: t('ui.workSubmitted'),
          message: `Агент отправил работу по контракту "${contract.title}"`,
          type: 'WORK_SUBMITTED',
          is_read: false,
        });
      }

      alert(t('ui.workSubmitted'));
      window.location.reload();
    } catch (err) {
      console.error('Ошибка:', err);
      alert(t('ui.workSubmitError'));
    }
  };

  const getStatusInfo = (status: string) => {
    switch (status) {
      case 'DRAFT': return { icon: FileText, color: 'bg-gray-100 text-gray-700', label: t('ui.draft') };
      case 'PENDING_PAYMENT': return { icon: Clock, color: 'bg-yellow-100 text-yellow-700', label: t('ui.pendingPayment') };
      case 'ACTIVE': return { icon: CheckCircle, color: 'bg-green-100 text-green-700', label: t('ui.active') };
      case 'IN_PROGRESS': return { icon: Send, color: 'bg-blue-100 text-blue-700', label: t('ui.inProgress') };
      case 'PENDING_APPROVAL': return { icon: Clock, color: 'bg-[#B8860B]/20 text-[#B8860B]', label: t('ui.pendingApproval') };
      case 'COMPLETED': return { icon: CheckCircle, color: 'bg-green-200 text-green-800', label: t('ui.completed') };
      case 'DISPUTED': return { icon: AlertTriangle, color: 'bg-red-100 text-red-700', label: t('ui.disputed') };
      case 'CANCELLED': return { icon: FileText, color: 'bg-gray-200 text-gray-700', label: t('ui.cancelled') };
      default: return { icon: FileText, color: 'bg-gray-100 text-gray-700', label: status };
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]"></div>
        <p className="mt-4 text-[#000052]">{t('common.loading')}</p>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="p-8 text-center">
        <p className="text-lg text-[#000052]">{t('ui.agentNotFound')}</p>
      </div>
    );
  }

  // Сводка
  const totalEscrow = contracts.reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
  const totalRevenue = contracts.reduce((sum, c) => sum + (c.revenue || 0), 0);
  const activeCount = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length;

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('agent.myActiveContracts')}</h1>
        <p className="text-sm text-[#000052]/70 mt-1">{t('agent.subtitle')}</p>
      </div>

      {/* Сводка */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">{t('agent.activeContracts')}</h3>
            <FileText className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">{activeCount}</p>
          <p className="text-xs opacity-70 mt-1">{t('ui.ofTotal')}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">{t('ui.escrow')}</h3>
            <Shield className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${totalEscrow.toLocaleString()}</p>
          <p className="text-xs opacity-70 mt-1">{t('ui.protectedBySmartContract')}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">{t('ui.totalRevenue')}</h3>
            <DollarSign className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-[#000052]/60 mt-1">{t('ui.allContracts')}</p>
        </div>
      </div>

      {/* Баннер защиты */}
      <div className="bg-gradient-to-r from-[#000052] to-[#B8860B] text-white p-4 rounded-xl">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 flex-shrink-0" />
          <div>
            <p className="font-bold text-sm">{t('agent.fundsVerified')}</p>
            <p className="text-xs opacity-90 mt-0.5">{t('agent.clawbackWarning')}</p>
          </div>
        </div>
      </div>

      {/* Список контрактов */}
      {contracts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-[#000052]/10 text-center">
          <FileText className="w-16 h-16 mx-auto mb-4 text-[#000052]/20" />
          <p className="text-lg font-medium text-[#000052] mb-2">{t('ui.noContracts')}</p>
          <p className="text-sm text-[#000052]/60">{t('ui.noContractsDescription')}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {contracts.map((contract) => {
            const statusInfo = getStatusInfo(contract.status);
            const StatusIcon = statusInfo.icon;
            const streams = streamsByContract[contract.id] || [];
            const totalStreamAmount = streams.reduce((sum, s) => sum + s.amount, 0);
            const unlockedAmount = streams.filter(s => ['UNLOCKED', 'PAYABLE', 'PAID'].includes(s.status)).reduce((sum, s) => sum + s.amount, 0);
            const lockedAmount = totalStreamAmount - unlockedAmount;
            const paidAmount = streams.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.amount, 0);

            return (
              <div 
                key={contract.id}
                className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden hover:shadow-md transition"
              >
                {/* Шапка контракта */}
                <div className="p-5 border-b border-[#000052]/10">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="font-bold text-[#000052] text-lg">{contract.title}</h3>
                      {contract.description && (
                        <p className="text-sm text-[#000052]/60 mt-1">{contract.description}</p>
                      )}
                    </div>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-semibold ${statusInfo.color}`}>
                      <StatusIcon className="w-3 h-3" />
                      {statusInfo.label}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <div className="text-xs text-[#000052]/60">{t('ui.revenue')}</div>
                      <div className="font-bold text-[#000052]">${(contract.revenue || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#000052]/60">{t('ui.escrow')}</div>
                      <div className="font-bold text-[#B8860B]">${(contract.escrow_amount || 0).toLocaleString()}</div>
                    </div>
                    <div>
                      <div className="text-xs text-[#000052]/60">{t('ui.deadline')}</div>
                      <div className="font-bold text-[#000052]">
                        {contract.deadline ? new Date(contract.deadline).toLocaleDateString('ru-RU') : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-[#000052]/60">{t('ui.escrowStatus')}</div>
                      <div className="font-bold text-[#000052] flex items-center gap-1">
                        {contract.escrow_status === 'FUNDED' ? (
                          <><Unlock className="w-3 h-3 text-green-600" /> Заблокирован</>
                        ) : (
                          <><Lock className="w-3 h-3 text-gray-500" /> Не заблокирован</>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Потоки выплат (кратко) */}
                {streams.length > 0 && (
                  <div className="p-5 bg-[#000052]/5 border-b border-[#000052]/10">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-[#000052]">Потоки выплат ({streams.length})</h4>
                      <div className="text-xs text-[#000052]/60">
                        Разблокировано: ${unlockedAmount.toLocaleString()} / ${totalStreamAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* Прогресс-бар */}
                    <div className="h-2 bg-[#000052]/10 rounded-full overflow-hidden mb-3">
                      <div 
                        className="h-full bg-gradient-to-r from-[#B8860B] to-green-600 transition-all"
                        style={{ width: `${totalStreamAmount > 0 ? (unlockedAmount / totalStreamAmount) * 100 : 0}%` }}
                      ></div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {streams.slice(0, 4).map((stream) => (
                        <div key={stream.id} className="bg-white p-2 rounded border border-[#000052]/10">
                          <div className="text-[#000052]/60 truncate">{stream.title}</div>
                          <div className="font-bold text-[#000052]">${stream.amount.toLocaleString()}</div>
                          <div className={`text-xs mt-0.5 ${
                            stream.status === 'PAID' ? 'text-green-600' :
                            stream.status === 'UNLOCKED' ? 'text-blue-600' :
                            stream.status === 'CLAWED_BACK' ? 'text-red-600' :
                            'text-gray-500'
                          }`}>
                            {stream.status}
                          </div>
                        </div>
                      ))}
                      {streams.length > 4 && (
                        <div className="bg-white p-2 rounded border border-[#000052]/10 flex items-center justify-center text-[#000052]/60">
                          +{streams.length - 4} ещё
                        </div>
                      )}
                    </div>

                    <div className="flex items-center justify-between mt-3 text-xs">
                      <span className="text-[#000052]/60">Выплачено: <span className="font-bold text-green-600">${paidAmount.toLocaleString()}</span></span>
                      <span className="text-[#000052]/60">Заблокировано: <span className="font-bold text-[#000052]">${lockedAmount.toLocaleString()}</span></span>
                    </div>
                  </div>
                )}

                {/* Действия */}
                <div className="p-4 flex gap-2">
                  <button
                    onClick={() => navigate(`/agent/contracts/${contract.id}`)}
                    className="flex-1 py-2 px-4 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg text-sm font-semibold transition"
                  >
                    Подробнее
                  </button>
                  {(contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS') && (
                    <button
                      onClick={() => handleSendWork(contract.id)}
                      className="flex items-center gap-2 py-2 px-4 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg text-sm font-semibold transition"
                    >
                      <Send className="w-4 h-4" />
                      Отправить работу
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