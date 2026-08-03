import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, ShieldCheck, Target, FileText, Clock } from 'lucide-react';

export function AgentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({ totalEarned: 0, pendingPayouts: 0, escrowBalance: 0, activeContracts: 0 });
  const [recentContracts, setRecentContracts] = useState<any[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: agentData } = await supabase.from('agents').select('id').eq('user_id', user.id).maybeSingle();
        if (agentData) {
          const { data: contractsData } = await supabase.from('contracts').select('*').eq('agent_id', agentData.id).order('created_at', { ascending: false });
          const active = (contractsData || []).filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS' || c.status === 'PENDING_APPROVAL');
          const completed = (contractsData || []).filter(c => c.status === 'COMPLETED');
          
          setMetrics({
            totalEarned: completed.reduce((sum, c) => sum + (c.agent_payouts_total || 0), 0),
            pendingPayouts: active.reduce((sum, c) => sum + (c.agent_payouts_total || 0), 0),
            escrowBalance: active.reduce((sum, c) => sum + (c.escrow_amount || 0), 0),
            activeContracts: active.length,
          });
          setRecentContracts((contractsData || []).slice(0, 5));
        }
      } catch (err) { console.error('Ошибка:', err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="p-8 text-center text-[#000052]"><div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div><p className="mt-2">{t('common.loading')}</p></div>;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-[#000052]">{t('agent.dashboardTitle')}</h1>
        <p className="text-[#000052]/60 mt-1">Ваши показатели и активные задачи</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl shadow-sm border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">{t('agent.totalEarned')}</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${metrics.totalEarned.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl shadow-sm border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">{t('agent.escrowBalance')}</h3>
            <ShieldCheck className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${metrics.escrowBalance.toLocaleString()}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl shadow-sm border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">{t('agent.pendingPayouts')}</h3>
            <Target className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${metrics.pendingPayouts.toLocaleString()}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl shadow-sm border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">{t('agent.activeContracts')}</h3>
            <FileText className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.activeContracts}</p>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-[#000052]/10">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-[#000052]">{t('agent.myActiveContracts')}</h2>
          <button onClick={() => navigate('/agent/contracts')} className="text-sm text-[#B8860B] hover:underline font-medium">{t('common.viewAll')}</button>
        </div>
        
        {recentContracts.length === 0 ? (
          <div className="text-center py-12 text-[#000052]/60">
            <Clock className="w-12 h-12 mx-auto mb-4 text-[#000052]/20" />
            <p>{t('agent.noActiveContracts')}</p>
            <p className="text-sm mt-1">{t('agent.contractWillAppear')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#000052]/10">
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">{t('contract.title')}</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">{t('contract.status')}</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">{t('contract.escrowAmount')}</th>
                  <th className="text-left py-3 px-4 text-xs font-bold text-[#000052] uppercase tracking-wider">{t('contract.deadline')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#000052]/5">
                {recentContracts.map((contract) => (
                  <tr key={contract.id} onClick={() => navigate(`/agent/contracts/${contract.id}`)} className="hover:bg-[#000052]/5 cursor-pointer transition">
                    <td className="py-4 px-4 text-sm font-semibold text-[#000052]">{contract.title}</td>
                    <td className="py-4 px-4">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${contract.status === 'ACTIVE' ? 'bg-[#B8860B]/10 text-[#B8860B]' : 'bg-[#000052]/5 text-[#000052]'}`}>
                        {t(`contract.statuses.${contract.status}`)}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-sm text-[#000052]">${(contract.escrow_amount || 0).toLocaleString()}</td>
                    <td className="py-4 px-4 text-sm text-[#000052]/70">{new Date(contract.deadline).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}