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

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('');
  const [deadline, setDeadline] = useState('');

  const [targetClientsNew, setTargetClientsNew] = useState<number>(10);
  const [avgCheckProperty, setAvgCheckProperty] = useState<number>(375);
  const [avgCheckCasco, setAvgCheckCasco] = useState<number>(375);
  const [avgCheckDms, setAvgCheckDms] = useState<number>(375);

  const [targetClientsRenewal, setTargetClientsRenewal] = useState<number>(10);
  const [avgCheckRenewal, setAvgCheckRenewal] = useState<number>(375);

  const [targetClientsCrossSell, setTargetClientsCrossSell] = useState<number>(10);
  const [avgCheckCrossSell, setAvgCheckCrossSell] = useState<number>(375);

  const [planBonusPercent, setPlanBonusPercent] = useState<number>(10);
  const [retentionBonus, setRetentionBonus] = useState<number>(200);
  const [annualBonus, setAnnualBonus] = useState<number>(7000);

  useEffect(() => {
    if (!isOpen || !user) return;

    const loadData = async () => {
      try {
        const { data: companyData } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyData) {
          setCompanyId(companyData.id);

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

  const calculations = useMemo(() => {
    const propertyRevenue = targetClientsNew * avgCheckProperty;
    const cascoRevenue = targetClientsNew * avgCheckCasco;
    const dmsRevenue = targetClientsNew * avgCheckDms;
    const totalNewSalesRevenue = propertyRevenue + cascoRevenue + dmsRevenue;

    const renewalRevenue = targetClientsRenewal * avgCheckRenewal;
    const crossSellRevenue = targetClientsCrossSell * avgCheckCrossSell;
    const totalContractRevenue = totalNewSalesRevenue + renewalRevenue + crossSellRevenue;

    const bonusProperty = Math.round(propertyRevenue * 0.20);
    const bonusCasco = Math.round(cascoRevenue * 0.15);
    const bonusDms = Math.round(dmsRevenue * 0.10);
    const bonusNewSales = bonusProperty + bonusCasco + bonusDms;
    const bonusRenewal = Math.round(renewalRevenue * 0.15);
    const bonusCrossSell = Math.round(crossSellRevenue * 0.10);
    const bonusPlan = Math.round(totalContractRevenue * (planBonusPercent / 100));
    const bonusRetention = retentionBonus;
    const bonusAnnual = annualBonus;

    const totalEscrow = bonusNewSales + bonusRenewal + bonusCrossSell + bonusPlan + bonusRetention;
    const platformFee = Math.round(totalEscrow * PLATFORM_FEE_PERCENT / 100);
    const agentPayout = totalEscrow;
    const companyProfit = totalContractRevenue - agentPayout;
    const roi = totalContractRevenue > 0 ? Math.round((companyProfit / totalContractRevenue) * 100) : 0;

    return {
      propertyRevenue,
      cascoRevenue,
      dmsRevenue,
      totalNewSalesRevenue,
      renewalRevenue,
      crossSellRevenue,
      totalContractRevenue,
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
      roi,
    };
  }, [targetClientsNew, avgCheckProperty, avgCheckCasco, avgCheckDms, targetClientsRenewal, avgCheckRenewal, targetClientsCrossSell, avgCheckCrossSell, planBonusPercent, retentionBonus, annualBonus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) { alert('Заполните название контракта'); return; }
    if (!description.trim()) { alert('Заполните описание контракта'); return; }
    if (!agentId) { alert('Выберите агента'); return; }
    if (!deadline) { alert('Укажите дедлайн'); return; }
    if (targetClientsNew <= 0 || targetClientsRenewal <= 0 || targetClientsCrossSell <= 0) {
      alert('Количество клиентов должно быть больше 0');
      return;
    }
    if (avgCheckProperty <= 0 || avgCheckCasco <= 0 || avgCheckDms <= 0 || avgCheckRenewal <= 0 || avgCheckCrossSell <= 0) {
      alert('Средний чек должен быть больше 0');
      return;
    }
    if (!user || !companyId) { alert('Ошибка: пользователь или компания не найдены'); return; }

    setLoading(true);
    try {
      const { data: contract, error: contractError } = await supabase
        .from('contracts')
        .insert({
          company_id: companyId,
          agent_id: agentId,
          title,
          description,
          status: 'DRAFT',
          escrow_amount: calculations.totalEscrow,
          revenue: calculations.totalContractRevenue,
          planned_revenue: calculations.totalContractRevenue,
          target_clients_new: targetClientsNew,
          target_clients_renewal: targetClientsRenewal,
          target_clients_cross_sell: targetClientsCrossSell,
          agent_payouts_total: calculations.agentPayout,
          company_profit: calculations.companyProfit,
          platform_fee: calculations.platformFee,
          roi_percentage: calculations.roi,
          reward_type: 'standard_b2b',
          deadline,
        })
        .select()
        .single();

      if (contractError) throw contractError;
      if (!contract) throw new Error('Контракт не создан');

      const { error: streamsError } = await createPayoutStreamsForContract(
        contract.id,
        calculations.totalContractRevenue,
        {
          property: calculations.bonusProperty,
          casco: calculations.bonusCasco,
          dms: calculations.bonusDms,
          renewal: calculations.bonusRenewal,
          crossSell: calculations.bonusCrossSell,
          planBonus: calculations.bonusPlan,
          retention: calculations.bonusRetention,
        }
      );

      if (streamsError) console.error('Ошибка создания потоков:', streamsError);

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
    setTargetClientsNew(10);
    setAvgCheckProperty(375);
    setAvgCheckCasco(375);
    setAvgCheckDms(375);
    setTargetClientsRenewal(10);
    setAvgCheckRenewal(375);
    setTargetClientsCrossSell(10);
    setAvgCheckCrossSell(375);
    setPlanBonusPercent(10);
    setRetentionBonus(200);
    setAnnualBonus(7000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-[#000052]/10 my-8">
        <div className="flex items-center justify-between p-6 border-b border-[#000052]/10">
          <div>
            <h2 className="text-2xl font-bold text-[#000052]">Создание смарт-контракта</h2>
            <p className="text-sm text-[#000052]/60 mt-1">Расчёт эскроу и 6 потоков выплат в реальном времени</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-[#000052]/5 rounded-full transition"><X className="w-6 h-6 text-[#000052]" /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Название контракта *</label>
              <input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Привлечь 30 корпоративных клиентов" className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Описание *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Описание целей и задач контракта" className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Агент *</label>
              <select value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required>
                <option value="">Выберите агента</option>
                {agents.map(agent => <option key={agent.id} value={agent.id}>{agent.full_name} ({agent.specialization || 'без специализации'})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">Дедлайн *</label>
              <input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
            </div>
          </div>

          <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10">
            <h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-[#B8860B]" />Новые продажи</h3>
            <div className="mb-4">
              <label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов *</label>
              <input type="number" value={targetClientsNew} onChange={e => setTargetClientsNew(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052] max-w-xs" required />
            </div>
            <div className="text-xs font-semibold text-[#000052]/70 mb-2">Средний чек</div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {([
                ['Имущество/риски (20%)', avgCheckProperty, setAvgCheckProperty, calculations.propertyRevenue, calculations.bonusProperty],
                ['Автопарки КАСКО (15%)', avgCheckCasco, setAvgCheckCasco, calculations.cascoRevenue, calculations.bonusCasco],
                ['Медицина ДМС (10%)', avgCheckDms, setAvgCheckDms, calculations.dmsRevenue, calculations.bonusDms],
              ] as Array<[string, number, (value: number) => void, number, number]>).map(([label, value, setter, revenue, bonus]) => (
                <div key={label} className="bg-white p-3 rounded-lg border border-[#000052]/10">
                  <div className="text-xs text-[#000052]/50 mb-2">{label}</div>
                  <input type="number" value={value} onChange={e => setter(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]" required />
                  <div className="text-xs text-[#000052]/60 mt-1">Сумма: ${revenue.toLocaleString()} → бонус <span className="font-bold text-[#B8860B]">${bonus.toLocaleString()}</span></div>
                </div>
              ))}
            </div>
            <div className="mt-3 text-sm text-[#000052]/80">Итого новые продажи: <span className="font-bold text-[#B8860B]">${calculations.bonusNewSales.toLocaleString()}</span></div>
          </div>

          <div className="bg-[#B8860B]/5 p-5 rounded-xl border border-[#B8860B]/20">
            <h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#B8860B]" />Продление (15% от суммы договоров)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов *</label><input type="number" value={targetClientsRenewal} onChange={e => setTargetClientsRenewal(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]" required /></div>
              <div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Средний чек ($) *</label><input type="number" value={avgCheckRenewal} onChange={e => setAvgCheckRenewal(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]" required /></div>
            </div>
            <div className="mt-3 text-sm text-[#000052]/80">Сумма договоров: ${calculations.renewalRevenue.toLocaleString()} → бонус <span className="font-bold text-[#B8860B]">${calculations.bonusRenewal.toLocaleString()}</span></div>
          </div>

          <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10">
            <h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-[#B8860B]" />Кросс-продажи (10% от суммы договоров)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов *</label><input type="number" value={targetClientsCrossSell} onChange={e => setTargetClientsCrossSell(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]" required /></div>
              <div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Средний чек ($) *</label><input type="number" value={avgCheckCrossSell} onChange={e => setAvgCheckCrossSell(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]" required /></div>
            </div>
            <div className="mt-3 text-sm text-[#000052]/80">Сумма договоров: ${calculations.crossSellRevenue.toLocaleString()} → бонус <span className="font-bold text-[#B8860B]">${calculations.bonusCrossSell.toLocaleString()}</span></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-[#B8860B]/5 p-5 rounded-xl border border-[#B8860B]/20">
              <h3 className="text-lg font-bold text-[#000052] mb-2 flex items-center gap-2"><Shield className="w-5 h-5 text-[#B8860B]" />Бонус за выполнение плана</h3>
              <div className="mb-2"><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Процент от общей суммы договоров (%)</label><input type="number" value={planBonusPercent} onChange={e => setPlanBonusPercent(Number(e.target.value))} min={0} max={100} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]" /></div>
              <div className="text-2xl font-bold text-[#B8860B]">${calculations.bonusPlan.toLocaleString()}</div>
              <p className="text-xs text-[#000052]/60 mt-1">Условие: 100% выполнение KPI квартала</p>
            </div>

            <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10">
              <h3 className="text-lg font-bold text-[#000052] mb-2 flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-[#B8860B]" />Дополнительные бонусы</h3>
              <div className="space-y-3">
                <div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Удержание 90 дней ($)</label><input type="number" value={retentionBonus} onChange={e => setRetentionBonus(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]" /></div>
                <div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Годовой бонус ($) *</label><input type="number" value={annualBonus} onChange={e => setAnnualBonus(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052]" required /><p className="text-xs text-[#000052]/50 mt-1">Выплачивается в январе 2027</p></div>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-[#000052] to-[#000052]/90 text-white p-6 rounded-xl">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2"><Calculator className="w-5 h-5 text-[#B8860B]" />Итоговый расчёт</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <div className="text-sm font-semibold text-[#B8860B] mb-2">Общая сумма договоров:</div>
                <div className="text-xl font-bold mb-4">${calculations.totalContractRevenue.toLocaleString()}</div>
                <div className="text-sm font-semibold text-[#B8860B] mb-2">Эскроу (замороженные средства):</div>
                {[
                  ['Новые продажи', calculations.bonusNewSales],
                  ['Продление', calculations.bonusRenewal],
                  ['Кросс-продажи', calculations.bonusCrossSell],
                  ['Бонус за план', calculations.bonusPlan],
                  ['Удержание 90 дней', calculations.bonusRetention],
                ].map(([label, amount]) => <div key={String(label)} className="flex justify-between text-sm"><span className="opacity-80">{label}</span><span className="font-bold">${(amount as number).toLocaleString()}</span></div>)}
              </div>
              <div className="space-y-3 border-l border-white/20 pl-4">
                <div className="flex justify-between"><span className="opacity-80">Итого эскроу</span><span className="text-2xl font-bold text-[#B8860B]">${calculations.totalEscrow.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="opacity-80">Комиссия InCORE ({PLATFORM_FEE_PERCENT}%)</span><span className="font-bold">${calculations.platformFee.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="opacity-80">Выплата агенту</span><span className="font-bold">${calculations.agentPayout.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="opacity-80">Прибыль компании</span><span className="font-bold text-[#B8860B]">${calculations.companyProfit.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="opacity-80">ROI</span><span className="font-bold text-[#B8860B]">{calculations.roi}%</span></div>
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t border-[#000052]/10">
            <button type="button" onClick={onClose} className="flex-1 py-3 px-4 bg-[#000052]/5 hover:bg-[#000052]/10 text-[#000052] rounded-lg font-semibold transition" disabled={loading}>Отмена</button>
            <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-[#B8860B] hover:bg-[#9a7209] text-white rounded-lg font-semibold transition flex items-center justify-center gap-2 disabled:opacity-50">{loading ? 'Создание...' : 'Создать контракт'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
