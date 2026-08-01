import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { FileText, Clock, DollarSign, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

export function AgentContractsPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [contracts, setContracts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContracts = async () => {
      if (!user) {
        setLoading(false);
        return;
      }

      try {
        // 1. Сначала получаем ID записи агента (так как agent_id в contracts ссылается на agents.id, а не напрямую на user.id)
        const { data: agent, error: agentError } = await supabase
          .from('agents')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (agentError || !agent) {
          setError('Профиль агента не найден. Обратитесь к CEO.');
          setLoading(false);
          return;
        }

        // 2. Получаем контракты, назначенные этому агенту (ТОЛЬКО ЧТЕНИЕ, без попыток insert)
        const { data, error: contractsError } = await supabase
          .from('contracts')
          .select('*')
          .eq('agent_id', agent.id)
          .order('created_at', { ascending: false });

        if (contractsError) {
          console.error('Ошибка загрузки контрактов:', contractsError);
          setError(contractsError.message);
        } else {
          setContracts(data || []);
        }
      } catch (err) {
        console.error('Критическая ошибка:', err);
        setError('Произошла непредвиденная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchContracts();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="ml-3 text-[#000052]">{t('common.loading')}</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 border border-red-200 rounded-xl text-red-700">
        <div className="flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          <span>{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-[#000052]">{t('contracts.title')}</h1>
      </div>

      {contracts.length === 0 ? (
        <div className="bg-white p-12 rounded-xl border border-gray-200 flex flex-col items-center justify-center text-center">
          <FileText className="w-16 h-16 text-gray-300 mb-4" />
          <h3 className="text-lg font-semibold text-[#000052] mb-2">
            {t('agent.noActiveContracts')}
          </h3>
          <p className="text-gray-500 max-w-md">
            {t('agent.contractWillAppear') || 'Контракты появятся здесь, когда CEO назначит вас исполнителем.'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {contracts.map((contract) => {
            const gmv = contract.revenue || contract.kpi_revenue || 0;
            const platformFee = gmv * 0.12;
            const agentViewAmount = gmv - platformFee;
            const escrow = contract.escrow_amount || 0;

            return (
              <div 
                key={contract.id} 
                onClick={() => navigate(`/agent/contracts/${contract.id}`)}
                className="bg-white p-6 rounded-xl border border-gray-200 hover:shadow-lg hover:border-[#B8860B]/30 transition-all cursor-pointer"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="p-2 bg-[#B8860B]/10 rounded-lg">
                    <FileText className="w-5 h-5 text-[#B8860B]" />
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                    contract.status === 'ACTIVE' || contract.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                    contract.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                    contract.status === 'PENDING_APPROVAL' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {t(`contract.statuses.${contract.status}`) || contract.status}
                  </span>
                </div>
                
                <h3 className="text-lg font-semibold text-[#000052] mb-2 line-clamp-2">
                  {contract.title}
                </h3>
                
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {contract.description}
                </p>

                <div className="space-y-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <DollarSign className="w-4 h-4" />
                      <span>Сумма (за вычетом 12%)</span>
                    </div>
                    <span className="font-semibold text-[#000052]">
                      ${agentViewAmount.toLocaleString()}
                    </span>
                  </div>
                  
                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <DollarSign className="w-4 h-4 text-[#B8860B]" />
                      <span>Эскроу (бонусы)</span>
                    </div>
                    <span className="font-semibold text-[#B8860B]">
                      ${escrow.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2 text-gray-500">
                      <Clock className="w-4 h-4" />
                      <span>{t('contract.deadline')}</span>
                    </div>
                    <span className="text-[#000052]">
                      {new Date(contract.deadline).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}