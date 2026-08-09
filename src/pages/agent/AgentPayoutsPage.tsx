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

  if (loading) return <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]" /><p className="mt-4 text-[#000052]">{t('common.loading')}</p></div>;
  if (!agent) return <div className="p-8 text-center"><p className="text-lg text-[#000052]">{t('ui.agentNotFound')}</p></div>;

  const total = streams.reduce((sum, s) => sum + (s.amount || 0), 0);
  const paid = streams.filter(s => s.status === 'PAID').reduce((sum, s) => sum + (s.amount || 0), 0);
  const clawback = streams.filter(s => s.status === 'CLAWED_BACK').reduce((sum, s) => sum + (s.amount || 0), 0);
  const locked = streams.filter(s => ['LOCKED', 'PENDING'].includes(s.status)).reduce((sum, s) => sum + (s.amount || 0), 0);
  const contractTitle = (id: string) => contracts.find(c => c.id === id)?.title || '—';
  const status = (value: string) => {
    const map: Record<string, { label: string; icon: any; className: string }> = {
      PAID: { label: t('ui.paidStatus'), icon: CheckCircle, className: 'text-green-600' },
      UNLOCKED: { label: t('ui.unlockedStatus'), icon: Unlock, className: 'text-blue-600' },
      PAYABLE: { label: t('ui.payableStatus'), icon: DollarSign, className: 'text-emerald-600' },
      LOCKED: { label: t('ui.lockedStatus'), icon: Lock, className: 'text-gray-500' },
      PENDING: { label: t('ui.pendingVerificationStatus'), icon: Clock, className: 'text-yellow-600' },
      CLAWED_BACK: { label: t('ui.clawback'), icon: Ban, className: 'text-red-600' },
      CANCELLED: { label: t('ui.cancelledStatus'), icon: AlertTriangle, className: 'text-gray-500' },
    };
    return map[value] || { label: value, icon: Clock, className: 'text-gray-500' };
  };

  return <div className="p-4 md:p-6 space-y-6">
    <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('payouts.title')}</h1><p className="text-sm text-[#000052]/70 mt-1">{t('payouts.subtitle')}</p></div>
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-[#000052] text-white p-5 rounded-xl"><p className="text-sm opacity-80">{t('ui.totalContracts')}</p><p className="text-2xl font-bold mt-1">${total.toLocaleString()}</p></div>
      <div className="bg-green-600 text-white p-5 rounded-xl"><p className="text-sm opacity-80">{t('ui.paid')}</p><p className="text-2xl font-bold mt-1">${paid.toLocaleString()}</p></div>
      <div className="bg-[#B8860B] text-white p-5 rounded-xl"><p className="text-sm opacity-80">{t('ui.lockedAmount')}</p><p className="text-2xl font-bold mt-1">${locked.toLocaleString()}</p></div>
      <div className="bg-red-600 text-white p-5 rounded-xl"><p className="text-sm opacity-80">{t('ui.clawback')}</p><p className="text-2xl font-bold mt-1">${clawback.toLocaleString()}</p></div>
    </div>
    <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
      <div className="p-5 border-b border-[#000052]/10"><h2 className="text-lg font-bold text-[#000052]">{t('ui.paymentStreams')} ({streams.length})</h2></div>
      {streams.length === 0 ? <div className="p-12 text-center text-[#000052]/60">{t('ui.noStreams')}</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead className="bg-[#000052]/5"><tr><th className="text-left p-4">{t('ui.stream')}</th><th className="text-left p-4">{t('ui.contract')}</th><th className="text-left p-4">{t('ui.amount')}</th><th className="text-left p-4">{t('ui.status')}</th><th className="text-left p-4">{t('ui.unlockCondition')}</th><th className="text-left p-4">{t('ui.date')}</th></tr></thead><tbody>{streams.map(stream => { const s = status(stream.status); const StatusIcon = s.icon; return <tr key={stream.id} className="border-t border-[#000052]/10"><td className="p-4 font-medium">{stream.title}</td><td className="p-4">{contractTitle(stream.contract_id)}</td><td className="p-4 font-bold">${(stream.amount || 0).toLocaleString()}</td><td className={`p-4 font-semibold ${s.className}`}><span className="inline-flex items-center gap-1"><StatusIcon className="w-4 h-4" />{s.label}</span></td><td className="p-4 text-[#000052]/70">{stream.unlock_condition || '—'}</td><td className="p-4 text-[#000052]/70">{stream.unlocked_at ? new Date(stream.unlocked_at).toLocaleDateString() : '—'}{stream.paid_at && <div>{new Date(stream.paid_at).toLocaleDateString()}</div>}</td></tr>; })}</tbody></table></div>}
    </div>
  </div>;
}
