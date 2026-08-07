import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { DollarSign, Shield, Clock, CheckCircle, AlertTriangle, TrendingUp, Lock } from 'lucide-react';

export function AgentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const { data: agentData } = await supabase
          .from('agents').select('*').eq('user_id', user.id).maybeSingle();
        if (!agentData) { setLoading(false); return; }
        setAgent(agentData);

        const { data: contractsData } = await supabase
          .from('contracts').select('*').eq('agent_id', agentData.id);
        setContracts(contractsData || []);

        if (contractsData && contractsData.length > 0) {
          const contractIds = contractsData.map(c => c.id);
          const { data: streamsData } = await supabase
            .from('contract_payout_streams').select('*').in('contract_id', contractIds);
          setStreams(streamsData || []);
        }
      } catch (err) {
        console.error('Ошибка:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

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
        <p className="text-lg text-[#000052]">Агент не найден</p>
      </div>
    );
  }

  const totalEarned = streams.reduce((sum, s) => sum + (s.status === 'PAID' ? s.amount : 0), 0);
  const availableForWithdrawal = streams.reduce((sum, s) => sum + (s.status === 'UNLOCKED' || s.status === 'PAYABLE' ? s.amount : 0), 0);
  const pendingVerification = streams.reduce((sum, s) => sum + (s.status === 'PENDING_VERIFICATION' ? s.amount : 0), 0);
  const escrowBalance = streams.reduce((sum, s) => sum + (s.status === 'LOCKED' ? s.amount : 0), 0);
  const retentionLocked = streams.filter(s => s.stream_key === 'retention' && s.status === 'LOCKED').reduce((sum, s) => sum + s.amount, 0);
  const clawedBack = streams.reduce((sum, s) => sum + (s.status === 'CLAWED_BACK' ? s.amount : 0), 0);

  const kpis = [
    { label: t('agent.totalEarned'), value: totalEarned, icon: DollarSign, color: 'bg-[#000052]', textColor: 'text-white' },
    { label: 'Доступно к выплате', value: availableForWithdrawal, icon: CheckCircle, color: 'bg-green-600', textColor: 'text-white' },
    { label: 'Ожидает подтверждения', value: pendingVerification, icon: Clock, color: 'bg-[#B8860B]', textColor: 'text-white' },
    { label: t('agent.escrowBalance'), value: escrowBalance, icon: Lock, color: 'bg-white', textColor: 'text-[#000052]' },
    { label: t('payouts.retention'), value: retentionLocked, icon: Shield, color: 'bg-white', textColor: 'text-[#000052]' },
    { label: 'Clawback (удержано)', value: clawedBack, icon: AlertTriangle, color: 'bg-red-600', textColor: 'text-white' },
  ];

  return (
    <div className="p-4 md:p-6 space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('agent.dashboardTitle')}</h1>
        <p className="text-sm text-[#000052]/70 mt-1">{agent.full_name}</p>
      </div>

      <div className="bg-gradient-to-r from-[#000052] to-[#B8860B] text-white p-5 rounded-xl">
        <div className="flex items-start gap-3">
          <Shield className="w-6 h-6 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-bold mb-1">{t('agent.fundsVerified')}</h3>
            <p className="text-sm opacity-90">{t('agent.clawbackWarning')}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, i) => {
          const Icon = kpi.icon;
          return (
            <div key={i} className={`${kpi.color} ${kpi.textColor} p-5 rounded-xl border border-[#000052]/10`}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-medium opacity-80">{kpi.label}</h3>
                <Icon className="w-5 h-5 opacity-80" />
              </div>
              <p className="text-2xl font-bold">${kpi.value.toLocaleString()}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <button
          onClick={() => navigate('/agent/contracts')}
          className="bg-white p-5 rounded-xl border border-[#000052]/10 hover:shadow-md transition text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <TrendingUp className="w-6 h-6 text-[#B8860B]" />
            <h3 className="font-bold text-[#000052]">{t('agent.myActiveContracts')}</h3>
          </div>
          <p className="text-sm text-[#000052]/70">{contracts.length} {t('agent.activeContracts')}</p>
        </button>

        <button
          onClick={() => navigate('/agent/payouts')}
          className="bg-white p-5 rounded-xl border border-[#000052]/10 hover:shadow-md transition text-left"
        >
          <div className="flex items-center gap-3 mb-2">
            <DollarSign className="w-6 h-6 text-[#B8860B]" />
            <h3 className="font-bold text-[#000052]">{t('payouts.title')}</h3>
          </div>
          <p className="text-sm text-[#000052]/70">{t('payouts.subtitle')}</p>
        </button>
      </div>
    </div>
  );
}