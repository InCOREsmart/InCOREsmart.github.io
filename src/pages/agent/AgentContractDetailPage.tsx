import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, DollarSign, ShieldCheck, AlertCircle, CheckCircle } from 'lucide-react';
import { ContractStatusBadge } from '../../components/ui/ContractStatusBadge';

export function AgentContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [accepting, setAccepting] = useState(false);

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

  const handleAcceptContract = async () => {
    if (!contract) return;
    setAccepting(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'ACTIVE' })
        .eq('id', contract.id);

      if (error) throw error;

      setContract({ ...contract, status: 'ACTIVE' });
      alert('✅ Контракт принят! Смарт-контракт активирован, KPI начали считаться.');
    } catch (err: any) {
      console.error('Ошибка принятия контракта:', err);
      alert('Ошибка при принятии контракта: ' + err.message);
    } finally {
      setAccepting(false);
    }
  };

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

  const escrow = contract.escrow_amount || 0;
  const gmv = contract.revenue || contract.kpi_revenue || 0;
  const newSalesBonus = gmv * 0.10; // 10% от GMV
  const retentionBonus = 200; // Фиксированный бонус за удержание
  const annualBonus = contract.annual_bonus || 0;

  // Расчет прогресса годового бонуса
  const createdAt = new Date(contract.created_at);
  const now = new Date();
  const monthsPassed = Math.min(12, Math.max(0, 
    (now.getFullYear() - createdAt.getFullYear()) * 12 + (now.getMonth() - createdAt.getMonth()) + 1
  ));
  const annualProgress = annualBonus > 0 ? (monthsPassed / 12) * 100 : 0;
  const annualAccumulated = (annualBonus / 12) * monthsPassed;

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/agent/contracts')} className="flex items-center text-gray-600 hover:text-[#000052] transition mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к контрактам
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[#000052]">{contract.title}</h1>
        </div>
        <ContractStatusBadge status={contract.status} />
      </div>

      {/* Финансовые показатели */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#B8860B]/10 p-4 rounded-xl border border-[#B8860B]/30 shadow-sm">
          <p className="text-xs text-[#B8860B] mb-1">Эскроу</p>
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
          <h3 className="text-lg font-bold text-[#000052]">Структура ваших бонусов</h3>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Новые продажи (10%)</span>
            <span className="font-semibold text-[#000052]">${newSalesBonus.toLocaleString()}</span>
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
            <span className="text-sm text-gray-700">Бонус за выполнение плана</span>
            <span className="font-semibold text-[#000052]">$200</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#B8860B]/10 rounded-lg border border-[#B8860B]/30">
            <div>
              <span className="text-sm font-semibold text-[#000052]">Бонус за удержание</span>
              <p className="text-xs text-gray-600 mt-1">Выплачивается, если клиент остается более 90 дней</p>
            </div>
            <span className="font-semibold text-[#B8860B]">${retentionBonus}</span>
          </div>
        </div>
      </div>

      {/* Годовой бонус с прогресс-баром */}
      {annualBonus > 0 && (
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-6 rounded-xl border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-[#000052]">Годовой бонус</h3>
            <span className="text-sm text-purple-700">
              {monthsPassed} из 12 месяцев
            </span>
          </div>
          <div className="w-full bg-white rounded-full h-4 mb-2 overflow-hidden">
            <div 
              className="bg-gradient-to-r from-purple-500 to-purple-700 h-4 rounded-full transition-all duration-500 flex items-center justify-end pr-2"
              style={{ width: `${annualProgress}%` }}
            >
              {annualProgress > 15 && (
                <span className="text-xs text-white font-bold">{annualProgress.toFixed(0)}%</span>
              )}
            </div>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Накоплено: ${annualAccumulated.toLocaleString()}</span>
            <span className="font-semibold text-[#000052]">Максимум: ${annualBonus.toLocaleString()}</span>
          </div>
        </div>
      )}

      {/* KPI Подсказки */}
      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-lg font-bold text-[#000052] mb-4">KPI подсказки для выполнения плана</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">Звонков</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_calls || 0}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">Встреч</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_meetings || 0}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">КП</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_proposals || 0}</p>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500">Клиентов</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.target_clients || 0}</p>
          </div>
        </div>
      </div>

      {/* Кнопка принятия контракта */}
      {contract.status === 'PENDING_APPROVAL' && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#000052] mb-1">Контракт ожидает вашего подтверждения</h3>
              <p className="text-sm text-gray-600">Нажмите кнопку ниже, чтобы активировать смарт-контракт и начать выполнение KPI</p>
            </div>
            <button
              onClick={handleAcceptContract}
              disabled={accepting}
              className="px-6 py-3 bg-[#B8860B] hover:bg-[#9a7209] text-white font-semibold rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {accepting ? 'Принятие...' : 'Принять контракт'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}