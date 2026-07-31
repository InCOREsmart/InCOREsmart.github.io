import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, Target, DollarSign, ShieldCheck, AlertCircle } from 'lucide-react';
import { ContractStatusBadge } from '../../components/ui/ContractStatusBadge';

export function AgentContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchContract = async () => {
      if (!user || !id) {
        setLoading(false);
        return;
      }

      try {
        const { data, error: fetchError } = await supabase
          .from('contracts')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (fetchError) {
          console.error('Ошибка загрузки контракта:', fetchError);
          setError(fetchError.message);
        } else if (!data) {
          setError('Контракт не найден');
        } else {
          setContract(data);
        }
      } catch (err) {
        console.error('Критическая ошибка:', err);
        setError('Произошла непредвиденная ошибка');
      } finally {
        setLoading(false);
      }
    };

    fetchContract();
  }, [user, id]);

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  if (error || !contract) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-6">
          <h3 className="text-lg font-bold text-red-800 mb-2">{t('common.error')}</h3>
          <p className="text-red-700 text-sm mb-4">{error || 'Контракт не найден'}</p>
          <button onClick={() => navigate('/agent/contracts')} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition text-sm">
            {t('common.cancel')}
          </button>
        </div>
      </div>
    );
  }

  const gmv = contract.revenue || contract.kpi_revenue || 0;
  const platformFee = gmv * 0.12;
  const agentViewAmount = gmv - platformFee;
  const escrow = contract.escrow_amount || 0;
  const companyProfit = contract.company_profit || 0;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/agent/contracts')} className="flex items-center text-gray-600 hover:text-[#000052] transition mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        {t('common.back') || 'Назад к контрактам'}
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#000052]">{contract.title}</h1>
          {contract.description && (
            <p className="text-gray-500 text-sm mt-1">{contract.description}</p>
          )}
        </div>
        <ContractStatusBadge status={contract.status} />
      </div>

      {/* Финансовые показатели */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Сумма контракта (за вычетом 12% платформы)</p>
          <p className="text-xl font-bold text-[#000052]">${agentViewAmount.toLocaleString()}</p>
        </div>
        <div className="bg-[#B8860B]/10 p-4 rounded-xl border border-[#B8860B]/30 shadow-sm">
          <p className="text-xs text-[#B8860B] mb-1">Эскроу (Ваши бонусы)</p>
          <p className="text-xl font-bold text-[#B8860B]">${escrow.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <p className="text-xs text-gray-500 mb-1">Дедлайн</p>
          <p className="text-xl font-bold text-[#000052]">{new Date(contract.deadline).toLocaleDateString()}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200 shadow-sm">
          <p className="text-xs text-blue-700 mb-1">Статус смарт-контракта</p>
          <p className="text-sm font-semibold text-blue-800 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> {t('agent.fundsVerified')}
          </p>
        </div>
      </div>

      {/* Структура бонусов */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <DollarSign className="w-5 h-5 text-[#B8860B]" />
          <h3 className="text-lg font-bold text-[#000052]">Структура ваших бонусов (Эскроу)</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Новые продажи (10% от GMV)</span>
            <span className="font-semibold text-[#000052]">${(gmv * 0.10).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Продление (3% от суммы)</span>
            <span className="font-semibold text-[#000052]">По факту</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Кросс-продажи (7% от суммы)</span>
            <span className="font-semibold text-[#000052]">По факту</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Годовой бонус (1/12 ежемесячно)</span>
            <span className="font-semibold text-[#000052]">По факту</span>
          </div>
        </div>
      </div>

      {/* Условие удержания */}
      <div className="bg-[#B8860B]/10 border border-[#B8860B]/30 p-4 rounded-xl flex items-start gap-3">
        <AlertCircle className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-[#000052]">Условие удержания (Clawback)</p>
          <p className="text-xs text-gray-700 mt-1">
            Бонус за удержание выплачивается ТОЛЬКО если клиент остается с компанией более 90 дней.
          </p>
        </div>
      </div>

      {/* Прибыль компании */}
      <div className="bg-green-50 border border-green-200 p-4 rounded-xl">
        <div className="flex justify-between items-center">
          <span className="text-sm font-semibold text-[#000052]">Прибыль компании</span>
          <span className="font-bold text-green-600 text-lg">${companyProfit.toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
}