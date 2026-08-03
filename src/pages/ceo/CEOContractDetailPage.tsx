import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { ArrowLeft, DollarSign, TrendingUp, ShieldCheck, AlertCircle, Download, Users, Target, Clock } from 'lucide-react';

export function CEOContractDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [contract, setContract] = useState<any>(null);
  const [agent, setAgent] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchContract = async () => {
      if (!id) return;
      const { data } = await supabase.from('contracts').select('*').eq('id', id).maybeSingle();
      if (data) {
        setContract(data);
        if (data.agent_id) {
          const { data: agentData } = await supabase.from('agents').select('*').eq('id', data.agent_id).maybeSingle();
          setAgent(agentData);
        }
      }
      setLoading(false);
    };
    fetchContract();
  }, [id]);

  const handleExportPDF = () => {
    alert('Генерация PDF-отчета по сделке для Совета Директоров...\n(В демо-режиме это имитация скачивания файла)');
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-[#000052]">
        <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-[#B8860B]"></div>
        <p className="mt-2">{t('common.loading')}</p>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="bg-[#000052]/5 border border-[#000052]/10 rounded-xl p-6">
          <h3 className="text-lg font-bold text-[#000052] mb-2">Контракт не найден</h3>
          <button onClick={() => navigate('/ceo/contracts')} className="px-4 py-2 bg-[#000052] text-white rounded-lg text-sm">
            Назад к контрактам
          </button>
        </div>
      </div>
    );
  }

  // Unit-экономика сделки
  const gmv = contract.revenue || contract.kpi_revenue || 1250000;
  const platformFee = gmv * 0.12; // 12% комиссии платформы
  const escrowTotal = gmv * 0.88; // 88% в эскроу для агента

  // 6 потоков выплат агенту (согласно PDF)
  const newSalesBonus = gmv * 0.50; // 50% от GMV
  const renewalBonus = (contract.renewal_amount || gmv * 0.15) * 0.15; // 15% от продления
  const crossSellBonus = (contract.cross_sell_amount || gmv * 0.10) * 0.10; // 10% от кросс-продаж
  const planBonus = gmv * 0.10; // 10% за выполнение плана
  const retentionBonus = gmv * 0.10; // 10% за удержание 90 дней
  const annualBonus = gmv * 0.05; // 5% годовой бонус

  const totalBonuses = newSalesBonus + renewalBonus + crossSellBonus + planBonus + retentionBonus + annualBonus;
  const companyProfit = escrowTotal - totalBonuses;

  // Ledger (внутренняя книга)
  const frozenAmount = contract.escrow_amount || escrowTotal;
  const waitingForAgent = frozenAmount * 0.88;
  const platformCommission = frozenAmount * 0.12;

  return (
    <div className="p-4 md:p-6 space-y-6 max-w-6xl mx-auto">
      {/* Шапка */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <button onClick={() => navigate('/ceo/contracts')} className="flex items-center text-[#000052]/70 hover:text-[#000052] transition self-start">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Назад к контрактам
        </button>
        <button
          onClick={handleExportPDF}
          className="flex items-center gap-2 px-4 py-2 bg-[#000052] text-white rounded-lg hover:bg-[#000052]/90 transition text-sm font-medium self-start md:self-auto"
        >
          <Download className="w-4 h-4" />
          Экспорт в PDF
        </button>
      </div>

      {/* Заголовок сделки */}
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{contract.title}</h1>
            <p className="text-sm text-[#000052]/70 mt-1">{contract.description}</p>
            <div className="flex items-center gap-3 mt-3">
              <span className="px-3 py-1 bg-[#B8860B]/10 text-[#B8860B] rounded-full text-xs font-semibold">
                {t(`contract.statuses.${contract.status}`)}
              </span>
              {agent && (
                <span className="text-sm text-[#000052]/70 flex items-center gap-1">
                  <Users className="w-4 h-4" /> {agent.full_name}
                </span>
              )}
              <span className="text-sm text-[#000052]/70 flex items-center gap-1">
                <Clock className="w-4 h-4" /> Дедлайн: {new Date(contract.deadline).toLocaleDateString('ru-RU')}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 4 ключевые метрики */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#000052] text-white p-5 rounded-xl border border-[#000052]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">GMV сделки</h3>
            <DollarSign className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${gmv.toLocaleString()}</p>
        </div>

        <div className="bg-[#B8860B] text-white p-5 rounded-xl border border-[#B8860B]">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium opacity-80">Заморожено в эскроу</h3>
            <ShieldCheck className="w-5 h-5 opacity-80" />
          </div>
          <p className="text-2xl font-bold">${frozenAmount.toLocaleString()}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">Прибыль компании</h3>
            <TrendingUp className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">${companyProfit.toLocaleString()}</p>
        </div>

        <div className="bg-white text-[#000052] p-5 rounded-xl border border-[#000052]/10">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-[#000052]/70">ROI сделки</h3>
            <Target className="w-5 h-5 text-[#B8860B]" />
          </div>
          <p className="text-2xl font-bold text-[#000052]">{contract.roi_percentage || 0}%</p>
        </div>
      </div>

      {/* Внутренний Ledger (книга распределения) */}
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-[#B8860B]" />
          Внутренний Ledger (распределение эскроу)
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-[#B8860B]/10 p-4 rounded-lg border border-[#B8860B]/20">
            <p className="text-xs text-[#B8860B] mb-1">Заморожено</p>
            <p className="text-xl font-bold text-[#B8860B]">${frozenAmount.toLocaleString()}</p>
            <p className="text-xs text-[#000052]/60 mt-1">Средства заблокированы в смарт-контракте</p>
          </div>
          <div className="bg-[#000052]/5 p-4 rounded-lg border border-[#000052]/10">
            <p className="text-xs text-[#000052]/60 mb-1">Ждёт агента</p>
            <p className="text-xl font-bold text-[#000052]">${waitingForAgent.toLocaleString()}</p>
            <p className="text-xs text-[#000052]/60 mt-1">Выплата после верификации результата</p>
          </div>
          <div className="bg-[#000052]/5 p-4 rounded-lg border border-[#000052]/10">
            <p className="text-xs text-[#000052]/60 mb-1">Комиссия InCORE</p>
            <p className="text-xl font-bold text-[#000052]">${platformCommission.toLocaleString()}</p>
            <p className="text-xs text-[#000052]/60 mt-1">12% от GMV</p>
          </div>
        </div>
      </div>

      {/* 6 потоков выплат агенту */}
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-[#B8860B]" />
          6 потоков выплат агенту (Unit-экономика)
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#000052]"></div>
              <div>
                <p className="font-semibold text-[#000052]">Новые продажи</p>
                <p className="text-xs text-[#000052]/60">50% от GMV</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${newSalesBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#B8860B]"></div>
              <div>
                <p className="font-semibold text-[#000052]">Продление</p>
                <p className="text-xs text-[#000052]/60">15% от суммы продления</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${renewalBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#000052]"></div>
              <div>
                <p className="font-semibold text-[#000052]">Кросс-продажи</p>
                <p className="text-xs text-[#000052]/60">10% от суммы кросс-продаж</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${crossSellBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#B8860B]"></div>
              <div>
                <p className="font-semibold text-[#000052]">Бонус за выполнение плана</p>
                <p className="text-xs text-[#000052]/60">10% от GMV за 100% выполнение KPI квартала</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${planBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-[#B8860B]/10 rounded-lg border-2 border-[#B8860B]/30">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-3 h-3 rounded-full bg-[#B8860B]"></div>
              <div>
                <p className="font-semibold text-[#000052]">Удержание 90 дней (Clawback)</p>
                <p className="text-xs text-[#000052]/60">10% от GMV — ТОЛЬКО если клиент остаётся более 90 дней</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#B8860B]">${retentionBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-[#000052]/5 rounded-lg border border-[#000052]/10">
            <div className="flex items-center gap-3">
              <div className="w-3 h-3 rounded-full bg-[#000052]"></div>
              <div>
                <p className="font-semibold text-[#000052]">Годовой бонус</p>
                <p className="text-xs text-[#000052]/60">5% от GMV, выплачивается 1/12 ежемесячно</p>
              </div>
            </div>
            <span className="text-lg font-bold text-[#000052]">${annualBonus.toLocaleString()}</span>
          </div>

          <div className="flex justify-between items-center p-4 bg-[#000052] rounded-lg mt-4">
            <span className="font-bold text-white">ИТОГО бонусов агенту:</span>
            <span className="text-xl font-bold text-white">${totalBonuses.toLocaleString()}</span>
          </div>
        </div>
      </div>

      {/* Clawback предупреждение */}
      <div className="bg-[#B8860B]/10 border-2 border-[#B8860B]/30 p-6 rounded-xl">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-6 h-6 text-[#B8860B] flex-shrink-0 mt-1" />
          <div>
            <h3 className="text-lg font-bold text-[#000052] mb-2">Clawback: Защита от фрода</h3>
            <p className="text-sm text-[#000052]/80">
              Бонус за удержание <span className="font-bold text-[#B8860B]">${retentionBonus.toLocaleString()}</span> выплачивается агенту <span className="font-bold">ТОЛЬКО</span> если клиент остаётся с компанией более 90 дней.
              Если клиент уходит раньше — бонус не выплачивается, что защищает бизнес от фрода и "мёртвых полисов".
            </p>
          </div>
        </div>
      </div>

      {/* KPI контракта */}
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10">
        <h2 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
          <Target className="w-5 h-5 text-[#B8860B]" />
          KPI контракта (верификация через InCORE)
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 bg-[#000052]/5 rounded-lg text-center border border-[#000052]/10">
            <p className="text-xs text-[#000052]/60 mb-1">Звонков</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_calls || 0}</p>
          </div>
          <div className="p-4 bg-[#000052]/5 rounded-lg text-center border border-[#000052]/10">
            <p className="text-xs text-[#000052]/60 mb-1">Встреч</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_meetings || 0}</p>
          </div>
          <div className="p-4 bg-[#000052]/5 rounded-lg text-center border border-[#000052]/10">
            <p className="text-xs text-[#000052]/60 mb-1">КП</p>
            <p className="text-2xl font-bold text-[#000052]">{contract.kpi_proposals || 0}</p>
          </div>
          <div className="p-4 bg-[#B8860B]/10 rounded-lg text-center border border-[#B8860B]/20">
            <p className="text-xs text-[#B8860B] mb-1">Клиентов</p>
            <p className="text-2xl font-bold text-[#B8860B]">{contract.target_clients || 0}</p>
          </div>
        </div>
      </div>
    </div>
  );
}