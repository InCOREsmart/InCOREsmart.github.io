import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { Lock, Unlock, CheckCircle, Ban, Clock, AlertTriangle, DollarSign } from 'lucide-react';

export function AgentPayoutsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [streams, setStreams] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const { data: agentData } = await supabase.from('agents').select('*').eq('user_id', user.id).maybeSingle();
        if (!agentData) { setLoading(false); return; }
        setAgent(agentData);
        const { data: contractsData } = await supabase.from('contracts').select('*').eq('agent_id', agentData.id);
        setContracts(contractsData || []);
        if (contractsData?.length) {
          const { data: streamsData } = await supabase.from('contract_payout_streams').select('*').in('contract_id', contractsData.map(c => c.id)).order('created_at', { ascending: false });
          setStreams(streamsData || []);
        }
      } catch (err) { console.error(err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="p-4 md:p-8 text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]" /><p className="mt-4 text-[#000052]">{t('common.loading')}</p></div>;
  if (!agent) return <div className="p-4 md:p-8 text-center"><p className="text-lg text-[#000052]">{t('ui.agentNotFound')}</p></div>;

  const total = streams.reduce((sum, s) => sum + (s.amount || 0), 0);
  const paid = streams.filter(s => s.status === 'PAID').reduce((sum, s) => sum + (s.amount || 0), 0);
  const clawback = streams.filter(s => s.status === 'CLAWED_BACK').reduce((sum, s) => sum + (s.amount || 0), 0);
  const locked = streams.filter(s => ['LOCKED', 'PENDING'].includes(s.status)).reduce((sum, s) => sum + (s.amount || 0), 0);
  const contractTitle = (id: string) => contracts.find(c => c.id === id)?.title || '—';
  const expectedDate = (stream: any) => {
    const deadline = contracts.find(c => c.id === stream.contract_id)?.deadline;
    if (deadline) return `~${new Date(deadline).toLocaleDateString()}`;
    const base = stream.created_at ? new Date(stream.created_at) : new Date();
    if (Number.isNaN(base.getTime())) return '—';
    base.setDate(base.getDate() + 90);
    return `~${base.toLocaleDateString()}`;
  };
  const status = (value: string) => {
    const map: Record<string, { label: string; icon: any; className: string }> = {
      PAID: { label: t('ui.paidStatus'), icon: CheckCircle, className: 'bg-emerald-50 text-emerald-600' },
      UNLOCKED: { label: t('ui.unlockedStatus'), icon: Unlock, className: 'bg-[#000052]/5 text-[#000052]' },
      PAYABLE: { label: t('ui.payableStatus'), icon: DollarSign, className: 'bg-[#B8860B]/10 text-[#B8860B]' },
      LOCKED: { label: t('ui.lockedStatus'), icon: Lock, className: 'bg-gray-100 text-gray-500' },
      PENDING: { label: t('ui.pendingVerificationStatus'), icon: Clock, className: 'bg-amber-50 text-amber-600' },
      CLAWED_BACK: { label: t('ui.clawback'), icon: Ban, className: 'bg-red-50 text-red-600' },
      CANCELLED: { label: t('ui.cancelledStatus'), icon: AlertTriangle, className: 'bg-gray-100 text-gray-500' },
    };
    return map[value] || { label: value, icon: Clock, className: 'bg-gray-100 text-gray-500' };
  };

  const kpis = [
    { label: t('ui.totalContracts'), value: total, icon: DollarSign, box: 'bg-[#000052]/5 text-[#000052]', valueColor: total > 0 ? 'text-[#000052]' : 'text-[#64748B]' },
    { label: t('ui.paid'), value: paid, icon: CheckCircle, box: 'bg-emerald-50 text-emerald-600', valueColor: paid > 0 ? 'text-emerald-600' : 'text-[#64748B]' },
    { label: t('ui.lockedAmount'), value: locked, icon: Lock, box: 'bg-[#B8860B]/10 text-[#B8860B]', valueColor: locked > 0 ? 'text-[#B8860B]' : 'text-[#64748B]' },
    { label: t('ui.clawback'), value: clawback, icon: Ban, box: 'bg-red-50 text-red-500', valueColor: clawback > 0 ? 'text-red-600' : 'text-[#64748B]' },
  ];

  return <div className="p-4 md:p-8 space-y-5 md:space-y-6 w-full min-w-0 overflow-x-hidden">
    <div>
      <h1 className="text-[24px] md:text-3xl font-bold text-[#000052] tracking-tight break-words">{t('payouts.title')}</h1>
      <p className="text-sm text-gray-400 mt-1 break-words">{t('payouts.subtitle')}</p>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-5">
      {kpis.map((kpi, i) => {
        const Icon = kpi.icon;
        return (
          <div key={i} className="bg-white p-4 md:p-5 rounded-2xl shadow-sm min-w-0 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,82,0.12)]">
            <div className="flex items-start justify-between gap-2 mb-3 md:mb-4">
              <h3 className="text-xs md:text-sm font-medium text-gray-500 leading-tight break-words min-w-0">{kpi.label}</h3>
              <div className={`w-9 h-9 md:w-10 md:h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${kpi.box}`}>
                <Icon className="w-4 h-4 md:w-5 md:h-5" />
              </div>
            </div>
            <p className={`text-xl md:text-[26px] font-bold tracking-tight break-words tabular-nums ${kpi.valueColor}`}>${kpi.value.toLocaleString()}</p>
          </div>
        );
      })}
    </div>

    <div className="bg-white rounded-2xl shadow-sm overflow-hidden min-w-0">
      <div className="p-4 md:p-6 pb-3 md:pb-4">
        <h2 className="text-base md:text-lg font-bold text-[#000052]">{t('ui.paymentStreams')} <span className="text-gray-400 font-medium">({streams.length})</span></h2>
      </div>
      {streams.length === 0 ? (
        <div className="p-10 md:p-12 text-center text-gray-400">{t('ui.noStreams')}</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">
                <th className="px-4 md:px-6 py-3">{t('ui.stream')}</th>
                <th className="px-4 md:px-6 py-3">{t('ui.contract')}</th>
                <th className="px-4 md:px-6 py-3 text-right">{t('ui.amount')}</th>
                <th className="px-4 md:px-6 py-3">{t('ui.status')}</th>
                <th className="px-4 md:px-6 py-3">{t('ui.unlockCondition')}</th>
                <th className="px-4 md:px-6 py-3">{t('ui.date')}</th>
              </tr>
            </thead>
            <tbody>
              {streams.map(stream => {
                const s = status(stream.status);
                const StatusIcon = s.icon;
                return (
                  <tr key={stream.id} className="border-t border-gray-50 hover:bg-[#000052]/[0.02] transition-colors">
                    <td className="px-4 md:px-6 py-4 font-semibold text-[#000052]">{stream.title}</td>
                    <td className="px-4 md:px-6 py-4 text-gray-500 max-w-[220px] truncate" title={contractTitle(stream.contract_id)}>{contractTitle(stream.contract_id)}</td>
                    <td className="px-4 md:px-6 py-4 font-bold text-[#000052] text-right tabular-nums">${(stream.amount || 0).toLocaleString()}</td>
                    <td className="px-4 md:px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap ${s.className}`}>
                        <StatusIcon className="w-3.5 h-3.5" />
                        {s.label}
                      </span>
                    </td>
                    <td className="px-4 md:px-6 py-4 text-gray-500 max-w-[220px] truncate" title={stream.unlock_condition || '—'}>{stream.unlock_condition || '—'}</td>
                    <td className="px-4 md:px-6 py-4">
                      {stream.unlocked_at ? (
                        <div className="text-gray-500 whitespace-nowrap">{new Date(stream.unlocked_at).toLocaleDateString()}</div>
                      ) : (
                        <div>
                          <div className="text-[#46618C] font-medium whitespace-nowrap">{expectedDate(stream)}</div>
                          <div className="text-xs text-gray-400 mt-0.5">{t('ui.expectedDate', 'Ожидается')}</div>
                        </div>
                      )}
                      {stream.paid_at && <div className="text-xs text-emerald-600 mt-0.5 whitespace-nowrap">{new Date(stream.paid_at).toLocaleDateString()}</div>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  </div>;
}