import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calculator, Users, AlertCircle, ChevronDown, Target, Phone, Handshake, FileText, TrendingUp } from 'lucide-react';
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
  const [minCheck, setMinCheck] = useState<number | ''>('');
  const [targetConversion, setTargetConversion] = useState<number | ''>('');
  const [avgCheck, setAvgCheck] = useState<number | ''>('');
  const [targetClients, setTargetClients] = useState<number | ''>('');

  const [kpiSuggestions, setKpiSuggestions] = useState({
    calls: 0,
    meetings: 0,
    proposals: 0,
    clients: 0,
  });

  // Поля для расчета потоков выплат
  const [renewalAmount, setRenewalAmount] = useState<number | ''>('');
  const [crossSellAmount, setCrossSellAmount] = useState<number | ''>('');
  const [planBonus, setPlanBonus] = useState<number | ''>(200);
  const [annualBonus, setAnnualBonus] = useState<number | ''>('');

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

  // Автоматический расчет KPI из плановой выручки
  useEffect(() => {
    const rev = typeof revenue === 'number' ? revenue : 0;
    const avg = typeof avgCheck === 'number' && avgCheck > 0 ? avgCheck : 500000;
    const conv = typeof targetConversion === 'number' && targetConversion > 0 ? targetConversion / 100 : 0.20;

    const clients = Math.ceil(rev / avg);
    const meetings = Math.ceil(clients / conv);
    const calls = Math.ceil(meetings / 0.7);
    const proposals = Math.ceil(meetings * 0.8);

    setKpiSuggestions({ calls, meetings, proposals, clients });
  }, [revenue, avgCheck, targetConversion]);

  const [economics, setEconomics] = useState({
    platformFee: 0,
    escrow: 0,
    newSalesPayout: 0,
    renewalPayout: 0,
    crossSellPayout: 0,
    planBonusPayout: 0,
    annualBonusMonthly: 0,
    totalAgentPayouts: 0,
    escrowRemainder: 0,
    companyProfit: 0,
  });

  useEffect(() => {
    const rev = typeof revenue === 'number' ? revenue : 0;
    
    // СТРОГАЯ ЛОГИКА INCORE: 12% платформе, 88% в эскроу (максимальный бюджет на выплаты агенту)
    const platformFee = rev * 0.12;
    const escrow = rev * 0.88;
    
    // Расчет потоков выплат агенту
    const newSalesPayout = rev * 0.10; // 10% от суммы контракта
    const renewalPayout = (typeof renewalAmount === 'number' ? renewalAmount : 0) * 0.03; // 3% от суммы продления
    const crossSellPayout = (typeof crossSellAmount === 'number' ? crossSellAmount : 0) * 0.07; // 7% от суммы кросс-продажи
    const planBonusPayout = typeof planBonus === 'number' ? planBonus : 0; // Фиксированная сумма за KPI
    const annualBonusMonthly = (typeof annualBonus === 'number' ? annualBonus : 0) / 12; // 1/12 в месяц
    
    // Итого выплат агенту
    const totalAgentPayouts = newSalesPayout + renewalPayout + crossSellPayout + planBonusPayout + annualBonusMonthly;
    
    // Остаток эскроу (вернется компании, если агент не выполнит все KPI)
    const escrowRemainder = escrow - totalAgentPayouts;
    
    // Прибыль компании = GMV - комиссия платформы - фактические выплаты агенту
    const companyProfit = rev - platformFee - totalAgentPayouts;

    setEconomics({
      platformFee,
      escrow,
      newSalesPayout,
      renewalPayout,
      crossSellPayout,
      planBonusPayout,
      annualBonusMonthly,
      totalAgentPayouts,
      escrowRemainder,
      companyProfit,
    });
  }, [revenue, renewalAmount, crossSellAmount, planBonus, annualBonus]);

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
        min_check: typeof minCheck === 'number' ? minCheck : 0,
        target_conversion: typeof targetConversion === 'number' ? targetConversion : 20,
        avg_check: typeof avgCheck === 'number' ? avgCheck : 500000,
        target_clients: finalClients,
        escrow_amount: economics.escrow,
        agent_payouts_total: economics.totalAgentPayouts,
        company_profit: economics.companyProfit,
        roi_percentage: 0,
        deadline: deadline,
        status: selectedAgentId ? 'PENDING_APPROVAL' : 'DRAFT',
        created_at: new Date().toISOString(),
      });

      if (error) throw error;

      onCreated();
      onClose();
      setTitle('');
      setRevenue('');
      setDeadline('');
      setSelectedAgentId('');
      setKpiCalls('');
      setKpiMeetings('');
      setKpiProposals('');
      setMinCheck('');
      setTargetConversion('');
      setAvgCheck('');
      setTargetClients('');
      setRenewalAmount('');
      setCrossSellAmount('');
      setPlanBonus(200);
      setAnnualBonus('');
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
                    placeholder="500000"
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
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('contractModal.minCheck')}</label>
                  <input
                    type="number"
                    value={minCheck}
                    onChange={(e) => setMinCheck(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full px-3 py-2 bg-white border border-gray-300 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10"
                    placeholder="100000"
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

            {/* Распределение GMV */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm font-semibold text-[#000052]">{t('contractModal.escrowAvailable')} (88%)</span>
                <span className="font-bold text-[#000052] text-lg">
                  ${economics.escrow.toLocaleString()}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">{t('contractModal.platformFee')} (12%)</span>
                <span className="font-semibold text-gray-500">
                  ${economics.platformFee.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 6 потоков выплат */}
            {rev > 0 && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-bold text-[#000052] uppercase mb-3">{t('contractModal.streamsTitle')}</p>
                <div className="space-y-3">
                  {/* Новые продажи */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#000052]"></div>
                    <span className="flex-1 text-gray-700">Новые продажи (10% от контракта)</span>
                    <span className="font-semibold text-[#000052]">${economics.newSalesPayout.toLocaleString()}</span>
                  </div>

                  {/* Продление */}
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
                      placeholder="Сумма продления"
                      min="0"
                    />
                    <div className="text-right text-xs font-semibold text-[#000052]">${economics.renewalPayout.toLocaleString()}</div>
                  </div>

                  {/* Кросс-продажи */}
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
                      placeholder="Сумма кросс-продажи"
                      min="0"
                    />
                    <div className="text-right text-xs font-semibold text-[#000052]">${economics.crossSellPayout.toLocaleString()}</div>
                  </div>

                  {/* Бонус за план */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-purple-500"></div>
                      <span className="flex-1 text-gray-700">Бонус за выполнение плана (фиксированная сумма)</span>
                    </div>
                    <input
                      type="number"
                      value={planBonus}
                      onChange={(e) => setPlanBonus(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-[#000052] focus:outline-none focus:ring-1 focus:ring-[#000052]/20"
                      placeholder="200"
                      min="0"
                    />
                    <div className="text-right text-xs font-semibold text-[#000052]">${economics.planBonusPayout.toLocaleString()}</div>
                  </div>

                  {/* Удержание */}
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-2 h-2 rounded-full bg-[#B8860B]"></div>
                    <span className="flex-1 text-gray-700">Удержание (клиент {">"} 90 дней)</span>
                    <span className="font-semibold text-[#B8860B]">Clawback</span>
                  </div>

                  {/* Годовой бонус */}
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <span className="flex-1 text-gray-700">Годовой бонус (1/12 в месяц)</span>
                    </div>
                    <input
                      type="number"
                      value={annualBonus}
                      onChange={(e) => setAnnualBonus(e.target.value === '' ? '' : Number(e.target.value))}
                      className="w-full px-2 py-1 border border-gray-300 rounded text-xs text-[#000052] focus:outline-none focus:ring-1 focus:ring-[#000052]/20"
                      placeholder="Годовая сумма"
                      min="0"
                    />
                    <div className="text-right text-xs font-semibold text-[#000052]">${economics.annualBonusMonthly.toLocaleString()}/мес</div>
                  </div>
                </div>

                {/* Итого */}
                <div className="mt-4 pt-3 border-t border-gray-200 space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-[#000052]">Итого выплат агенту:</span>
                    <span className="font-bold text-[#000052]">${economics.totalAgentPayouts.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-gray-600">Остаток эскроу (вернется компании):</span>
                    <span className="font-semibold text-green-600">${economics.escrowRemainder.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Прибыль компании */}
            <div className="mb-6 p-3 bg-green-50 rounded-lg border border-green-200">
              <div className="flex justify-between items-center">
                <span className="text-sm font-semibold text-[#000052]">{t('contractModal.companyProfit')}</span>
                <span className="font-bold text-green-600 text-lg">
                  ${economics.companyProfit.toLocaleString()}
                </span>
              </div>
            </div>

            {/* Clawback */}
            <div className="mb-6 p-4 bg-[#B8860B]/10 border border-[#B8860B]/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#000052]">{t('contractModal.clawbackTitle')}</p>
                  <p className="text-xs text-gray-700 mt-1">
                    {t('contractModal.clawbackDesc')} {t('contractModal.clawbackDesc2')}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={!isFormValid || loading}
              className={'w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ' + (isFormValid ? 'bg-[#000052] hover:bg-[#000066] text-white shadow-lg' : 'bg-gray-200 text-gray-500 cursor-not-allowed')}
            >
              {loading ? t('contractModal.creating') : t('contractModal.publish')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}