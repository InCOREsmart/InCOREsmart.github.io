import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, Users, Target, Briefcase, ShieldCheck, Percent, ArrowRight } from 'lucide-react';

export function CEODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    frozenEscrow: 0,
    paidToAgents: 0,
    netProfit: 0,
    avgRoi: 0,
    activeContracts: 0,
    pendingPayouts: 0,
    salesGoalAchievement: 0,
    funnelConversion: 0,
    revenuePerAgent: 0,
  });
  const [agents, setAgents] = useState<any[]>([]);
  const [contracts, setContracts] = useState<any[]>([]);

  useEffect(() => {
    const fetchMetrics = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

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

        // Получаем контракты компании
        const { data: contractsData } = await supabase
          .from('contracts')
          .select('*')
          .eq('company_id', companyData.id);

        setContracts(contractsData || []);

        // Получаем агентов компании
        const { data: agentsData } = await supabase
          .from('agents')
          .select('*')
          .eq('company_id', companyData.id)
          .eq('status', 'ACTIVE');

        setAgents(agentsData || []);

        // Расчет метрик
        const totalRevenue = (contractsData || []).reduce((sum, c) => sum + (c.revenue || c.kpi_revenue || 0), 0);
        const frozenEscrow = (contractsData || []).reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
        const paidToAgents = (contractsData || []).reduce((sum, c) => sum + (c.agent_payouts_total || 0), 0);
        const netProfit = (contractsData || []).reduce((sum, c) => sum + (c.company_profit || 0), 0);
        const avgRoi = contractsData && contractsData.length > 0
          ? (contractsData || []).reduce((sum, c) => sum + (c.roi_percentage || 0), 0) / contractsData.length
          : 0;
        const activeContracts = (contractsData || []).filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length;
        const pendingPayouts = (contractsData || []).filter(c => c.status === 'PENDING_PAYMENT').length;

        // Новые метрики
        // 1. Процент достижения целей по продажам
        const totalPlannedRevenue = (contractsData || []).reduce((sum, c) => sum + (c.kpi_revenue || 0), 0);
        const actualRevenue = (contractsData || []).filter(c => c.status === 'COMPLETED').reduce((sum, c) => sum + (c.revenue || 0), 0);
        const salesGoalAchievement = totalPlannedRevenue > 0 ? (actualRevenue / totalPlannedRevenue) * 100 : 0;

        // 2. Конверсия воронки продаж (от первого контакта до сделки)
        const totalCalls = (contractsData || []).reduce((sum, c) => sum + (c.kpi_calls || 0), 0);
        const completedDeals = (contractsData || []).filter(c => c.status === 'COMPLETED').length;
        const funnelConversion = totalCalls > 0 ? (completedDeals / totalCalls) * 100 : 0;

        // 3. Выручка на каждого агента
        const revenuePerAgent = agentsData && agentsData.length > 0 ? totalRevenue / agentsData.length : 0;

        setMetrics({
          totalRevenue,
          frozenEscrow,
          paidToAgents,
          netProfit,
          avgRoi,
          activeContracts,
          pendingPayouts,
          salesGoalAchievement,
          funnelConversion,
          revenuePerAgent,
        });
      } catch (err) {
        console.error('Ошибка загрузки метрик:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-[#000052]">{t('ceoDashboard.title')}</h1>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">{t('ceoDashboard.totalRevenue')}</h3>
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">${metrics.totalRevenue.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">{t('ceoDashboard.frozenEscrow')}</h3>
            <ShieldCheck className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">${metrics.frozenEscrow.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">{t('ceoDashboard.paidToAgents')}</h3>
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">${metrics.paidToAgents.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">{t('ceoDashboard.netProfit')}</h3>
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">${metrics.netProfit.toLocaleString()}</p>
        </div>

        {/* Новые метрики */}
        <div className="bg-gradient-to-br from-green-500 to-green-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Достижение целей</h3>
            <Target className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{metrics.salesGoalAchievement.toFixed(1)}%</p>
          <p className="text-xs opacity-80 mt-1">Плановая выручка выполнена</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-blue-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Конверсия воронки</h3>
            <ArrowRight className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{metrics.funnelConversion.toFixed(1)}%</p>
          <p className="text-xs opacity-80 mt-1">От контакта до сделки</p>
        </div>

        <div className="bg-gradient-to-br from-purple-500 to-purple-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Выручка на агента</h3>
            <Users className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">${metrics.revenuePerAgent.toLocaleString()}</p>
          <p className="text-xs opacity-80 mt-1">Средняя на {agents.length} агентов</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-orange-600 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Средний ROI</h3>
            <Percent className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{metrics.avgRoi.toFixed(1)}%</p>
          <p className="text-xs opacity-80 mt-1">Возврат инвестиций</p>
        </div>
      </div>

      {/* Активные контракты */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-[#000052]">{t('ceoDashboard.activeContracts')}</h2>
          <button
            onClick={() => navigate('/ceo/contracts')}
            className="text-[#B8860B] hover:underline text-sm font-medium"
          >
            {t('common.viewAll')}
          </button>
        </div>
        {contracts.filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Briefcase className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{t('dashboard.noActiveContracts')}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Название</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Агент</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Эскроу</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Дедлайн</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-gray-700">Статус</th>
                </tr>
              </thead>
              <tbody>
                {contracts
                  .filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS')
                  .slice(0, 5)
                  .map((contract) => {
                    const agent = agents.find(a => a.id === contract.agent_id);
                    return (
                      <tr
                        key={contract.id}
                        onClick={() => navigate(`/ceo/contracts/${contract.id}`)}
                        className="border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition"
                      >
                        <td className="py-3 px-4 text-sm text-[#000052] font-medium">{contract.title}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{agent?.full_name || 'Не назначен'}</td>
                        <td className="py-3 px-4 text-sm text-[#B8860B] font-semibold">${(contract.escrow_amount || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-sm text-gray-600">{new Date(contract.deadline).toLocaleDateString()}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                            {t(`contract.statuses.${contract.status}`)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}