import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, DollarSign, TrendingUp, ShieldCheck, AlertCircle } from 'lucide-react';

export function CEOContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      if (!id) return;
      const { data } = await supabase.from('contracts').select('*').eq('id', id).maybeSingle();
      if (data) setContract(data);
      setLoading(false);
    };
    fetchContract();
  }, [id]);

  if (loading) {
    return <div className="p-8 text-center">{t('common.loading')}</div>;
  }

  if (!contract) {
    return <div className="p-8 text-center text-red-600">Контракт не найден</div>;
  }

  const gmv = contract.revenue || contract.kpi_revenue || 0;
  const platformFee = gmv * 0.12;
  const companyProfitBeforeBonuses = gmv * 0.88;

  // 6 потоков выплат согласно PDF
  const newSalesBonus = gmv * 0.50;
  const renewalBonus = (contract.renewal_amount || 0) * 0.15;
  const crossSellBonus = (contract.cross_sell_amount || 0) * 0.10;
  const planBonus = gmv * 0.10;
  const retentionBonus = gmv * 0.10;
  const annualBonus = gmv * 0.05;

  const totalBonuses = newSalesBonus + renewalBonus + crossSellBonus + planBonus + retentionBonus + annualBonus;
  const companyProfit = companyProfitBeforeBonuses - totalBonuses;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <button onClick={() => navigate('/ceo/contracts')} className="flex items-center text-gray-600 hover:text-[#000052] transition">
        <ArrowLeft className="w-4 h-4 mr-2" />
        Назад к контрактам
      </button>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[#000052]">{contract.title}</h1>
          <p className="text-gray-600 mt-1">{contract.description}</p>
        </div>
        <span className="px-4 py-2 rounded-full text-sm font-semibold bg-blue-100 text-blue-800">
          {t(`contract.statuses.${contract.status}`)}
        </span>
      </div>

      {/* Основные метрики */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">GMV</h3>
            <DollarSign className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${gmv.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Эскроу</h3>
            <ShieldCheck className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${contract.escrow_amount?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-6 rounded-xl shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-sm font-semibold opacity-90">Прибыль компании</h3>
            <TrendingUp className="w-6 h-6 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${companyProfit.toLocaleString()}</p>
        </div>

        <div className="bg-blue-50 border border-blue-200 p-6 rounded-xl">
          <div className="flex items-center gap-2 mb-2">
            <ShieldCheck className="w-6 h-6 text-blue-600" />
            <h3 className="text-sm font-semibold text-[#000052]">Дедлайн</h3>
          </div>
          <p className="text-xl font-bold text-[#000052]">
            {new Date(contract.deadline).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* 6 потоков выплат */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-[#000052] mb-4">6 потоков выплат агенту</h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#000052]"></div>
              <div>
                <p className="font-semibold text-[#000052]">Новые продажи</p>
                <p className="text-xs text-gray-600">50% от GMV</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${newSalesBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-blue-500"></div>
              <div>
                <p className="font-semibold text-[#000052]">Продление</p>
                <p className="text-xs text-gray-600">15% от суммы продления</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${renewalBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
              <div>
                <p className="font-semibold text-[#000052]">Кросс-продажи</p>
                <p className="text-xs text-gray-600">10% от суммы кросс-продаж</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${crossSellBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-green-500"></div>
              <div>
                <p className="font-semibold text-[#000052]">Бонус за выполнение плана</p>
                <p className="text-xs text-gray-600">10% от GMV за 100% выполнение KPI квартала</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${planBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
              <div>
                <p className="font-semibold text-[#000052]">Удержание 90 дней</p>
                <p className="text-xs text-gray-600">10% от GMV, если клиент остается более 90 дней</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${retentionBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-purple-500"></div>
              <div>
                <p className="font-semibold text-[#000052]">Годовой бонус</p>
                <p className="text-xs text-gray-600">5% от GMV, выплачивается 1/12 ежемесячно</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${annualBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-[#B8860B]/10 border border-[#B8860B]/30 rounded-lg mt-4">
            <span className="font-bold text-[#000052]">Итого бонусов в эскроу:</span>
            <span className="text-xl font-bold text-[#B8860B]">${totalBonuses.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Clawback условие */}
      <div className="bg-[#B8860B]/10 border border-[#B8860B]/30 p-6 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-[#B8860B] flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-[#000052] mb-2">Условие Clawback</h3>
            <p className="text-sm text-gray-700">
              Бонус за удержание (${retentionBonus.toLocaleString()}) выплачивается ТОЛЬКО если клиент остается с компанией более 90 дней.
              Если клиент уходит раньше — бонус не выплачивается, что защищает бизнес от фрода.
            </p>
          </div>
        </div>
      </div>

      {/* KPI подсказки */}
      <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200">
        <h2 className="text-xl font-bold text-[#000052] mb-4">KPI подсказки</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500 mb-1">Звонков</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_calls || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500 mb-1">Встреч</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_meetings || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500 mb-1">КП</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_proposals || 0}</p>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg text-center">
            <p className="text-xs text-gray-500 mb-1">Клиентов</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.target_clients || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}