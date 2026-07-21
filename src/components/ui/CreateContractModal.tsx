import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calculator, TrendingUp, Shield, Users, AlertCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';

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
  const [loading, setLoading] = useState(false);

  // --- УМНЫЙ КАЛЬКУЛЯТОР (Unit-экономика в реальном времени) ---
  const [economics, setEconomics] = useState({
    escrow: 0,
    agentPayouts: 0,
    companyProfit: 0,
    roi: 0,
  });

  useEffect(() => {
    const rev = typeof revenue === 'number' ? revenue : 0;
    
    // 1. Escrow: 30% от выручки (резерв безопасности)
    const escrow = rev * 0.30;

    // 2. Выплаты агенту (матрица 6 стримов, упрощенно по типу вознаграждения)
    let payoutMultiplier = 0.15; // Стандартный B2B: ~15% от выручки на все стримы
    if (rewardType === 'renewal') payoutMultiplier = 0.05; // Пролонгация: 5%
    if (rewardType === 'cross_sell') payoutMultiplier = 0.10; // Кросс-сейл: 10%

    const agentPayouts = rev * payoutMultiplier;

    // 3. Прибыль компании (по формуле: Выручка - Escrow)
    const companyProfit = rev - escrow; 

    // 4. ROI = (Прибыль / Escrow) * 100
    const roi = escrow > 0 ? (companyProfit / escrow) * 100 : 0;

    setEconomics({ escrow, agentPayouts, companyProfit, roi });
  }, [revenue, rewardType]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || typeof revenue !== 'number') return;

    setLoading(true);
    try {
      // 1. Сначала получаем company_id текущего CEO
      const { data: companyData, error: companyError } = await supabase
        .from('companies')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (companyError || !companyData) {
        alert('Ошибка: Компания не найдена. Пожалуйста, заполните данные компании в настройках.');
        setLoading(false);
        return;
      }

      // 2. Создаем контракт с правильным company_id
      const { error } = await supabase.from('contracts').insert({
        company_id: companyData.id, // <-- КЛЮЧЕВОЕ ДОБАВЛЕНИЕ
        ceo_id: user.id,
        title,
        description,
        revenue: revenue,
        escrow_amount: economics.escrow,
        agent_payouts_total: economics.agentPayouts,
        company_profit: economics.companyProfit,
        roi_percentage: economics.roi,
        reward_type: rewardType,
        deadline,
        status: 'PENDING_APPROVAL', 
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      onCreated();
      onClose();
      
      // Сброс формы
      setTitle(''); 
      setDescription(''); 
      setRevenue(''); 
      setDeadline('');
      setRewardType('standard_b2b');
    } catch (err) {
      console.error('Ошибка создания контракта:', err);
      alert(t('common.error') + ': ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isProfitable = economics.roi > 0 && typeof revenue === 'number' && revenue > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto border border-text-secondary/10">
        <div className="flex items-center justify-between p-6 border-b border-text-secondary/10">
          <h2 className="text-2xl font-display font-bold text-text-primary">
            {t('contracts.createNew') || 'Создать новый контракт'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-text-secondary/10 rounded-full transition-colors">
            <X className="w-5 h-5 text-text-secondary" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* ЛЕВАЯ КОЛОНКА: Ввод данных */}
          <div className="space-y-5">
            <div>
              <label className="label">{t('contract.title') || 'Название задачи'} *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="Например: Привлечение 5 корпоративных клиентов"
                required
              />
            </div>

            <div>
              <label className="label">{t('contract.description') || 'Описание'} *</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input min-h-[100px]"
                placeholder="Опишите задачи и KPI агента..."
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="label">{t('contracts.plannedRevenue') || 'Плановая выручка'} *</label>
                <input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="input"
                  placeholder="5000000"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="label">{t('contract.deadline') || 'Срок исполнения'} *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>

            <div>
              <label className="label">{t('contracts.rewardType') || 'Тип вознаграждения'}</label>
              <select
                value={rewardType}
                onChange={(e) => setRewardType(e.target.value as RewardType)}
                className="input"
              >
                <option value="standard_b2b">Стандартный B2B (Фонд ~15%)</option>
                <option value="renewal">Пролонгация (Фонд ~5%)</option>
                <option value="cross_sell">Кросс-сейл (Фонд ~10%)</option>
              </select>
            </div>
          </div>

          {/* ПРАВАЯ КОЛОНКА: Умный калькулятор (Unit-экономика) */}
          <div className="bg-primary-light/50 rounded-xl p-6 border border-text-secondary/10">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-gold" />
              <h3 className="text-lg font-semibold text-text-primary">
                {t('contracts.unitEconomics') || 'Unit-экономика контракта'}
              </h3>
            </div>

            <div className="space-y-4">
              {/* Строка 1: Выплаты агенту */}
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-text-secondary/10">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-text-secondary">
                    {t('contracts.agentPayouts') || 'Плановые выплаты агенту'}
                  </span>
                </div>
                <span className="font-semibold text-text-primary">
                  {economics.agentPayouts.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {/* Строка 2: Escrow */}
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-text-secondary/10">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-gold" />
                  <span className="text-sm text-text-secondary">
                    {t('contract.escrowAmount') || 'Escrow (резерв 30%)'}
                  </span>
                </div>
                <span className="font-semibold text-gold">
                  {economics.escrow.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {/* Строка 3: Прибыль компании */}
              <div className="flex justify-between items-center p-3 bg-card rounded-lg border border-text-secondary/10">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                  <span className="text-sm text-text-secondary">
                    {t('contracts.companyProfit') || 'Прибыль компании'}
                  </span>
                </div>
                <span className="font-bold text-green-600 text-lg">
                  {economics.companyProfit.toLocaleString('ru-RU')} ₽
                </span>
              </div>

              {/* Строка 4: ROI */}
              <div className={`flex justify-between items-center p-4 rounded-lg border-2 transition-colors ${
                isProfitable ? 'bg-green-50/50 border-green-500/30' : 'bg-red-50/50 border-red-500/30'
              }`}>
                <div className="flex items-center gap-2">
                  <TrendingUp className={`w-5 h-5 ${isProfitable ? 'text-green-600' : 'text-red-600'}`} />
                  <span className="font-semibold text-text-primary">ROI Контракта</span>
                </div>
                <span className={`font-bold text-2xl ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
                  {economics.roi.toFixed(1)}%
                </span>
              </div>

              {!isProfitable && typeof revenue === 'number' && revenue > 0 && (
                <div className="flex items-start gap-2 p-3 bg-red-100/50 text-red-700 rounded-lg text-sm border border-red-200">
                  <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                  <span>{t('contracts.unprofitableWarning') || 'Сделка убыточна. Измените параметры.'}</span>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!isProfitable || loading || !title || !deadline}
              className={`w-full mt-6 py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                isProfitable 
                  ? 'bg-gold hover:bg-gold/90 text-white shadow-lg' 
                  : 'bg-gray-200 text-gray-500 cursor-not-allowed'
              }`}
            >
              {loading ? (t('common.loading') || 'Загрузка...') : (t('contracts.publish') || 'Опубликовать контракт')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}