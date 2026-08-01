import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Briefcase, TrendingUp, AlertCircle } from 'lucide-react';

export function AgentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [contracts, setContracts] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchAgentData = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
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

  const activeContracts = contracts.filter(c => 
    c.status === 'ACTIVE' || c.status === 'IN_PROGRESS' || c.status === 'PENDING_APPROVAL'
  );
  const totalEscrow = contracts.reduce((sum, c) => sum + (c.escrow_amount || 0), 0);

  // Расчет прогресса годового бонуса (1/12 каждый месяц)
  const totalAnnualBonus = contracts.reduce((sum, c) => {
    const createdAt = new Date(c.created_at);
    const now = new Date();
    const monthsPassed = Math.min(12, Math.max(0, 
      (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()) + 1
    ));
    const annualBonus = c.annual_bonus || 0;
    const monthlyPayout = annualBonus / 12;
    return sum + (monthlyPayout * monthsPassed);
  }, 0);
  const maxAnnualBonus = contracts.reduce((sum, c) => sum + (c.annual_bonus || 0), 0);
  const annualProgress = maxAnnualBonus > 0 ? Math.min(100, (totalAnnualBonus / maxAnnualBonus) * 100) : 0;

  return (
    <div className="p-6 space-y-6">
      {/* KPI карточки */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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

        <div className="bg-gradient-to-br from-purple-600 to-purple-700 text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold opacity-90">Годовой бонус</h3>
            <TrendingUp className="w-8 h-8 opacity-80" />
          </div>
          <p className="text-2xl font-bold mb-2">${totalAnnualBonus.toLocaleString()}</p>
          <div className="w-full bg-white/20 rounded-full h-2 mb-1">
            <div 
              className="bg-white h-2 rounded-full transition-all duration-500"
              style={{ width: `${annualProgress}%` }}
            ></div>
          </div>
          <p className="text-xs opacity-80">
            {annualProgress.toFixed(0)}% от ${maxAnnualBonus.toLocaleString()}
          </p>
        </div>
      </div>

      {/* Список контрактов */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-[#000052] mb-4">{t('agent.myActiveContracts')}</h2>
        {activeContracts.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <Briefcase className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <p className="text-lg font-medium mb-2">{t('agent.noActiveContracts')}</p>
            <p className="text-sm">Контракты появятся здесь, когда CEO назначит вас исполнителем.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {activeContracts.map((contract) => {
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
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-500">Эскроу</p>
                      <p className="font-semibold text-[#B8860B]">${escrow.toLocaleString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">Дедлайн</p>
                      <p className="font-semibold text-[#000052]">{new Date(contract.deadline).toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-gray-500">KPI</p>
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