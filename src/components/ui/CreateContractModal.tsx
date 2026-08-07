import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { X, DollarSign, Users, Shield, TrendingUp, AlertTriangle, Calculator } from 'lucide-react';
import { createPayoutStreamsForContract, PLATFORM_FEE_PERCENT } from '../../lib/smartContractLogic';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

export function CreateContractModal({ isOpen, onClose, onCreated }: CreateContractModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  // Основные поля
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('');
  const [deadline, setDeadline] = useState('');
  const [plannedRevenue, setPlannedRevenue] = useState<number>(0);

  // Новые продажи (разбивка на 3 типа)
  const [targetClientsNew, setTargetClientsNew] = useState<number>(10);
  const [avgCheckProperty, setAvgCheckProperty] = useState<number>(300);
  const [avgCheckCasco, setAvgCheckCasco] = useState<number>(300);
  const [avgCheckDms, setAvgCheckDms] = useState<number>(300);

  // Продление
  const [targetClientsRenewal, setTargetClientsRenewal] = useState<number>(10);
  const [avgCheckRenewal, setAvgCheckRenewal] = useState<number>(300);

  // Кросс-продажи
  const [targetClientsCrossSell, setTargetClientsCrossSell] = useState<number>(10);
  const [avgCheckCrossSell, setAvgCheckCrossSell] = useState<number>(300);

  // Загрузка данных при открытии модалки
  useEffect(() => {
    if (!isOpen || !user) return;

    const loadData = async () => {
      try {
        // Получаем компанию пользователя
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          setCompanyId(companyData.id);

          // Загружаем агентов этой компании
          const { data: agentsData } = await supabase
            .from('agents')
            .select('id, full_name, specialization')
            .eq('company_id', companyData.id)
            .eq('status', 'ACTIVE');

          setAgents(agentsData || []);
        }
      } catch (err) {
        console.error('Ошибка загрузки данных:', err);
      }
    };

    loadData();
  }, [isOpen, user]);

  // Расчёты в реальном времени
  const calculations = useMemo(() => {
    // Суммы договоров по каждому типу
    const propertyRevenue = targetClientsNew * avgCheckProperty;
    const cascoRevenue = targetClientsNew * avgCheckCasco;
    const dmsRevenue = targetClientsNew * avgCheckDms;
    const totalNewSalesRevenue = propertyRevenue + cascoRevenue + dmsRevenue;

    const renewalRevenue = targetClientsRenewal * avgCheckRenewal;
    const crossSellRevenue = targetClientsCrossSell * avgCheckCrossSell;

    // Бонусы по потокам (проценты от сумм договоров)
    const bonusProperty = Math.round(propertyRevenue * 0.20); // 20%
    const bonusCasco = Math.round(cascoRevenue * 0.15); // 15%
    const bonusDms = Math.round(dmsRevenue * 0.10); // 10%
    const bonusNewSales = bonusProperty + bonusCasco + bonusDms;

    const bonusRenewal = Math.round(renewalRevenue * 0.15); // 15%
    const bonusCrossSell = Math.round(crossSellRevenue * 0.10); // 10%
    const bonusPlan = Math.round((totalNewSalesRevenue + renewalRevenue + crossSellRevenue) * 0.10); // 10% от общей

    // Фиксированные бонусы
    const bonusRetention = 200;
    const bonusAnnual = 7000;

    // Итого эскроу
    const totalEscrow = bonusNewSales + bonusRenewal + bonusCrossSell + bonusPlan + bonusRetention + bonusAnnual;

    // Комиссия InCORE (12% от эскроу)
    const platformFee = Math.round(totalEscrow * PLATFORM_FEE_PERCENT / 100);

    // Выплата агенту
    const agentPayout = totalEscrow;

    // Прибыль компании = эскроу - выплата агенту + комиссия
    // (в реальности комиссия удерживается из эскроу, поэтому прибыль = комиссия)
    const companyProfit = platformFee;

    return {
      propertyRevenue,
      cascoRevenue,
      dmsRevenue,
      totalNewSalesRevenue,
      renewalRevenue,
      crossSellRevenue,
      bonusProperty,
      bonusCasco,
      bonusDms,
      bonusNewSales,
      bonusRenewal,
      bonusCrossSell,
      bonusPlan,
      bonusRetention,
      bonusAnnual,
      totalEscrow,
      platformFee,
      agentPayout,
      companyProfit,
    };
  }, [targetClientsNew, avgCheckProperty, avgCheckCasco, avgCheckDms, targetClientsRenewal, avgCheckRenewal, targetClientsCrossSell, avgCheckCrossSell]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !companyId) {
      alert('Ошибка: пользователь или компания не найдены');
      return;
    }

    if (!title || !agentId || !deadline) {
      alert('Заполните все обязательные поля');
      return;
    }

    setLoading(true);
    try {
      // 1. Создаём контракт
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: companyId,
          agent_id: agentId,
          title,
          description,
          status: 'DRAFT',
          escrow_amount: calculations.totalEscrow,
          revenue: calculations.totalNewSalesRevenue + calculations.renewalRevenue + calculations.crossSellRevenue,
          planned_revenue: plannedRevenue || (calculations.totalNewSalesRevenue + calculations.renewalRevenue + calculations.crossSellRevenue),
          target_clients_new: targetClientsNew,
          target_clients_renewal: targetClientsRenewal,
          target_clients_cross_sell: targetClientsCrossSell,
          agent_payouts_total: calculations.agentPayout,
          company_profit: calculations.companyProfit,
          platform_fee: calculations.platformFee,
          roi_percentage: calculations.totalEscrow > 0 ? Math.round((calculations.companyProfit / calculations.totalEscrow) * 100) : 0,
          reward_type: 'standard_b2b',
          escrow_status: 'NOT_FUNDED',
          oracle_status: 'PENDING',
          deadline,
        })
        .select()
        .single();

      if (contractError) throw contractError;
      if (!contract) throw new Error('Контракт не создан');

      // 2. Создаём 8 потоков выплат
      const { error: streamsError } = await createPayoutStreamsForContract(
        contract.id,
        calculations.totalNewSalesRevenue + calculations.renewalRevenue + calculations.crossSellRevenue,
        targetClientsNew,
        targetClientsRenewal,
        targetClientsCrossSell
      );

      if (streamsError) {
        console.error('Ошибка создания потоков:', streamsError);
        // Не прерываем процесс, потоки можно создать позже
      }

      alert('Контракт успешно создан!');
      onCreated();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Ошибка создания контракта:', err);
      alert('Ошибка: ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setAgentId('');
    setDeadline('');
    setPlannedRevenue(0);
    setTargetClientsNew(10);
    setAvgCheckProperty(300);
    setAvgCheckCasco(300);
    setAvgCheckDms(300);
    setTargetClientsRenewal(10);
    setAvgCheckRenewal(300);
    setTargetClientsCrossSell(10);
    setAvgCheckCrossSell(300);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-[#000052]/10 my-8">
        {/* Заголовок */}
        <div className="flex items-center justify-between p-6 border-b border-[#000052]/10 sticky top-0 bg-white z-10 rounded-t-2xl">
          <div>
            <h2 className="text-2xl font-bold text-[#000052]">Создание смарт-контракта</h2>
            <p className="text-sm text-[#000052]/60 mt-1">Расчёт эскроу и 6 потоков выплат в реальном времени</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#000052]/5 rounded-full transition">
            <X className="w-6 h-6 text-[#000052]" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Основные поля */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Название контракта *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Привлечь 30 корпоративных клиентов"
                className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"
                required
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Описание</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Агент *</label>
              <select
                value={agentId}
                onChange={(e) => setAgentId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"
                required
              >
                <option value="">Выберите агента</option>
                {agents.map(agent => (
                  <option key={agent.id} value={agent.id}>
                    {agent.full_name} ({agent.specialization || 'без специализации'})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Дедлайн *</label>
              <input
                type="date"
                value={deadline}
                onChange={(e) => setDeadline(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30"
                required
              />
            </div>
          </div>

          {/* Новые продажи */}
          <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10">
            <h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-[#B8860B]" />
              Новые продажи (45% от суммы договоров)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов</label>
                <input
                  type="number"
                  value={targetClientsNew}
                  onChange={(e) => setTargetClientsNew(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-3 rounded-lg border border-[#000052]/10">
                <div className="text-xs font-semibold text-[#000052]/70 mb-1">Имущество/риски (20%)</div>
                <input
                  type="number"
                  value={avgCheckProperty}
                  onChange={(e) => setAvgCheckProperty(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]"
                  placeholder="Средний чек"
                />
                <div className="text-xs text-[#000052]/60 mt-1">
                  Сумма: ${calculations.propertyRevenue.toLocaleString()} → бонус <span className="font-bold text-[#B8860B]">${calculations.bonusProperty.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#000052]/10">
                <div className="text-xs font-semibold text-[#000052]/70 mb-1">Автопарки КАСКО (15%)</div>
                <input
                  type="number"
                  value={avgCheckCasco}
                  onChange={(e) => setAvgCheckCasco(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]"
                  placeholder="Средний чек"
                />
                <div className="text-xs text-[#000052]/60 mt-1">
                  Сумма: ${calculations.cascoRevenue.toLocaleString()} → бонус <span className="font-bold text-[#B8860B]">${calculations.bonusCasco.toLocaleString()}</span>
                </div>
              </div>
              <div className="bg-white p-3 rounded-lg border border-[#000052]/10">
                <div className="text-xs font-semibold text-[#000052]/70 mb-1">Медицина ДМС (10%)</div>
                <input
                  type="number"
                  value={avgCheckDms}
                  onChange={(e) => setAvgCheckDms(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]"
                  placeholder="Средний чек"
                />
                <div className="text-xs text-[#000052]/60 mt-1">
                  Сумма: ${calculations.dmsRevenue.toLocaleString()} → бонус <span className="font-bold text-[#B8860B]">${calculations.bonusDms.toLocaleString()}</span>
                </div>
              </div>
            </div>
            <div className="mt-3 text-sm text-[#000052]/80">
              Итого новые продажи: <span className="font-bold text-[#B8860B]">${calculations.bonusNewSales.toLocaleString()}</span>
            </div>
          </div>

          {/* Продление */}
          <div className="bg-[#B8860B]/5 p-5 rounded-xl border border-[#B8860B]/20">
            <h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-[#B8860B]" />
              Продление (15% от суммы договоров)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов</label>
                <input
                  type="number"
                  value={targetClientsRenewal}
                  onChange={(e) => setTargetClientsRenewal(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#000052]/70 mb-1">Средний чек ($)</label>
                <input
                  type="number"
                  value={avgCheckRenewal}
                  onChange={(e) => setAvgCheckRenewal(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]"
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-[#000052]/80">
              Сумма договоров: ${calculations.renewalRevenue.toLocaleString()} → бонус <span className="font-bold text-[#B8860B]">${calculations.bonusRenewal.toLocaleString()}</span>
            </div>
          </div>

          {/* Кросс-продажи */}
          <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10">
            <h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#B8860B]" />
              Кросс-продажи (10% от суммы договоров)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов</label>
                <input
                  type="number"
                  value={targetClientsCrossSell}
                  onChange={(e) => setTargetClientsCrossSell(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#000052]/70 mb-1">Средний чек ($)</label>
                <input
                  type="number"
                  value={avgCheckCrossSell}
                  onChange={(e) => setAvgCheckCrossSell(Number(e.target.value))}
                  min={0}
                  className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]"
                />
              </div>
            </div>
            <div className="mt-3 text-sm text-[#000052]/80">
              Сумма договоров: ${calculations.crossSellRevenue.toLocaleString()} → бонус <span className="font-bold text-[#B8860B]">${calculations.bonusCrossSell.toLocaleString()}</span>
            </div>
          </div>

          {/* Бонус за план и дополнительные бонусы */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#B8860B]/5 p-5 rounded-xl border border-[#B8860B]/20">
              <h3 className="text-lg font-bold text-[#000052] mb-2 flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#B8860B]" />
                Бонус за выполнение плана (10%)
              </h3>
              <p className="text-sm text-[#000052]/70 mb-2">10% от общей суммы договоров</p>
              <div className="text-2xl font-bold text-[#B8860B]">${calculations.bonusPlan.toLocaleString()}</div>
              <p className="text-xs text-[#000052]/60 mt-1">Условие: 100% выполнение KPI квартала</p>
            </div>

            <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10">
              <h3 className="text-lg font-bold text-[#000052] mb-2 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-[#B8860B]" />
                Дополнительные бонусы
              </h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#000052]/70">Удержание 90 дней</span>
                  <span className="font-bold text-[#000052]">$200</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-[#000052]/70">Годовой бонус (январь 2027)</span>
                  <span className="font-bold text-[#000052]">$7,000</span>
                </div>
              </div>
            </div>
          </div>

          {/* Итоговый расчёт */}
          <div className="bg-gradient-to-br from-[#000052] to-[#000052]/90 text-white p-6 rounded-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Calculator className="w-5 h-5 text-[#B8860B]" />
              Итоговый расчёт эскроу
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Новые продажи</span>
                  <span className="font-bold">${calculations.bonusNewSales.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Продление</span>
                  <span className="font-bold">${calculations.bonusRenewal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Кросс-продажи</span>
                  <span className="font-bold">${calculations.bonusCrossSell.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Бонус за план</span>
                  <span className="font-bold">${calculations.bonusPlan.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Удержание 90 дней</span>
                  <span className="font-bold">$200</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Годовой бонус</span>
                  <span className="font-bold">$7,000</span>
                </div>
              </div>
              <div className="space-y-3 border-l border-white/20 pl-4">
                <div className="flex justify-between">
                  <span className="opacity-80">Итого эскроу</span>
                  <span className="text-2xl font-bold text-[#B8860B]">${calculations.totalEscrow.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Комиссия InCORE ({PLATFORM_FEE_PERCENT}%)</span>
                  <span className="font-bold">${calculations.platformFee.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Выплата агенту</span>
                  <span className="font-bold">${calculations.agentPayout.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="opacity-80">Прибыль компании</span>
                  <span className="font-bold text-[#B8860B]">${calculations.companyProfit.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Кнопки */}
          <div className="flex gap-3 pt-4 border-t border-[#000052]/10">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg font-semibold transition"
              disabled={loading}
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 py-3 px-4 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать контракт'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}