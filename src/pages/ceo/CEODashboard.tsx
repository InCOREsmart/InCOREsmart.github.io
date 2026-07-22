import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  DollarSign, TrendingUp, Shield, Users, Briefcase, 
  BarChart3, AlertCircle, CheckCircle, Clock,
  ArrowUpRight, Activity, FileText, Plus
} from 'lucide-react';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase, Contract } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface DashboardMetrics {
  totalRevenue: number;
  frozenEscrow: number;
  paidToAgents: number;
  netProfit: number;
  avgRoi: number;
  activeDealsCount: number;
  pendingPayouts: number;
}

export function CEODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalRevenue: 0,
    frozenEscrow: 0,
    paidToAgents: 0,
    netProfit: 0,
    avgRoi: 0,
    activeDealsCount: 0,
    pendingPayouts: 0,
  });
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!user) return;
      setLoading(true);

      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (!companyData) {
          setLoading(false);
          return;
        }

        const { data: contracts } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', companyData.id)
          .order('created_at', { ascending: false });

        if (contracts) {
          calculateMetrics(contracts);
          setActiveContracts(contracts.filter(c => 
            ['ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL', 'PENDING_MANUAL_APPROVAL'].includes(c.status)
          ).slice(0, 5));
        }
      } catch (err) {
        console.error('Error fetching dashboard:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, [user]);

  const calculateMetrics = (contracts: Contract[]) => {
    let revenue = 0, escrow = 0, paid = 0, profit = 0, roiSum = 0, roiCount = 0, activeCount = 0, pendingPayouts = 0;

    contracts.forEach((c) => {
      const rev = c.revenue || c.kpi_revenue || 0;
      const esc = c.escrow_amount || 0;
      const payout = c.agent_payouts_total || 0;
      const prof = c.company_profit || 0;
      const roi = c.roi_percentage || 0;

      if (c.status === 'COMPLETED') {
        revenue += rev;
        paid += payout;
        profit += prof;
        if (roi > 0) { roiSum += roi; roiCount++; }
      } else if (['ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL', 'PENDING_MANUAL_APPROVAL'].includes(c.status)) {
        escrow += esc;
        activeCount++;
      } else if (c.status === 'PENDING_PAYMENT') {
        pendingPayouts += payout;
      }
    });

    setMetrics({
      totalRevenue: revenue,
      frozenEscrow: escrow,
      paidToAgents: paid,
      netProfit: profit,
      avgRoi: roiCount > 0 ? roiSum / roiCount : 0,
      activeDealsCount: activeCount,
      pendingPayouts: pendingPayouts,
    });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount);

  const getStatusBadge = (status: string) => {
    const badges: any = {
      'ACTIVE': { class: 'badge-info', text: t('contract.statuses.ACTIVE') },
      'IN_PROGRESS': { class: 'badge-info', text: t('contract.statuses.IN_PROGRESS') },
      'PENDING_APPROVAL': { class: 'badge-warning', text: t('contract.statuses.PENDING_APPROVAL') },
      'PENDING_MANUAL_APPROVAL': { class: 'badge-warning', text: t('contract.statuses.PENDING_MANUAL_APPROVAL') },
      'COMPLETED': { class: 'badge-success', text: t('contract.statuses.COMPLETED') },
      'DRAFT': { class: 'badge-gray', text: t('contract.statuses.DRAFT') },
    };
    return badges[status] || { class: 'badge-gray', text: status };
  };

  const chartData = [
    { label: 'Выручка', value: metrics.totalRevenue, color: 'bg-[#000052]', width: metrics.totalRevenue > 0 ? '100%' : '5%' },
    { label: 'Escrow', value: metrics.frozenEscrow, color: 'bg-gold', width: metrics.frozenEscrow > 0 ? `${(metrics.frozenEscrow / Math.max(metrics.totalRevenue, 1)) * 100}%` : '5%' },
    { label: 'Выплаты', value: metrics.paidToAgents, color: 'bg-blue-500', width: metrics.paidToAgents > 0 ? `${(metrics.paidToAgents / Math.max(metrics.totalRevenue, 1)) * 100}%` : '5%' },
  ];

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-gray-500">{t('common.loading')}</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#000052] mb-2">
            {t('ceoDashboard.title')}
          </h1>
          <p className="text-gray-600">
            {t('ceoDashboard.subtitle')}
          </p>
        </div>
        <button className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          {t('contracts.createNew')}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <DollarSign className="w-5 h-5 text-[#000052]" />
            <ArrowUpRight className="w-4 h-4 text-green-600" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.totalRevenue)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.totalRevenue')}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Shield className="w-5 h-5 text-gold" />
            <Activity className="w-4 h-4 text-gold" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.frozenEscrow)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.frozenEscrow')}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Users className="w-5 h-5 text-blue-600" />
            <CheckCircle className="w-4 h-4 text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.paidToAgents)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.paidToAgents')}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-5 h-5 text-purple-600" />
            <ArrowUpRight className="w-4 h-4 text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.netProfit)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.netProfit')}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            <TrendingUp className="w-4 h-4 text-indigo-600" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.avgRoi.toFixed(1)}%</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.avgRoi')}</p>
        </div>

        <div className="card">
          <div className="flex items-center justify-between mb-3">
            <Briefcase className="w-5 h-5 text-orange-600" />
            <Clock className="w-4 h-4 text-orange-600" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.activeDealsCount}</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.activeDeals')}</p>
        </div>
      </div>

      {/* Charts & Active Contracts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        {/* CSS Bar Chart */}
        <div className="card">
          <h2 className="text-lg font-semibold text-[#000052] mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-600" />
            {t('ceoDashboard.budgetDistribution')}
          </h2>
          <div className="space-y-6">
            {chartData.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm font-bold text-[#000052]">
                    {formatCurrency(item.value)} ₽
                  </span>
                </div>
                <div className="progress-bar">
                  <div
                    className={`progress-bar-fill ${item.color}`}
                    style={{ width: item.width }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Active Contracts Table */}
        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#000052] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-600" />
              {t('ceoDashboard.activeContracts')}
            </h2>
            <button className="text-sm text-[#000052] hover:text-[#000066] font-medium">
              {t('common.viewAll') || 'Все'} →
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-header">
                <tr>
                  <th>{t('contract.title')}</th>
                  <th>{t('contract.status')}</th>
                  <th className="text-right">{t('contract.escrowAmount')}</th>
                  <th className="text-right">ROI</th>
                </tr>
              </thead>
              <tbody>
                {activeContracts.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-gray-500">
                      {t('dashboard.noActiveContracts')}
                    </td>
                  </tr>
                ) : (
                  activeContracts.map((contract) => {
                    const badge = getStatusBadge(contract.status);
                    return (
                      <tr key={contract.id} className="table-row">
                        <td>
                          <p className="font-medium text-[#000052]">{contract.title}</p>
                          <p className="text-sm text-gray-600 truncate max-w-xs">{contract.description}</p>
                        </td>
                        <td>
                          <span className={`badge ${badge.class}`}>
                            {badge.text}
                          </span>
                        </td>
                        <td className="text-right font-semibold text-[#000052]">
                          {formatCurrency(contract.escrow_amount || 0)} ₽
                        </td>
                        <td className="text-right">
                          <span className={`font-semibold ${contract.roi_percentage && contract.roi_percentage > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {contract.roi_percentage ? `${contract.roi_percentage.toFixed(1)}%` : '-'}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Payouts & Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#000052] mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-600" />
            {t('ceoDashboard.pendingPayouts')}
          </h2>
          {metrics.pendingPayouts > 0 ? (
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
              <span className="text-sm font-medium text-yellow-800">{t('ceoDashboard.totalPending') || 'Ожидают обработки'}</span>
              <span className="text-xl font-bold text-gold">{formatCurrency(metrics.pendingPayouts)} ₽</span>
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-2" />
              <p>{t('ceoDashboard.noPendingPayouts') || 'Все выплаты обработаны'}</p>
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="text-lg font-semibold text-[#000052] mb-4 flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-gray-600" />
            {t('ceoDashboard.alerts') || 'Системные уведомления'}
          </h2>
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg flex items-start gap-3">
            <Activity className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-[#000052]">{t('ceoDashboard.contractHedge') || 'Смарт-контракты активны'}</p>
              <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.hedgeNote')}</p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}