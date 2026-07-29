import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calculator, Shield, Users, AlertCircle, CheckCircle, ChevronDown } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

interface Agent {
  id: string;
  full_name: string;
  specialization: string;
}

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
}

type RewardType = 'standard_b2b' | 'renewal' | 'cross_sell';

export function CreateContractModal({ isOpen, onClose, onCreated }: CreateContractModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [revenue, setRevenue] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [rewardType, setRewardType] = useState<RewardType>('standard_b2b');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  // Загрузка списка агентов при открытии модалки
  useEffect(() => {
    if (isOpen && user) {
      const fetchAgents = async () => {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          const { data } = await supabase
            .from('agents')
            .select('id, full_name, specialization')
            .eq('company_id', companyData.id)
            .eq('status', 'ACTIVE');
          setAgents(data || []);
        }
      };
      fetchAgents();
    }
  }, [isOpen, user]);

  // --- УМНЫЙ КАЛЬКУЛЯТОР (Исправленная логика InCORE) ---
  const [economics, setEconomics] = useState({
    platformFee: 0,
    netEscrow: 0,
    agentPayouts: 0,
    companyProfit: 0,
    roi: 0,
  });

  useEffect(() => {
    const rev = typeof revenue === 'number' ? revenue : 0;
    
    // 1. Комиссия платформы: 12% от общей суммы, уходит сразу
    const platformFee = rev * 0.12;
    
    // 2. Чистый Эскроу: сумма, которую видит агент (Общая сумма - 12%)
    const netEscrow = rev - platformFee;

    // 3. Выплаты агенту: процент от чистого эскроу
    let payoutMultiplier = 0.15; // Стандартный B2B: 15% от чистого эскроу
    if (rewardType === 'renewal') payoutMultiplier = 0.05;
    if (rewardType === 'cross_sell') payoutMultiplier = 0.10;

    const agentPayouts = netEscrow * payoutMultiplier;

    // 4. Прибыль компании = Чистый эскроу - Выплаты агенту
    const companyProfit = netEscrow - agentPayouts; 

    // 5. ROI = (Прибыль компании / Затраты на агента) * 100
    const roi = agentPayouts > 0 ? (companyProfit / agentPayouts) * 100 : 0;

    setEconomics({ platformFee, netEscrow, agentPayouts, companyProfit, roi });
  }, [revenue, rewardType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || typeof revenue !== 'number') return;

    setLoading(true);
    try {
      const { data: companyData } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (!companyData) {
        alert('Ошибка: Компания не найдена. Заполните данные в настройках.');
        setLoading(false);
        return;
      }

      const { error } = await supabase.from('contracts').insert({
        company_id: companyData.id,
        agent_id: selectedAgentId || null,
        title,
        description,
        kpi_revenue: revenue,
        revenue: revenue,
        escrow_amount: economics.netEscrow,
        agent_payouts_total: economics.agentPayouts,
        company_profit: economics.companyProfit,
        roi_percentage: economics.roi,
        reward_type: rewardType,
        deadline,
        status: selectedAgentId ? 'PENDING_APPROVAL' : 'DRAFT',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      onCreated();
      onClose();
      setTitle(''); setDescription(''); setRevenue(''); setDeadline(''); setSelectedAgentId('');
    } catch (err) {
      console.error('Ошибка создания контракта:', err);
      alert(t('common.error', 'Ошибка') + ': ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isProfitable = economics.roi > 0 && typeof revenue === 'number' && revenue > 0;
  const rev = typeof revenue === 'number' ? revenue : 0;

  // Распределение 6 потоков выплат (проценты от фонда выплат агенту)
  const streams = [
    { name: t('payouts.newSales', 'Новые продажи'), percent: 50, color: 'bg-[#000052]' },
    { name: t('payouts.renewal', 'Продление'), percent: 15, color: 'bg-blue-500' },
    { name: t('payouts.crossSell', 'Кросс-продажи'), percent: 10, color: 'bg-indigo-500' },
    { name: t('payouts.planBonus', 'Бонус за план'), percent: 10, color: 'bg-purple-500' },
    { name: t('payouts.retention', 'Удержание (> 90 дней)'), percent: 10, color: 'bg-[#B8860B]' },
    { name: t('payouts.annual', 'Годовой бонус'), percent: 5, color: 'bg-green-500' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#000052]">
            {t('contracts.createNew', 'Создать смарт-контракт')}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ЛЕВАЯ КОЛОНКА: Ввод данных */}
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                {t('contract.title', 'Название задачи')} *
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                placeholder="Например: Привлечение 5 корпоративных клиентов"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                {t('contract.description', 'Описание и KPI')} *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052] min-h-[100px]"
                placeholder="Опишите задачи и метрики успеха..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                {t('nav.agents', 'Назначить агента')}
              </label>
              <div className="relative">
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052] appearance-none"
                >
                  <option value="">-- Выберите исполнителя (или сохраните как черновик) --</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name} {agent.specialization ? `(${agent.specialization})` : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                  {t('contracts.plannedRevenue', 'Плановая выручка (₽)')} *
                </label>
                <input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                  placeholder="1000000"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                  {t('contract.deadline', 'Срок исполнения')} *
                </label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                {t('contracts.rewardType', 'Тип вознаграждения')}
              </label>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as RewardType)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
              >
                <option value="standard_b2b">Стандартный B2B (Фонд выплат ~15%)</option>
                <option value="renewal">Пролонгация (Фонд выплат ~5%)</option>
                <option value="cross_sell">Кросс-сейл (Фонд выплат ~10%)</option>
              </select>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Unit-экономика и Хеджирование */}
          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-[#B8860B]" />
              <h3 className="text-lg font-bold text-[#000052]">
                {t('contracts.unitEconomics', 'Unit-экономика контракта')}
              </h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-red-500" />
                  <span className="text-sm text-gray-600">{t('contracts.platformFee', 'Комиссия платформы (12%)')}</span>
                </div>
                <span className="font-semibold text-red-600">
                  {economics.platformFee.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {/* ИСПРАВЛЕНО: фон bg-blue-50 вместо bg-[#000052]/5 для читаемости */}
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#000052]" />
                  <span className="text-sm font-semibold text-[#000052]">{t('contracts.netEscrow', 'Доступно в Эскроу (для выплат)')}</span>
                </div>
                <span className="font-bold text-[#000052] text-lg">
                  {economics.netEscrow.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-600">{t('contracts.agentPayouts', 'Фонд выплат агенту')}</span>
                </div>
                <span className="font-semibold text-[#000052]">
                  {economics.agentPayouts.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-gray-600">{t('contracts.companyProfit', 'Прибыль компании')}</span>
                </div>
                <span className="font-bold text-green-600 text-lg">
                  {economics.companyProfit.toLocaleString('ru-RU')} ₽
                </span>
              </div>
            </div>

            {/* Визуализация 6 потоков */}
            {rev > 0 && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">
                  {t('contracts.streamsStructure', 'Структура выплат из фонда агента (100%)')}
                </p>
                <div className="space-y-2">
                  {streams.map((stream) => (
                    <div key={stream.name} className="flex items-center gap-2 text-xs">
                      <div className={`w-2 h-2 rounded-full ${stream.color}`}></div>
                      <span className="flex-1 text-gray-700">{stream.name}</span>
                      <span className="font-semibold text-[#000052]">{stream.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Блок Clawback (Исправленная формулировка) */}
            <div className="mb-6 p-4 bg-[#B8860B]/10 border border-[#B8860B]/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#000052]">{t('contracts.clawbackTitle', 'Clawback: Защита от фрода')}</p>
                  <p className="text-xs text-gray-700 mt-1">
                    {t('contracts.clawbackDescription', 'Бонус за удержание (10%) выплачивается агенту ТОЛЬКО если клиент остается с компанией более 90 дней. Если клиент уходит раньше, бонус не начисляется.')}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isProfitable || loading || !title || !deadline}
              className={`w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                isProfitable 
                  ? 'bg-[#000052] hover:bg-[#000066] text-white shadow-lg' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? t('common.loading', 'Создание...') : t('contracts.publish', 'Опубликовать смарт-контракт')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}