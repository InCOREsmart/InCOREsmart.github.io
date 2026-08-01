import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calculator, Users, AlertCircle, ChevronDown, Target, Phone, Handshake, FileText, TrendingUp, ShieldCheck } from 'lucide-react';
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

export function CreateContractModal({ isOpen, onClose, onCreated }: CreateContractModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();

  const [title, setTitle] = useState('');
  const [revenue, setRevenue] = useState<number | ''>('');
  const [deadline, setDeadline] = useState('');
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(false);

  const [kpiCalls, setKpiCalls] = useState<number | ''>('');
  const [kpiMeetings, setKpiMeetings] = useState<number | ''>('');
  const [kpiProposals, setKpiProposals] = useState<number | ''>('');
  const [targetConversion, setTargetConversion] = useState<number | ''>('');
  const [avgCheck, setAvgCheck] = useState<number | ''>('');
  const [targetClients, setTargetClients] = useState<number | ''>('');

  const [kpiSuggestions, setKpiSuggestions] = useState({
    calls: 0,
    meetings: 0,
    proposals: 0,
    clients: 0,
  });

  const [renewalAmount, setRenewalAmount] = useState<number | ''>('');
  const [crossSellAmount, setCrossSellAmount] = useState<number | ''>('');
  const [annualBonus, setAnnualBonus] = useState<number | ''>('');
  
  // Новое поле для интеграции с Битрикс24
  const [bitrixDealId, setBitrixDealId] = useState('');

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

  useEffect(() => {
    const rev = typeof revenue === 'number' ? revenue : 0;
    const avg = typeof avgCheck === 'number' && avgCheck > 0 ? avgCheck : 100000;
    const conv = typeof targetConversion === 'number' && targetConversion > 0 ? targetConversion / 100 : 0.20;

    const clients = Math.ceil(rev / avg);
    const meetings = Math.ceil(clients / conv);
    const calls = Math.ceil(meetings / 0.4);
    const proposals = Math.ceil(meetings * 0.7);

    setKpiSuggestions({ calls, meetings, proposals, clients });
  }, [revenue, avgCheck, targetConversion]);

  const [economics, setEconomics] = useState({
    platformFee: 0,
    companyProfitBeforeBonuses: 0,
    newSalesBonus: 0,
    renewalBonus: 0,
    crossSellBonus: 0,
    annualBonusYearly: 0,
    annualBonusMonthly: 0,
    totalAgentBonuses: 0,
    escrow: 0,
    companyProfit: 0,
  });

  useEffect(() => {
    const rev = typeof revenue === 'number' ? revenue : 0;
    
    const platformFee = rev * 0.12;
    const companyProfitBeforeBonuses = rev * 0.88;
    
    const newSalesBonus = rev * 0.10;
    const renewalBonus = (typeof renewalAmount === 'number' ? renewalAmount : 0) * 0.03;
    const crossSellBonus = (typeof crossSellAmount === 'number' ? crossSellAmount : 0) * 0.07;
    
    const annualBonusYearly = typeof annualBonus === 'number' ? annualBonus : 0;
    const annualBonusMonthly = annualBonusYearly / 12;
    
    const totalAgentBonuses = newSalesBonus + renewalBonus + crossSellBonus;
    const companyProfit = companyProfitBeforeBonuses - totalAgentBonuses - annualBonusYearly;

    setEconomics({
      platformFee,
      companyProfitBeforeBonuses,
      newSalesBonus,
      renewalBonus,
      crossSellBonus,
      annualBonusYearly,
      annualBonusMonthly,
      totalAgentBonuses,
      escrow: totalAgentBonuses,
      companyProfit,
    });
  }, [revenue, renewalAmount, crossSellAmount, annualBonus]);

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
        alert(t('contractModal.errorNoCompany'));
        setLoading(false);
        return;
      }

      const finalCalls = typeof kpiCalls === 'number' ? kpiCalls : kpiSuggestions.calls;
      const finalMeetings = typeof kpiMeetings === 'number' ? kpiMeetings : kpiSuggestions.meetings;
      const finalProposals = typeof kpiProposals === 'number' ? kpiProposals : kpiSuggestions.proposals;
      const finalClients = typeof targetClients === 'number' ? targetClients : kpiSuggestions.clients;

      const generatedDescription = title + ' | KPI: ' + finalCalls + ' ' + t('contractModal.kpiCallsLabel') + ', ' + finalMeetings + ' ' + t('contractModal.kpiMeetingsLabel') + ', ' + finalProposals + ' ' + t('contractModal.kpiProposalsLabel') + ', ' + finalClients + ' ' + t('contractModal.kpiClientsLabel');

      const { error } = await supabase.from('contracts').insert({
        company_id: companyData.id,
        agent_id: selectedAgentId || null,
        title: title,
        description: generatedDescription,
        kpi_revenue: revenue,
        revenue: revenue,
        kpi_calls: finalCalls,
        kpi_meetings: finalMeetings,
        kpi_proposals: finalProposals,
        target_conversion: typeof targetConversion === 'number' ? targetConversion : 20,
        avg_check: typeof avgCheck === 'number' ? avgCheck : 100000,
        target_clients: finalClients,
        escrow_amount: economics.escrow,
        agent_payouts_total: economics.totalAgentBonuses,
        company_profit: economics.companyProfit,
        roi_percentage: 0,
        deadline: deadline,
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
        // Добавлено поле для связи с Битрикс24
        bitrix_deal_id: bitrixDealId || null,
      });

      if (error) throw error;

      alert(`✅ Эскроу успешно захеджирован!\n\nСумма эскроу: $${economics.escrow.toLocaleString()}\nСтатус: ACTIVE\n\nСредства заблокированы в смарт-контракте и будут выплачены агенту по выполнению KPI.`);

      onCreated();
      onClose();
      
      // Очистка формы
      setTitle('');
      setRevenue('');
      setDeadline('');
      setSelectedAgentId('');
      setKpiCalls('');
      setKpiMeetings('');
      setKpiProposals('');
      setTargetConversion('');
      setAvgCheck('');
      setTargetClients('');
      setRenewalAmount('');
      setCrossSellAmount('');
      setAnnualBonus('');
      setBitrixDealId(''); // Очистка нового поля
    } catch (err) {
      console.error('Ошибка создания контракта:', err);
      alert(t('common.error') + ': ' + (err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const isFormValid = typeof revenue === 'number' && revenue > 0 && title && deadline;
  const rev = typeof revenue === 'number' ? revenue : 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#000052]">{t('contractModal.title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.goal')} *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                placeholder={t('contractModal.goalPlaceholder')}
                required
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.assignAgent')}</label>
              <div className="relative">
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052] appearance-none"
                >
                  <option value="">{t('contractModal.selectAgentPlaceholder')}</option>
                  {agents.map((agent) => (
                    <option key={agent.id} value={agent.id}>
                      {agent.full_name} {agent.specialization ? '(' + agent.specialization + ')' : ''}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
              </div>
            </div>

            {/* Новое поле для ID сделки в Битрикс24 */}
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">
                ID сделки в Битрикс24 (опционально)
              </label>
              <input
                type="text"
                value={bitrixDealId}
                onChange={(e) => setBitrixDealId(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                placeholder="Например: 456"
              />
              <p className="text-xs text-gray-500 mt-1">Укажите ID сделки, чтобы KPI обновлялись автоматически из CRM</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.plannedRevenue')} *</label>
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
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.deadline')} *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                  required
                />
              </div>
            </div>

            <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[#000052]" />
                <h3 className="text-sm font-bold text-[#000052]">{t('contractModal.kpiTitle')}</h3>
                <span className="text-xs text-gray-500 ml-auto">{t('contractModal.kpiOptional')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Phone className="w-3 h-3 inline mr-1" />
                    {t('contractModal.calls')}
                  </label>
                  <input
                    type="number"
                    value={kpiCalls}
                    onChange={(e) => setKpiCalls(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                    placeholder={String(kpiSuggestions.calls)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Handshake className="w-3 h-3 inline mr-1" />
                    {t('contractModal.meetings')}
                  </label>
                  <input
                    type="number"
                    value={kpiMeetings}
                    onChange={(e) => setKpiMeetings(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                    placeholder={String(kpiSuggestions.meetings)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <FileText className="w-3 h-3 inline mr-1" />
                    {t('contractModal.proposals')}
                  </label>
                  <input
                    type="number"
                    value={kpiProposals}
                    onChange={(e) => setKpiProposals(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                    placeholder={String(kpiSuggestions.proposals)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Users className="w-3 h-3 inline mr-1" />
                    {t('contractModal.targetClients')}
                  </label>
                  <input
                    type="number"
                    value={targetClients}
                    onChange={(e) => setTargetClients(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                    placeholder={String(kpiSuggestions.clients)}
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <TrendingUp className="w-3 h-3 inline mr-1" />
                    {t('contractModal.avgCheck')}
                  </label>
                  <input
                    type="number"
                    value={avgCheck}
                    onChange={(e) => setAvgCheck(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                    placeholder="100000"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('contractModal.targetConversion')}</label>
                  <input
                    type="number"
                    value={targetConversion}
                    onChange={(e) => setTargetConversion(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                    placeholder="20"
                    min="1"
                    max="100"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-[#B8860B]" />
              <h3 className="text-lg font-bold text-[#000052]">{t('contractModal.unitEconomics')}</h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm font-semibold text-[#000052]">Плановая выручка (GMV)</span>
                <span className="font-bold text-[#000052] text-lg">
                  ${rev.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">{t('contractModal.platformFee')} (12%)</span>
                <span className="font-semibold text-gray-500">
                  ${economics.platformFee.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                <span className="text-sm font-semibold text-[#000052]">Прибыль компании до бонусов (88%)</span>
                <span className="font-bold text-green-600">
                  ${economics.companyProfitBeforeBonuses.toLocaleString()}
                </span>
              </div>
            </div>

            {rev > 0 && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-bold text-[#000052] uppercase mb-3">Бонусы агента (эскроу)</p>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#000052]"></div>
                    <span className="flex-1 text-gray-700">Новые продажи (10%)</span>
                    <span className="font-semibold text-[#000052]">${economics.newSalesBonus.toLocaleString()}</span>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                      <span className="flex-1 text-gray-700">Продление (3% от суммы)</span>
                    </div>
                    <input
                      type="number"
                      value={renewalAmount}
                      onChange={(e) => setRenewalAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-[#000052] focus:outline-none focus:ring-1 focus:ring-[#000052]/20"
                      placeholder="Прогнозная сумма продления"
                      min="0"
                    />
                    <div className="text-right text-xs font-semibold text-[#000052]">${economics.renewalBonus.toLocaleString()}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-indigo-500"></div>
                      <span className="flex-1 text-gray-700">Кросс-продажи (7% от суммы)</span>
                    </div>
                    <input
                      type="number"
                      value={crossSellAmount}
                      onChange={(e) => setCrossSellAmount(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-[#000052] focus:outline-none focus:ring-1 focus:ring-[#000052]/20"
                      placeholder="Прогнозная сумма кросс-продажи"
                      min="0"
                    />
                    <div className="text-right text-xs font-semibold text-[#000052]">${economics.crossSellBonus.toLocaleString()}</div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-gray-200">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#000052]">Итого бонусов в эскроу:</span>
                    <span className="font-bold text-[#000052]">${economics.totalAgentBonuses.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            <div className="mb-6 p-4 bg-purple-50 rounded-lg border border-purple-200">
              <p className="text-xs font-bold text-[#000052] uppercase mb-3">Годовой бонус (не эскроу)</p>
              <div className="space-y-1">
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                  <span className="flex-1 text-gray-700">Годовая сумма при 100% выполнении плана</span>
                </div>
                <input
                  type="number"
                  value={annualBonus}
                  onChange={(e) => setAnnualBonus(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-[#000052] focus:outline-none focus:ring-1 focus:ring-[#000052]/20"
                  placeholder="150000"
                  min="0"
                />
                {economics.annualBonusMonthly > 0 && (
                  <div className="flex justify-between text-xs font-semibold text-[#000052]">
                    <span>Ежемесячная выплата (1/12):</span>
                    <span>${economics.annualBonusMonthly.toLocaleString()}/мес</span>
                  </div>
                )}
              </div>
            </div>

            <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[#000052]">{t('contractModal.companyProfit')}</span>
                <span className="font-bold text-green-600 text-lg">
                  ${economics.companyProfit.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Блок хеджирования */}
            {economics.escrow > 0 && (
              <div className="mb-6 p-4 bg-[#B8860B]/10 border border-[#B8860B]/30 rounded-lg">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#000052]">Хеджирование рисков</p>
                    <p className="text-xs text-gray-700 mt-1">
                      Сумма эскроу <span className="font-bold text-[#B8860B]">${economics.escrow.toLocaleString()}</span> будет заблокирована в смарт-контракте и выплачена агенту только по выполнению KPI.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={'w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ' + (isFormValid ? 'bg-[#B8860B] hover:bg-[#9a7209] text-white shadow-lg' : 'bg-gray-200 text-gray-500 cursor-not-allowed')}
            >
              <ShieldCheck className="w-5 h-5" />
              {loading ? 'Создание...' : 'Оплатить эскроу и опубликовать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}