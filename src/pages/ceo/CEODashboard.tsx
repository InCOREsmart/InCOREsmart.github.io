import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  TrendingUp,
  DollarSign,
  Clock,
  FileText,
  Plus,
  ArrowRight,
  AlertCircle,
} from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { StatCard, KPIProgressBar, EscrowBadge, SixStreamsGrid, RiskHedgingWidget } from '../../components/ui';
import { CreateContractModal } from '../../components/ui/CreateContractModal';
import { supabase, Contract, Company, DEFAULT_PAYMENT_STREAMS } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardStats {
  activeContracts: number;
  totalRevenue: number;
  escrowBalance: number;
  pendingPayouts: number;
}

interface RiskType {
  id: string;
  name: string;
  score: number;
  status: 'safe' | 'warning' | 'danger';
}

export function CEODashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [stats, setStats] = useState<DashboardStats>({
    activeContracts: 0,
    totalRevenue: 0,
    escrowBalance: 0,
    pendingPayouts: 0,
  });
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [company, setCompany] = useState<Company | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNoCompanyAlert, setShowNoCompanyAlert] = useState(false);

  const defaultRisks: RiskType[] = [
    { id: 'fraud', name: t('risk.fraud'), score: 85, status: 'safe' },
    { id: 'nonPerformance', name: t('risk.nonPerformance'), score: 70, status: 'safe' },
    { id: 'quality', name: t('risk.quality'), score: 75, status: 'safe' },
    { id: 'deadline', name: t('risk.deadline'), score: 60, status: 'warning' },
    { id: 'retention', name: t('risk.retention'), score: 80, status: 'safe' },
  ];

  const [risks] = useState<RiskType[]>(defaultRisks);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;

      try {
        // Fetch company
        const { data: companyData } = await supabase
          .from('companies')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        setCompany(companyData);

        if (companyData) {
          // Fetch contracts
          const { data: contractsData } = await supabase
            .from('contracts')
            .select('*')
            .eq('company_id', companyData.id)
            .order('created_at', { ascending: false });

          setContracts(contractsData || []);

          // Calculate stats
          const active = (contractsData || []).filter(c =>
            ['ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL'].includes(c.status)
          ).length;

          const totalRevenue = (contractsData || [])
            .filter(c => c.status === 'COMPLETED')
            .reduce((sum, c) => sum + (c.kpi_revenue || 0), 0);

          const escrowBalance = (contractsData || [])
            .filter(c => c.escrow_status === 'FUNDED')
            .reduce((sum, c) => sum + (c.escrow_amount || 0), 0);

          const pendingPayouts = (contractsData || [])
            .filter(c => c.status === 'PENDING_APPROVAL')
            .reduce((sum, c) => sum + (c.escrow_amount || 0), 0);

          setStats({
            activeContracts: active,
            totalRevenue,
            escrowBalance,
            pendingPayouts,
          });
        }
      } catch (error) {
        console.error('Error fetching dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

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
      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-display font-bold text-text-primary">
            {t('dashboard.welcome')}, {company?.full_name || 'CEO'}
          </h1>
          <p className="text-text-secondary mt-1">{company?.company_name || t('dashboard.overview')}</p>
        </div>
        <button
          onClick={() => {
            if (company) {
              setShowCreateModal(true);
            } else {
              setShowNoCompanyAlert(true);
              setTimeout(() => setShowNoCompanyAlert(false), 3000);
            }
          }}
          className="btn-primary flex items-center gap-2 self-start"
        >
          <Plus className="w-5 h-5" />
          {t('contract.createContract')}
        </button>
        {showNoCompanyAlert && (
          <div className="absolute top-20 right-4 bg-error/20 border border-error/30 rounded-lg px-4 py-3 text-error text-sm">
            Сначала заполните данные компании в настройках
          </div>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          title={t('dashboard.activeContracts')}
          value={stats.activeContracts}
          icon={FileText}
        />
        <StatCard
          title={t('dashboard.totalRevenue')}
          value={`$${stats.totalRevenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{ value: 12, isPositive: true }}
        />
        <StatCard
          title={t('dashboard.escrowBalance')}
          value={`$${stats.escrowBalance.toLocaleString()}`}
          icon={TrendingUp}
        />
        <StatCard
          title={t('dashboard.pendingPayouts')}
          value={`$${stats.pendingPayouts.toLocaleString()}`}
          icon={Clock}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* Active Contracts */}
        <div className="lg:col-span-2">
          <div className="card">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-semibold text-text-primary">
                {t('dashboard.activeContracts')}
              </h2>
              <button
                onClick={() => navigate('/ceo/contracts')}
                className="text-gold hover:text-gold-light text-sm flex items-center gap-1"
              >
                {t('common.all')}
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            {contracts.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-12 h-12 text-text-muted mx-auto mb-3" />
                <p className="text-text-secondary mb-4">No contracts yet</p>
                <button
                  onClick={() => {
                    if (company) {
                      setShowCreateModal(true);
                    } else {
                      setShowNoCompanyAlert(true);
                      setTimeout(() => setShowNoCompanyAlert(false), 3000);
                    }
                  }}
                  className="btn-outline"
                >
                  {t('contract.createContract')}
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {contracts.slice(0, 5).map((contract) => (
                  <div
                    key={contract.id}
                    className="flex items-center gap-4 p-4 bg-primary-dark rounded-lg hover:bg-primary-light cursor-pointer transition-colors"
                    onClick={() => navigate(`/ceo/contracts/${contract.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <h3 className="text-text-primary font-medium truncate">
                        {contract.title}
                      </h3>
                      <p className="text-text-muted text-sm mt-1">
                        {t('contract_deadline')}: {new Date(contract.deadline).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className={`text-sm px-2 py-1 rounded ${
                        contract.status === 'ACTIVE' ? 'bg-success/20 text-success' :
                        contract.status === 'IN_PROGRESS' ? 'bg-gold/20 text-gold' :
                        'bg-text-secondary/20 text-text-secondary'
                      }`}>
                        {t(`contract.statuses.${contract.status}`)}
                      </span>
                      <EscrowBadge status={contract.escrow_status} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Risk Hedging */}
        <div>
          <RiskHedgingWidget risks={risks} />
        </div>
      </div>

      {/* Payment Streams */}
      {contracts.length > 0 && (
        <div className="card">
          <h2 className="text-xl font-display font-semibold text-text-primary mb-6">
            {t('paymentStreams.title')}
          </h2>
          <SixStreamsGrid
            streams={DEFAULT_PAYMENT_STREAMS}
            amounts={{
              new_sales: 5000,
              renewal: 1500,
              cross_sell: 2000,
              plan_bonus: 10000,
              annual_bonus: 800,
              retention_bonus: 3000,
            }}
          />
        </div>
      )}

      {/* KPI Progress */}
      {contracts.length > 0 && (
        <div className="card mt-6">
          <h2 className="text-xl font-display font-semibold text-text-primary mb-6">
            {t('dashboard.kpis')}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
            <KPIProgressBar
              label={t('kpi.calls')}
              current={120}
              target={200}
              color="gold"
            />
            <KPIProgressBar
              label={t('kpi.meetings')}
              current={25}
              target={40}
              color="gold"
            />
            <KPIProgressBar
              label={t('kpi.proposals')}
              current={15}
              target={25}
              color="gold"
            />
            <KPIProgressBar
              label={t('kpi.revenue')}
              current={45000}
              target={100000}
              unit="$"
              color="success"
            />
          </div>
        </div>
      )}

      {/* Create Contract Modal */}
      {showCreateModal && company ? (
        <CreateContractModal
          companyId={company.id}
          onClose={() => setShowCreateModal(false)}
          onCreated={(newContract) => {
            setContracts([newContract, ...contracts]);
            setShowCreateModal(false);
          }}
        />
      ) : showCreateModal && !company ? (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[60]">
          <div className="bg-primary border border-text-secondary/20 rounded-2xl p-6 max-w-md text-center">
            <AlertCircle className="w-12 h-12 text-error mx-auto mb-4" />
            <h3 className="text-lg font-medium text-text-primary mb-2">Данные компании не найдены</h3>
            <p className="text-text-secondary mb-4">Сначала заполните данные компании в настройках</p>
            <button
              onClick={() => setShowCreateModal(false)}
              className="btn-primary"
            >
              Понятно
            </button>
          </div>
        </div>
      ) : null}
    </DashboardLayout>
  );
}
