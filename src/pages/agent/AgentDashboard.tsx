import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  DollarSign,
  Clock,
  FileText,
  Target,
  CheckCircle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { ActiveContractCard } from '../../components/dashboard/ActiveContractCard';
import { AgentKPIPanel } from '../../components/dashboard/AgentKPIPanel';
import { DashboardStats } from '../../components/dashboard/DashboardStats';
import {
  StatCard,
  KPIProgressBar,
  SixStreamsGrid,
} from '../../components/ui';
import { supabase, Contract, Agent, DEFAULT_PAYMENT_STREAMS } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Step {
  key: string;
  status: 'completed' | 'current' | 'pending';
}

export function AgentDashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeStep, setActiveStep] = useState<Step[]>([
    { key: 'verification', status: 'completed' },
    { key: 'execution', status: 'current' },
    { key: 'contract', status: 'pending' },
    { key: 'payout', status: 'pending' },
  ]);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch agent profile
        const { data: agentData } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setAgent(agentData);

        if (agentData) {
          // Fetch contracts where agent is assigned
          const { data: contractsData } = await supabase
            .from('contracts')
            .select('*')
            .eq('agent_id', agentData.id)
            .order('created_at', { ascending: false });

          setContracts(contractsData || []);

          // Update step tracker based on contract status
          if (contractsData && contractsData.length > 0) {
            const latestContract = contractsData[0];
            const steps = getStepsFromStatus(latestContract.status);
            setActiveStep(steps);
          }
        }
      } catch (error) {
        console.error('Error fetching agent data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  const getStepsFromStatus = (status: string): Step[] => {
    switch (status) {
      case 'DRAFT':
      case 'PENDING_PAYMENT':
        return [
          { key: 'verification', status: 'completed' },
          { key: 'execution', status: 'pending' },
          { key: 'contract', status: 'pending' },
          { key: 'payout', status: 'pending' },
        ];
      case 'ACTIVE':
      case 'IN_PROGRESS':
        return [
          { key: 'verification', status: 'completed' },
          { key: 'execution', status: 'current' },
          { key: 'contract', status: 'pending' },
          { key: 'payout', status: 'pending' },
        ];
      case 'PENDING_APPROVAL':
        return [
          { key: 'verification', status: 'completed' },
          { key: 'execution', status: 'completed' },
          { key: 'contract', status: 'current' },
          { key: 'payout', status: 'pending' },
        ];
      case 'COMPLETED':
        return [
          { key: 'verification', status: 'completed' },
          { key: 'execution', status: 'completed' },
          { key: 'contract', status: 'completed' },
          { key: 'payout', status: 'completed' },
        ];
      default:
        return [
          { key: 'verification', status: 'completed' },
          { key: 'execution', status: 'pending' },
          { key: 'contract', status: 'pending' },
          { key: 'payout', status: 'pending' },
        ];
    }
  };

  const totalEarnings = contracts
    .filter((c) => c.status === 'COMPLETED')
    .reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
const pendingPayouts = contracts
  .filter((c) => c.status === 'PENDING_APPROVAL')
  .reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
  const activeTasks = contracts.filter((c) =>
    ['ACTIVE', 'IN_PROGRESS'].includes(c.status)
  ).length;

  const completedTasks = contracts.filter((c) => c.status === 'COMPLETED').length;

  const latestContract = contracts[0];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-text-secondary">{t('common.loading')}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
          {t('dashboard.welcome')}, {agent?.full_name || 'Agent'}
        </h1>
        <p className="text-text-secondary mt-1">{t('dashboard.overview')}</p>
      </div>

      {/* Stats Grid */}
      <DashboardStats
  activeTasks={activeTasks}
  completedTasks={completedTasks}
  totalEarnings={totalEarnings}
  pendingPayouts={pendingPayouts}
/>

      {/* Main Content */}
      {latestContract && (
  <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">

    <div className="lg:col-span-2">
      <ActiveContractCard
        contract={latestContract}
        activeStep={activeStep}
      />
    </div>

    <div>
      <AgentKPIPanel />
    </div>

  </div>
)}
      {/* Payment Streams */}
      {contracts.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-display font-semibold text-text-primary mb-6">
            {t('paymentStreams.title')}
          </h2>
          <SixStreamsGrid
            streams={DEFAULT_PAYMENT_STREAMS}
            amounts={{
              new_sales: latestContract?.status === 'COMPLETED' ? 5000 : 0,
              renewal: latestContract?.status === 'COMPLETED' ? 1500 : 0,
              cross_sell: latestContract?.status === 'COMPLETED' ? 2000 : 0,
              plan_bonus: latestContract?.status === 'COMPLETED' ? 10000 : 0,
              annual_bonus: latestContract?.status === 'COMPLETED' ? 800 : 0,
              retention_bonus: latestContract?.status === 'COMPLETED' ? 3000 : 0,
            }}
          />
        </div>
      )}

      {/* Empty State */}
      {contracts.length === 0 && (
        <div className="card text-center py-12">
          <FileText className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-display font-semibold text-text-primary mb-2">
            У вас пока нет активных контрактов
          </h3>
          <p className="text-text-secondary mb-6">
            После назначения контракта он автоматически появится здесь
          </p>
          <button
  onClick={() => navigate('/agent/settings')}
  className="btn-primary"
>
  Открыть профиль
</button>
        </div>
      )}
    </DashboardLayout>
  );
}
