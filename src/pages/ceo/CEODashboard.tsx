import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { DollarSign, TrendingUp, Shield, Users, Briefcase, BarChart3, CheckCircle, Clock, ArrowUpRight, Activity, Plus, AlertCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { DashboardLayout } from '../../components/layouts/DashboardLayout';
import { supabase, Contract } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { CreateContractModal } from '../../components/ui/CreateContractModal';

export function CEODashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [metrics, setMetrics] = useState({ totalRevenue: 0, frozenEscrow: 0, paidToAgents: 0, netProfit: 0, avgRoi: 0, activeDealsCount: 0, pendingPayouts: 0 });
  const [activeContracts, setActiveContracts] = useState<Contract[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showCompanyAlert, setShowCompanyAlert] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      if (!user) return;
      try {
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyData) {
          setCompanyId(companyData.id);
          const { data: contracts } = await supabase.from('contracts').select('*').eq('company_id', companyData.id).order('created_at', { ascending: false });
          if (contracts) {
            calculateMetrics(contracts);
            setActiveContracts(contracts.filter(c => ['ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL', 'PENDING_MANUAL_APPROVAL'].includes(c.status)).slice(0, 5));
          }
        }
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const calculateMetrics = (contracts: Contract[]) => {
    let revenue = 0, escrow = 0, paid = 0, profit = 0, roiSum = 0, roiCount = 0, activeCount = 0, pendingPayouts = 0;
    contracts.forEach((c) => {
      const rev = c.revenue || c.kpi_revenue || 0;
      if (c.status === 'COMPLETED') {
        revenue += rev; paid += (c.agent_payouts_total || 0); profit += (c.company_profit || 0);
        if ((c.roi_percentage || 0) > 0) { roiSum += (c.roi_percentage || 0); roiCount++; }
      } else if (['ACTIVE', 'IN_PROGRESS', 'PENDING_APPROVAL', 'PENDING_MANUAL_APPROVAL'].includes(c.status)) {
        escrow += (c.escrow_amount || 0); activeCount++;
      } else if (c.status === 'PENDING_PAYMENT') {
        pendingPayouts += (c.agent_payouts_total || 0);
      }
    });
    setMetrics({ totalRevenue: revenue, frozenEscrow: escrow, paidToAgents: paid, netProfit: profit, avgRoi: roiCount > 0 ? roiSum / roiCount : 0, activeDealsCount: activeCount, pendingPayouts });
  };

  const formatCurrency = (amount: number) => new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 }).format(amount);

  const handleCreateClick = () => {
    if (companyId) {
      setIsModalOpen(true);
    } else {
      setShowCompanyAlert(true);
    }
  };

  if (loading) return <DashboardLayout><div className="p-8 text-[#000052]">{t('common.loading')}</div></DashboardLayout>;

  const chartData = [
    { label: 'Выручка', value: metrics.totalRevenue, color: 'bg-[#000052]', width: metrics.totalRevenue > 0 ? '100%' : '5%' },
    { label: 'Escrow', value: metrics.frozenEscrow, color: 'bg-yellow-500', width: metrics.frozenEscrow > 0 ? `${(metrics.frozenEscrow / Math.max(metrics.totalRevenue, 1)) * 100}%` : '5%' },
    { label: 'Выплаты', value: metrics.paidToAgents, color: 'bg-blue-500', width: metrics.paidToAgents > 0 ? `${(metrics.paidToAgents / Math.max(metrics.totalRevenue, 1)) * 100}%` : '5%' },
  ];

  return (
    <DashboardLayout>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#000052]">{t('ceoDashboard.title')}</h1>
        <button onClick={handleCreateClick} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" /> {t('contracts.createNew')}
        </button>
      </div>

      {/* Alert для отсутствия компании */}
      {showCompanyAlert && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">Для создания контракта сначала заполните данные компании в настройках.</span>
          </div>
          <button onClick={() => navigate('/settings')} className="text-sm font-semibold text-[#000052] underline">Перейти в настройки</button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 mb-8">
        <div className="card">
          <div className="flex items-center justify-between mb-3"><DollarSign className="w-5 h-5 text-[#000052]" /><ArrowUpRight className="w-4 h-4 text-green-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.totalRevenue)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.totalRevenue')}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3"><Shield className="w-5 h-5 text-yellow-600" /><Activity className="w-4 h-4 text-yellow-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.frozenEscrow)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.frozenEscrow')}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3"><Users className="w-5 h-5 text-blue-600" /><CheckCircle className="w-4 h-4 text-blue-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.paidToAgents)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.paidToAgents')}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3"><TrendingUp className="w-5 h-5 text-purple-600" /><ArrowUpRight className="w-4 h-4 text-purple-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{formatCurrency(metrics.netProfit)} ₽</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.netProfit')}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3"><BarChart3 className="w-5 h-5 text-indigo-600" /><TrendingUp className="w-4 h-4 text-indigo-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.avgRoi.toFixed(1)}%</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.avgRoi')}</p>
        </div>
        <div className="card">
          <div className="flex items-center justify-between mb-3"><Briefcase className="w-5 h-5 text-orange-600" /><Clock className="w-4 h-4 text-orange-600" /></div>
          <p className="text-2xl font-bold text-[#000052]">{metrics.activeDealsCount}</p>
          <p className="text-xs text-gray-600 mt-1">{t('ceoDashboard.activeDeals')}</p>
        </div>
      </div>

      {/* Charts & Active Contracts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
        <div className="card">
          <h2 className="text-lg font-semibold text-[#000052] mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-gray-600" /> {t('ceoDashboard.budgetDistribution')}
          </h2>
          <div className="space-y-6">
            {chartData.map((item) => (
              <div key={item.label}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-gray-700">{item.label}</span>
                  <span className="text-sm font-bold text-[#000052]">{formatCurrency(item.value)} ₽</span>
                </div>
                <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
                  <div className={`h-full ${item.color} rounded-full transition-all duration-500`} style={{ width: item.width }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="card lg:col-span-2">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-[#000052] flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-gray-600" /> {t('ceoDashboard.activeContracts')}
            </h2>
            <button onClick={() => navigate('/ceo/contracts')} className="text-sm font-semibold text-[#000052] hover:underline">
              {t('common.viewAll')}
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{t('contract.title')}</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{t('contract.status')}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">{t('contract.escrowAmount')}</th>
                  <th className="text-right py-3 px-4 text-xs font-semibold text-gray-600 uppercase">ROI</th>
                </tr>
              </thead>
              <tbody>
                {activeContracts.length === 0 ? (
                  <tr><td colSpan={4} className="py-8 text-center text-gray-500">{t('contract.noContracts')}</td></tr>
                ) : (
                  activeContracts.map((contract) => (
                    <tr key={contract.id} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-3 px-4"><p className="font-medium text-[#000052]">{contract.title}</p></td>
                      <td className="py-3 px-4"><span className="badge badge-info">{t(`contract.statuses.${contract.status}`) || contract.status}</span></td>
                      <td className="py-3 px-4 text-right font-semibold text-[#000052]">{formatCurrency(contract.escrow_amount || 0)} ₽</td>
                      <td className="py-3 px-4 text-right font-semibold text-green-600">{contract.roi_percentage ? `${contract.roi_percentage.toFixed(1)}%` : '-'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Pending Payouts */}
      <div className="card">
        <h2 className="text-lg font-semibold text-[#000052] mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-gray-600" /> {t('ceoDashboard.pendingPayouts')}
        </h2>
        {metrics.pendingPayouts > 0 ? (
          <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg flex items-center justify-between">
            <span className="text-sm font-medium text-yellow-800">{t('ceoDashboard.totalPending')}</span>
            <span className="text-xl font-bold text-yellow-700">{formatCurrency(metrics.pendingPayouts)} ₽</span>
          </div>
        ) : (
          <div className="text-center py-6 text-gray-500 flex items-center justify-center gap-2">
            <CheckCircle className="w-5 h-5 text-green-500" /> {t('ceoDashboard.noPendingPayouts')}
          </div>
        )}
      </div>

      <CreateContractModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onCreated={() => { setIsModalOpen(false); window.location.reload(); }} />
    </DashboardLayout>
  );
}