import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, CheckCircle, XCircle, FileText } from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Dispute {
  id: string;
  contract_id: string;
  reason: string;
  status: string;
  created_at: string;
  contracts: { title: string; escrow_amount: number; agent_id: string } | null;
}

interface ManualApproval {
  id: string;
  title: string;
  escrow_amount: number;
}

export function CEODisputesPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [manualApprovals, setManualApprovals] = useState<ManualApproval[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      
      // Загружаем активные споры
      const { data: disputesData } = await supabase
        .from('disputes')
        .select('*, contracts!contract_id(title, escrow_amount, agent_id)')
        .eq('status', 'PENDING_REVIEW')
        .order('created_at', { ascending: false });

      // Загружаем контракты, требующие ручного подтверждения
      const { data: manualData } = await supabase
        .from('contracts')
        .select('id, title, escrow_amount')
        .eq('requires_manual_approval', true)
        .eq('status', 'PENDING_MANUAL_APPROVAL');

      if (disputesData) setDisputes(disputesData as Dispute[]);
      if (manualData) setManualApprovals(manualData as ManualApproval[]);
      setLoading(false);
    };
    fetchData();
  }, [user]);

  const handleResolveDispute = async (disputeId: string, contractId: string, approve: boolean) => {
    const newStatus = approve ? 'RESOLVED_APPROVED' : 'RESOLVED_REJECTED';
    const contractStatus = approve ? 'COMPLETED' : 'DISPUTED_REJECTED';

    await supabase.from('disputes').update({ status: newStatus, resolved_at: new Date().toISOString() }).eq('id', disputeId);
    await supabase.from('contracts').update({ status: contractStatus }).eq('id', contractId);

    setDisputes(prev => prev.filter(d => d.id !== disputeId));
  };

  const handleManualApprove = async (contractId: string) => {
    await supabase.from('contracts').update({ 
      status: 'COMPLETED', 
      requires_manual_approval: false 
    }).eq('id', contractId);
    
    setManualApprovals(prev => prev.filter(c => c.id !== contractId));
  };

  if (loading) return <DashboardLayout><div className="p-8 text-text-secondary">{t('common.loading')}</div></DashboardLayout>;

  return (
    <DashboardLayout>
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
          {t('ceo.disputesAndApprovals')}
        </h1>
        <p className="text-text-secondary mt-1">
          {t('ceo.disputesSubtitle')}
        </p>
      </div>

      {/* Секция 1: Ручное подтверждение (Fallback Оракула) */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <FileText className="w-5 h-5 text-gold" />
          {t('ceo.manualApprovals')} ({manualApprovals.length})
        </h2>
        
        {manualApprovals.length === 0 ? (
          <div className="card p-6 text-center text-text-secondary">
            {t('ceo.noManualApprovals')}
          </div>
        ) : (
          <div className="grid gap-4">
            {manualApprovals.map((contract) => (
              <div key={contract.id} className="card flex items-center justify-between p-4 border-l-4 border-l-yellow-500">
                <div>
                  <h3 className="font-semibold text-text-primary">{contract.title}</h3>
                  <p className="text-sm text-text-muted">{t('contract.escrowAmount')}: ${contract.escrow_amount}</p>
                </div>
                <button 
                  onClick={() => handleManualApprove(contract.id)}
                  className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" /> {t('ceo.confirmPayment')}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Секция 2: Активные споры (Арбитраж) */}
      <div>
        <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-red-500" />
          {t('ceo.activeDisputes')} ({disputes.length})
        </h2>

        {disputes.length === 0 ? (
          <div className="card p-6 text-center text-text-secondary">
            {t('ceo.noDisputes')}
          </div>
        ) : (
          <div className="grid gap-4">
            {disputes.map((dispute) => (
              <div key={dispute.id} className="card p-5 border-l-4 border-l-red-500">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-semibold text-text-primary">
                      {dispute.contracts?.title || `Контракт #${dispute.contract_id.slice(0, 8)}`}
                    </h3>
                    <p className="text-sm text-text-muted mt-1">
                      {t('ceo.disputeReason')}: <span className="text-text-primary italic">"{dispute.reason}"</span>
                    </p>
                  </div>
                  <span className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                    {new Date(dispute.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                <div className="flex gap-3 mt-4 pt-4 border-t border-text-secondary/10">
                  <button 
                    onClick={() => handleResolveDispute(dispute.id, dispute.contract_id, true)}
                    className="bg-green-500 hover:bg-green-600 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                  >
                    <CheckCircle className="w-4 h-4" /> {t('ceo.payAgent')}
                  </button>
                  <button 
                    onClick={() => handleResolveDispute(dispute.id, dispute.contract_id, false)}
                    className="bg-red-500 hover:bg-red-600 text-white font-medium py-2 px-4 rounded-lg transition-all flex items-center gap-2"
                  >
                    <XCircle className="w-4 h-4" /> {t('ceo.rejectPayment')}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}