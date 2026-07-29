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
    retentionBonus: 0,
    otherPayouts: 0,
    companyProfit: 0,
    roi: 0,
  });

  useEffect(() => {
    const rev = typeof revenue === 'number' ? revenue : 0;
    const platformFee = rev * 0.12;
    const escrow = rev * 0.132;
    const retentionBonus = escrow * 0.10;
    const otherPayouts = escrow * 0.90;
    const companyProfit = rev - escrow - platformFee;
    const roi = escrow > 0 ? (companyProfit / escrow) * 100 : 0;

    setEconomics({ platformFee, escrow, retentionBonus, otherPayouts, companyProfit, roi });
  }, [revenue]);

  const formatMoney = (amount: number) => {
    return '$' + new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(amount);
  };

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
        alert(t('contractModal.errorNoCompany', 'Ошибка: Компания не найдена. Заполните данные в настройках.'));
        setLoading(false);
        return;
      }

      const finalCalls = typeof kpiCalls === 'number' ? kpiCalls : kpiSuggestions.calls;
      const finalMeetings = typeof kpiMeetings === 'number' ? kpiMeetings : kpiSuggestions.meetings;
      const finalProposals = typeof kpiProposals === 'number' ? kpiProposals : kpiSuggestions.proposals;
      const finalClients = typeof targetClients === 'number' ? targetClients : kpiSuggestions.clients;

      const generatedDescription = title + ' | KPI: ' + finalCalls + ' ' + t('contractModal.kpiCallsLabel', 'звонков') + ', ' + finalMeetings + ' ' + t('contractModal.kpiMeetingsLabel', 'встреч') + ', ' + finalProposals + ' ' + t('contractModal.kpiProposalsLabel', 'КП') + ', ' + finalClients + ' ' + t('contractModal.kpiClientsLabel', 'клиентов');

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
        agent_payouts_total: economics.escrow,
        company_profit: economics.companyProfit,
        roi_percentage: economics.roi,
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
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-gray-200">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-2xl font-bold text-[#000052]">{t('contractModal.title', 'Создать смарт-контракт')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.goal', 'Цель контракта')} *</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                placeholder={t('contractModal.goalPlaceholder', 'Например: Привлечение 10 корпоративных клиентов в сегменте B2B')}
                required
              />
            </div>

            <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-200">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[#000052]" />
                <h3 className="text-sm font-bold text-[#000052]">{t('contractModal.kpiTitle', 'KPI контракта')}</h3>
                <span className="text-xs text-gray-500 ml-auto">{t('contractModal.kpiOptional', 'Не обязательно — система подскажет')}</span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    <Phone className="w-3 h-3 inline mr-1" />
                    {t('contractModal.calls', 'Звонки')}
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
                    {t('contractModal.meetings', 'Встречи')}
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
                    {t('contractModal.proposals', 'Коммерческие предложения')}
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
                    {t('contractModal.targetClients', 'Целевые клиенты')}
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
                    {t('contractModal.avgCheck', 'Средний чек ($)')}
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('contractModal.targetConversion', 'Целевая конверсия (%)')}</label>
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
                  <label className="block text-xs font-medium text-gray-700 mb-1">{t('contractModal.minCheck', 'Минимальный чек ($)')}</label>
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

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.assignAgent', 'Назначить агента')}</label>
              <div className="relative">
                <select
                  value={selectedAgentId}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052] appearance-none"
                >
                  <option value="">{t('contractModal.selectAgentPlaceholder', '-- Выберите исполнителя (или сохраните как черновик) --')}</option>
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
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.plannedRevenue', 'Плановая выручка ($)')} *</label>
                <input
                  type="number"
                  value={revenue}
                  onChange={(e) => setRevenue(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                  placeholder="5000000"
                  min="0"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.deadline', 'Срок исполнения')} *</label>
                <input
                  type="date"
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="w-full px-4 py-2.5 bg-white border border-gray-300 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#000052]/10 focus:border-[#000052]"
                  required
                />
              </div>
            </div>
          </div>

          <div className="bg-gray-50 rounded-xl p-6 border border-gray-200">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-[#B8860B]" />
              <h3 className="text-lg font-bold text-[#000052]">{t('contractModal.unitEconomics', 'Unit-экономика контракта')}</h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                <span className="text-sm font-semibold text-[#000052]">{t('contractModal.escrowAvailable', 'Доступно в Эскроу (для выплат агенту)')}</span>
                <span className="font-bold text-[#000052] text-lg">
                  {formatMoney(economics.escrow)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">{t('contractModal.retentionBonus', 'Бонус за удержание (10% от эскроу)')}</span>
                <span className="font-semibold text-[#B8860B]">
                  {formatMoney(economics.retentionBonus)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">{t('contractModal.otherPayouts', 'Остальные выплаты (90% от эскроу)')}</span>
                <span className="font-semibold text-[#000052]">
                  {formatMoney(economics.otherPayouts)}
                </span>
              </div>

              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-gray-200">
                <span className="text-sm text-gray-600">{t('contractModal.companyProfit', 'Прибыль компании')}</span>
                <span className="font-bold text-green-600 text-lg">
                  {formatMoney(economics.companyProfit)}
                </span>
              </div>
            </div>

            {rev > 0 && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-xs font-bold text-[#000052] uppercase mb-3">{t('contractModal.streamsTitle', 'Структура выплат из эскроу')}</p>
                <div className="space-y-2">
                  {streams.map((stream) => (
                    <div key={stream.name} className="flex items-center gap-2 text-xs">
                      <div className={'w-2 h-2 rounded-full ' + stream.color}></div>
                      <span className="flex-1 text-gray-700">{stream.name}</span>
                      <span className="font-semibold text-[#000052]">{stream.percent}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="mb-6 p-4 bg-[#B8860B]/10 border border-[#B8860B]/30 rounded-lg">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#000052]">{t('contractModal.clawbackTitle', 'Clawback: Защита от фрода')}</p>
                  <p className="text-xs text-gray-700 mt-1">
                    {t('contractModal.clawbackDesc', 'Бонус за удержание')} ({formatMoney(economics.retentionBonus)}) {t('contractModal.clawbackDesc2', 'выплачивается агенту ТОЛЬКО если клиент остается с компанией более 90 дней.')}
                  </p>
                </div>
              </div>
            </div>

            <div className="mb-6 text-center">
              <p className="text-[10px] text-gray-400">
                {t('contractModal.platformFee', 'Комиссия платформы')}: {formatMoney(economics.platformFee)} (12%)
              </p>
            </div>

            <button
              type="submit"
              disabled={!isProfitable || loading || !title || !deadline}
              className={'w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ' + (isProfitable ? 'bg-[#000052] hover:bg-[#000066] text-white shadow-lg' : 'bg-gray-200 text-gray-500 cursor-not-allowed')}
            >
              {loading ? t('contractModal.creating', 'Создание...') : t('contractModal.publish', 'Опубликовать смарт-контракт')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}