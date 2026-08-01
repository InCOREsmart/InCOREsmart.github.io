import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, TrendingUp, FileText, Target, Briefcase, AlertCircle } from 'lucide-react';

export function AgentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [agentData, setAgentData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Получаем данные агента
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('*')
          .eq('user_id', user.id)
          .maybeSingle();

        if (agentError) {
          console.error('Ошибка при получении данных агента:', agentError);
          setError(agentError.message);
          setLoading(false);
          return;
        }

        if (!agent) {
          setError('Ваш профиль агента не создан. Обратитесь к CEO для назначения.');
          setLoading(false);
          return;
        }

        setAgentData(agent);

        // 2. Получаем контракты, назначенные этому агенту (ТОЛЬКО ЧТЕНИЕ)
        const { data: contractsData, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false });

        if (contractsError) {
          console.error('Ошибка при получении контрактов:', contractsError);
        }

        setContracts(contractsData || []);
      } catch (err) {
        console.error('Критическая ошибка:', err);
        setError('Произошла непредвиденная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchAgentData();
  }, [user]);

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-red-800 mb-2">Ошибка загрузки данных</h3>
              <p className="text-red-700 text-sm mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm"
              >
                Повторить попытку
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const activeContracts = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS' || c.status === 'PENDING_APPROVAL');
  const totalEscrow = contracts.reduce((sum, c) => sum + (c.escrow_amount || 0), 0);
  const totalPayouts = contracts.reduce((sum, c) => sum + (c.agent_payouts_total || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#000052]">{t('agent.dashboardTitle')}</h1>
          {agentData && (
            <p className="text-gray-600 mt-1">{agentData.full_name}</p>
          )}
        </div>
      </div>

      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">{t('agent.activeContracts')}</h3>
            <Briefcase className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">{activeContracts.length}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">{t('agent.escrowBalance')}</h3>
            <DollarSign className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">${totalEscrow.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">{t('agent.pendingPayouts')}</h3>
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">${totalPayouts.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">{t('agent.paymentStreams')}</h3>
            <Target className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-3xl font-bold">6</p>
        </div>
      </div>

      {/* Список контрактов или заглушка */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-[#000052] mb-4">{t('agent.myActiveContracts')}</h2>
        {activeContracts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">{t('agent.noActiveContracts')}</p>
            <p className="text-sm">{t('agent.contractWillAppear') || 'Контракты появятся здесь, когда CEO назначит вас исполнителем.'}</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeContracts.map((contract) => {
              const gmv = contract.revenue || contract.kpi_revenue || 0;
              const platformFee = gmv * 0.12;
              const agentViewAmount = gmv - platformFee;
              const escrow = contract.escrow_amount || 0;

              return (
                <div
                  key={contract.id}
                  onClick={() => navigate(`/agent/contracts/${contract.id}`)}
                  className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer transition"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-semibold text-[#000052]">{contract.title}</h3>
                    <span className="px-3 py-1 rounded-full text-xs bg-blue-100 text-blue-800">
                      {t(`contract.statuses.${contract.status}`)}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Сумма (за вычетом 12% платформы)</p>
                      <p className="font-semibold text-[#000052]">${agentViewAmount.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Эскроу (ваши бонусы)</p>
                      <p className="font-semibold text-[#B8860B]">${escrow.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Дедлайн</p>
                      <p className="font-semibold text-[#000052]">{new Date(contract.deadline).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">KPI подсказки</p>
                      <p className="font-semibold text-[#000052]">
                        {contract.kpi_calls || 0} звонков, {contract.kpi_meetings || 0} встреч
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
        <h3 className="text-lg font-bold text-[#000052] mb-2">{t('agent.smartContractStatus')}</h3>
        <p className="text-blue-700">{t('agent.fundsVerified')}</p>
      </div>
    </div>
  );
}