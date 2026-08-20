import { useState, useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import { X, DollarSign, Users, Shield, TrendingUp, AlertTriangle, Calculator } from 'lucide-react';
import { createPayoutStreamsForContract, PLATFORM_FEE_PERCENT } from '../../lib/smartContractLogic';
import { calculateContractFinancials } from '../../lib/contractFinance';

interface CreateContractModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: () => void;
  initialRoleId?: string;
}

export function CreateContractModal({ isOpen, onClose, onCreated, initialRoleId }: CreateContractModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [agents, setAgents] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [companyId, setCompanyId] = useState<string | null>(null);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [agentId, setAgentId] = useState('');
  const [roleId, setRoleId] = useState(initialRoleId || '');
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
        const { data: companyData, error: companyError } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyError) { console.error('Ошибка поиска компании CEO:', companyError); setCompanyId(null); return; }
        if (companyData) {
          setCompanyId(companyData.id);
          const [{ data: agentsData }, { data: rolesData }] = await Promise.all([
            supabase.from('agents').select('id, full_name, specialization').eq('company_id', companyData.id).eq('status', 'ACTIVE'),
            supabase.from('roles').select('id, name, description, industry').eq('company_id', companyData.id).eq('is_active', true).order('name', { ascending: true }),
          ]);
          setAgents(agentsData || []);
          setRoles(rolesData || []);
          if (initialRoleId) setRoleId(initialRoleId);
        } else {
          setCompanyId(null); setAgents([]); setRoles([]);
          console.error('Для текущего пользователя CEO не найдена компания:', user.id);
        }
      } catch (err) {
        console.error('Ошибка загрузки данных:', err); setCompanyId(null);
      }
    };
    loadData();
  }, [isOpen, user, initialRoleId]);

  const calculations = useMemo(() => {
    const propertyRevenue = targetClientsNew * avgCheckProperty;
    const cascoRevenue = targetClientsNew * avgCheckCasco;
    const dmsRevenue = targetClientsNew * avgCheckDms;
    const renewalRevenue = targetClientsRenewal * avgCheckRenewal;
    const crossSellRevenue = targetClientsCrossSell * avgCheckCrossSell;
    const finance = calculateContractFinancials({ property: propertyRevenue, casco: cascoRevenue, dms: dmsRevenue, renewal: renewalRevenue, crossSell: crossSellRevenue }, planBonusPercent, retentionBonus, annualBonus);

    return {
      propertyRevenue, cascoRevenue, dmsRevenue,
      totalNewSalesRevenue: propertyRevenue + cascoRevenue + dmsRevenue,
      renewalRevenue, crossSellRevenue,
      totalContractRevenue: finance.totalContractRevenue,
      bonusProperty: finance.bonusProperty,
      bonusCasco: finance.bonusCasco,
      bonusDms: finance.bonusDms,
      bonusNewSales: finance.bonusProperty + finance.bonusCasco + finance.bonusDms,
      bonusRenewal: finance.bonusRenewal,
      bonusCrossSell: finance.bonusCrossSell,
      bonusPlan: finance.bonusPlan,
      bonusRetention: finance.bonusRetention,
      bonusAnnual: finance.bonusAnnual,
      totalEscrow: finance.totalEscrow,
      platformFee: finance.platformFee,
      agentPayout: finance.agentPayout,
      companyProfit: finance.companyProfit,
      roi: finance.roi,
    };
  }, [targetClientsNew, avgCheckProperty, avgCheckCasco, avgCheckDms, targetClientsRenewal, avgCheckRenewal, targetClientsCrossSell, avgCheckCrossSell, planBonusPercent, retentionBonus, annualBonus]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) { alert('Заполните название контракта'); return; }
    if (!description.trim()) { alert('Заполните описание контракта'); return; }
    if (!agentId) { alert('Выберите агента'); return; }
    if (!deadline) { alert('Укажите дедлайн'); return; }
    if (targetClientsNew <= 0 || targetClientsRenewal <= 0 || targetClientsCrossSell <= 0) { alert('Количество клиентов должно быть больше 0'); return; }
    if (avgCheckProperty <= 0 || avgCheckCasco <= 0 || avgCheckDms <= 0 || avgCheckRenewal <= 0 || avgCheckCrossSell <= 0) { alert('Средний чек должен быть больше 0'); return; }
    if (!user) { alert('Ошибка: пользователь не найден'); return; }

    setLoading(true);
    try {
      const { data: currentCompany, error: companyError } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
      if (companyError) throw new Error(`Не удалось определить компанию: ${companyError.message}`);
      if (!currentCompany) throw new Error('Для текущего пользователя не найдена компания. Войдите под регистрацией CEO этой компании.');
      const currentCompanyId = currentCompany.id;

      const { data: selectedAgent, error: agentError } = await supabase.from('agents').select('id').eq('id', agentId).eq('company_id', currentCompanyId).maybeSingle();
      if (agentError) throw new Error(`Не удалось проверить агента: ${agentError.message}`);
      if (!selectedAgent) throw new Error('Выбранный агент не относится к вашей компании. Обновите страницу и выберите агента заново.');

      if (roleId) {
        const { data: selectedRole, error: roleError } = await supabase.from('roles').select('id').eq('id', roleId).eq('company_id', currentCompanyId).maybeSingle();
        if (roleError) throw new Error(`Не удалось проверить роль: ${roleError.message}`);
        if (!selectedRole) throw new Error('Выбранная роль не относится к вашей компании. Обновите страницу и выберите роль заново.');
      }

      const { data: contract, error: contractError } = await supabase.from('contracts').insert({
        company_id: currentCompanyId,
        agent_id: agentId,
        role_id: roleId || null,
        title,
        description,
        status: 'DRAFT',
        escrow_amount: calculations.totalEscrow,
        revenue: 0,
        planned_revenue: calculations.totalContractRevenue,
        target_clients_new: targetClientsNew,
        target_clients_renewal: targetClientsRenewal,
        target_clients_cross_sell: targetClientsCrossSell,
        agent_payouts_total: calculations.agentPayout,
        company_profit: 0,
        platform_fee: calculations.platformFee,
        roi_percentage: 0,
        reward_type: 'standard_b2b',
        deadline,
      }).select().single();

      if (contractError) throw contractError;
      if (!contract) throw new Error('Контракт не создан');

      const { error: streamsError } = await createPayoutStreamsForContract(contract.id, calculations.totalContractRevenue, {
        property: calculations.bonusProperty,
        casco: calculations.bonusCasco,
        dms: calculations.bonusDms,
        renewal: calculations.bonusRenewal,
        crossSell: calculations.bonusCrossSell,
        planBonus: calculations.bonusPlan,
        retention: calculations.bonusRetention,
      });
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
    setTitle(''); setDescription(''); setAgentId(''); setRoleId(''); setDeadline('');
    setTargetClientsNew(10); setAvgCheckProperty(375); setAvgCheckCasco(375); setAvgCheckDms(375);
    setTargetClientsRenewal(10); setAvgCheckRenewal(375); setTargetClientsCrossSell(10); setAvgCheckCrossSell(375);
    setPlanBonusPercent(10); setRetentionBonus(200); setAnnualBonus(7000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl border border-[#000052]/10 my-8">
        <div className="flex items-center justify-between p-6 border-b border-[#000052]/10">
          <div><h2 className="text-2xl font-bold text-[#000052]">Создание смарт-контракта</h2><p className="text-sm text-[#000052]/60 mt-1">Расчёт эскроу и 7 потоков выплат в реальном времени</p></div>
          <button onClick={onClose} className="p-2 hover:bg-[#000052]/5 rounded-full transition"><X className="w-6 h-6 text-[#000052]" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2"><label className="block text-sm font-semibold text-[#000052] mb-1.5">Название контракта *</label><input type="text" value={title} onChange={e => setTitle(e.target.value)} placeholder="Привлечь 30 корпоративных клиентов" className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required /></div>
            <div className="md:col-span-2"><label className="block text-sm font-semibold text-[#000052] mb-1.5">Описание *</label><textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Описание целей и задач контракта" className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required /></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Агент *</label><select value={agentId} onChange={e => setAgentId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8862B]/30" required><option value="">Выберите агента</option>{agents.map(agent => <option key={agent.id} value={agent.id}>{agent.full_name} ({agent.specialization || 'без специализации'})</option>)}</select></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Роль</label><select value={roleId} onChange={e => setRoleId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]"><option value="">Без привязки к роли</option>{roles.map(role => <option key={role.id} value={role.id}>{role.name}</option>)}</select><p className="text-xs text-gray-400 mt-1.5">Роль определяет навыки и критерии верификации. Финансовые расчёты контракта от неё не зависят.</p></div>
            <div><label className="block text-sm font-semibold text-[#000052] mb-1.5">Дедлайн *</label><input type="date" value={deadline} onChange={e => setDeadline(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052]" required /></div>
          </div>

          <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><DollarSign className="w-5 h-5 text-[#B8860B]" />Новые продажи</h3><div className="mb-4"><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов *</label><input type="number" value={targetClientsNew} onChange={e => setTargetClientsNew(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm text-[#000052] max-w-xs" required /></div><div className="text-xs font-semibold text-[#000052]/70 mb-2">Средний чек</div><div className="grid grid-cols-1 md:grid-cols-3 gap-4">{([['Имущество/риски (20%)', avgCheckProperty, setAvgCheckProperty, calculations.propertyRevenue, calculations.bonusProperty],['Автопарки КАСКО (15%)', avgCheckCasco, setAvgCheckCasco, calculations.cascoRevenue, calculations.bonusCasco],['Медицина ДМС (10%)', avgCheckDms, setAvgCheckDms, calculations.dmsRevenue, calculations.bonusDms]] as Array<[string, number, (value: number) => void, number, number]>).map(([label, value, setter, revenue, bonus]) => <div key={label} className="bg-white p-3 rounded-lg border border-[#000052]/10"><div className="text-xs text-[#000052]/50 mb-2">{label}</div><input type="number" value={value} onChange={e => setter(Number(e.target.value))} min={1} className="w-full px-3 py-2 border border-[#000052]/20 rounded-lg text-sm" /><div className="mt-2 text-xs text-[#000052]/60">Выручка: ${revenue.toLocaleString()}</div><div className="text-xs text-[#000052]/60">Бонус: ${bonus.toLocaleString()}</div></div>)}</div></div>

          <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><Users className="w-5 h-5 text-[#B8860B]" />Продления</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов *</label><input type="number" value={targetClientsRenewal} onChange={e => setTargetClientsRenewal(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm" required /></div><div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Средний чек *</label><input type="number" value={avgCheckRenewal} onChange={e => setAvgCheckRenewal(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm" required /></div></div></div>

          <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-[#B8860B]" />Кросс-продажи</h3><div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Кол-во клиентов *</label><input type="number" value={targetClientsCrossSell} onChange={e => setTargetClientsCrossSell(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm" required /></div><div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Средний чек *</label><input type="number" value={avgCheckCrossSell} onChange={e => setAvgCheckCrossSell(Number(e.target.value))} min={1} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm" required /></div></div></div>

          <div className="bg-[#000052]/5 p-5 rounded-xl border border-[#000052]/10"><h3 className="text-lg font-bold text-[#000052] mb-4 flex items-center gap-2"><Shield className="w-5 h-5 text-[#B8860B]" />Бонусы</h3><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Бонус за план (%)</label><input type="number" value={planBonusPercent} onChange={e => setPlanBonusPercent(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm" /></div><div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Бонус за удержание</label><input type="number" value={retentionBonus} onChange={e => setRetentionBonus(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm" /></div><div><label className="block text-xs font-semibold text-[#000052]/70 mb-1">Годовой бонус</label><input type="number" value={annualBonus} onChange={e => setAnnualBonus(Number(e.target.value))} min={0} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded-lg text-sm" /></div></div></div>

          <div className="bg-white p-5 rounded-xl border-2 border-[#B8860B]/30"><div className="flex items-center gap-2 mb-4"><Calculator className="w-5 h-5 text-[#B8860B]" /><h3 className="text-lg font-bold text-[#000052]">Финансовая модель</h3></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4"><div><div className="text-xs text-[#000052]/50">Стоимость контракта</div><div className="text-xl font-bold text-[#000052]">${calculations.totalContractRevenue.toLocaleString()}</div></div><div><div className="text-xs text-[#000052]/50">Эскроу</div><div className="text-xl font-bold text-[#000052]">${calculations.totalEscrow.toLocaleString()}</div></div><div><div className="text-xs text-[#000052]/50">Выплата агенту</div><div className="text-xl font-bold text-[#000052]">${calculations.agentPayout.toLocaleString()}</div></div><div><div className="text-xs text-[#000052]/50">Прибыль компании</div><div className="text-xl font-bold text-[#000052]">${calculations.companyProfit.toLocaleString()}</div></div></div><div className="mt-4 grid grid-cols-2 md:grid-cols-3 gap-4 text-sm"><div><span className="text-[#000052]/50">Комиссия платформы:</span> <strong>${calculations.platformFee.toLocaleString()}</strong></div><div><span className="text-[#000052]/50">ROI:</span> <strong>{calculations.roi.toFixed(1)}%</strong></div><div><span className="text-[#000052]/50">Всего потоков:</span> <strong>7</strong></div></div></div>

          <div className="flex justify-end gap-3 pt-4 border-t border-[#000052]/10"><button type="button" onClick={onClose} disabled={loading} className="px-5 py-2.5 rounded-lg border border-[#000052]/20 text-[#000052] hover:bg-[#000052]/5 disabled:opacity-50">Отмена</button><button type="submit" disabled={loading} className="px-5 py-2.5 rounded-lg bg-[#000052] text-white hover:bg-[#000052]/90 disabled:opacity-50">{loading ? 'Создание...' : 'Создать смарт-контракт'}</button></div>
        </form>
      </div>
    </div>
  );
}
