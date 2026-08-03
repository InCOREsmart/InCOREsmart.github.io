import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { ArrowLeft, DollarSign, ShieldCheck, CheckCircle, Clock } from 'lucide-react';

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
          setError(fetchError.message);
        } else if (!data) {
          setError('Контракт не найден');
        } else {
          setContract(data);
        }
      } catch (err) {
        setError('Произошла ошибка');
      } finally {
        setLoading(false);
      }
    };
    fetchContract();
  }, [user, id]);

  const handleAccept = async () => {
    if (!contract) return;
    setAccepting(true);
    try {
      const { error } = await supabase
        .from('contracts')
        .update({ status: 'ACTIVE' })
        .eq('id', contract.id);

      if (error) throw error;
      setContract({ ...contract, status: 'ACTIVE' });
      alert('✅ Контракт принят! Смарт-контракт активирован.');
    } catch (err: any) {
      alert('Ошибка: ' + err.message);
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
          <h3 className="text-lg font-bold text-red-800 mb-2">Ошибка</h3>
          <p className="text-red-700 text-sm mb-4">{error || 'Контракт не найден'}</p>
          <button onClick={() => navigate('/agent/contracts')} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">
            Назад
          </button>
        </div>
      </div>
    );
  }

  const gmv = contract.revenue || contract.kpi_revenue || 0;
  const escrow = contract.escrow_amount || 0;

  const newSales = gmv * 0.50;
  const renewal = gmv * 0.15;
  const crossSell = gmv * 0.10;
  const planBonus = gmv * 0.10;
  const retention = gmv * 0.10;
  const annual = gmv * 0.05;

  const deadlineDate = new Date(contract.deadline);
  const now = new Date();
  const daysLeft = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const isExpired = daysLeft <= 0;
  const isCompleted = contract.status === 'COMPLETED';

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <button onClick={() => navigate('/agent/contracts')} className="flex items-center text-gray-600 hover:text-[#000052] transition mb-4">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к контрактам
      </button>

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#000052]">{contract.title}</h1>
        <span className={`px-4 py-2 rounded-full text-sm font-semibold ${
          isCompleted ? 'bg-green-100 text-green-800' :
          isExpired ? 'bg-red-100 text-red-800' :
          'bg-blue-100 text-blue-800'
        }`}>
          {isCompleted ? 'Завершен' : isExpired ? 'Дедлайн истек' : t(`contract.statuses.${contract.status}`)}
        </span>
      </div>

      {/* Блок дедлайна */}
      <div className={`p-4 rounded-xl border ${isExpired ? 'bg-red-50 border-red-200' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center gap-3">
          <Clock className={`w-6 h-6 ${isExpired ? 'text-red-600' : 'text-blue-600'}`} />
          <div>
            <p className="font-semibold text-[#000052]">
              {isExpired ? 'Дедлайн истек — контракт автоматически закрыт' : `До дедлайна: ${daysLeft} дней`}
            </p>
            <p className="text-sm text-gray-600">
              Дата закрытия: {deadlineDate.toLocaleDateString('ru-RU')}
            </p>
          </div>
        </div>
      </div>

      {/* 3 карточки */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-[#B8860B]/10 p-4 rounded-xl border border-[#B8860B]/30">
          <p className="text-xs text-[#B8860B] mb-1">Эскроу</p>
          <p className="text-xl font-bold text-[#B8860B]">${escrow.toLocaleString()}</p>
        </div>
        <div className="bg-white p-4 rounded-xl border border-gray-200">
          <p className="text-xs text-gray-500 mb-1">GMV</p>
          <p className="text-xl font-bold text-[#000052]">${gmv.toLocaleString()}</p>
        </div>
        <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
          <p className="text-xs text-blue-700 mb-1">Смарт-контракт</p>
          <p className="text-sm font-semibold text-blue-800 flex items-center gap-1">
            <ShieldCheck className="w-4 h-4" /> {t('agent.fundsVerified')}
          </p>
        </div>
      </div>

      {/* 6 потоков */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#B8860B]" />
          6 потоков выплат
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Новые продажи (50%)</span>
            <span className="font-semibold text-[#000052]">${newSales.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Продление (15%)</span>
            <span className="font-semibold text-[#000052]">${renewal.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Кросс-продажи (10%)</span>
            <span className="font-semibold text-[#000052]">${crossSell.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Бонус за план (10%)</span>
            <span className="font-semibold text-[#000052]">${planBonus.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-[#B8860B]/10 rounded-lg border border-[#B8860B]/30">
            <div>
              <span className="text-sm font-semibold text-[#000052]">Удержание 90 дней (10%)</span>
              <p className="text-xs text-gray-600 mt-1">Выплачивается только если клиент остается более 90 дней</p>
            </div>
            <span className="font-semibold text-[#B8860B]">${retention.toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-sm text-gray-700">Годовой бонус (5%)</span>
            <span className="font-semibold text-[#000052]">${annual.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* KPI */}
      <div className="bg-white p-6 rounded-xl border border-gray-200">
        <h3 className="text-lg font-bold text-[#000052] mb-4">KPI</h3>
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

      {/* Кнопка "Принять" */}
      {contract.status === 'PENDING_APPROVAL' && !isExpired && (
        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-[#000052] mb-1">Контракт ожидает подтверждения</h3>
              <p className="text-sm text-gray-600">Нажмите «Принять», чтобы активировать смарт-контракт</p>
            </div>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="px-8 py-3 bg-[#B8860B] hover:bg-[#9a7209] text-white font-semibold rounded-lg transition flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle className="w-5 h-5" />
              {accepting ? '...' : 'Принять'}
            </button>
          </div>
        </div>
      )}

      {/* Автоматическое закрытие */}
      {(isExpired || isCompleted) && (
        <div className="bg-green-50 border border-green-200 p-6 rounded-xl">
          <div className="flex items-start gap-3">
            <CheckCircle className="w-6 h-6 text-green-600 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-lg font-bold text-[#000052] mb-2">
                {isCompleted ? 'Контракт завершен' : 'Контракт автоматически закрыт по дедлайну'}
              </h3>
              <p className="text-sm text-gray-700">
                Смарт-контракт выполнил расчет и разблокировал средства. 
                Выплата ${escrow.toLocaleString()} будет переведена на ваши реквизиты в течение 24 часов.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}