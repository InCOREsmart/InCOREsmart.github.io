import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { X, Calculator, Users, ChevronDown, Target, Phone, Handshake, FileText, TrendingUp, ShieldCheck, CreditCard, CheckCircle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { notifyContractCreated } from '../../lib/notifications';

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
  const [showPayment, setShowPayment] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);

  const [kpiCalls, setKpiCalls] = useState<number | ''>('');
  const [kpiMeetings, setKpiMeetings] = useState<number | ''>('');
  const [kpiProposals, setKpiProposals] = useState<number | ''>('');
  const [targetConversion, setTargetConversion] = useState<number | ''>('');
  const [avgCheck, setAvgCheck] = useState<number | ''>('');
  const [targetClients, setTargetClients] = useState<number | ''>('');

  const [kpiSuggestions, setKpiSuggestions] = useState({ calls: 0, meetings: 0, proposals: 0, clients: 0 });
  const [renewalAmount, setRenewalAmount] = useState<number | ''>('');
  const [crossSellAmount, setCrossSellAmount] = useState<number | ''>('');
  const [bitrixDealId, setBitrixDealId] = useState('');

  useEffect(() => {
    if (isOpen && user) {
      const fetchAgents = async () => {
        const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyData) {
          const { data } = await supabase.from('agents').select('id, full_name, specialization').eq('company_id', companyData.id).eq('status', 'ACTIVE');
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
    platformFee: 0, companyProfitBeforeBonuses: 0, newSalesBonus: 0, renewalBonus: 0,
    crossSellBonus: 0, planBonus: 0, retentionBonus: 0, annualBonus: 0,
    totalAgentBonuses: 0, escrow: 0, companyProfit: 0,
  });

  useEffect(() => {
    const rev = typeof revenue === 'number' ? revenue : 0;
    const platformFee = rev * 0.12;
    const companyProfitBeforeBonuses = rev * 0.88;
    const newSalesBonus = rev * 0.50;
    const renewalBonus = (typeof renewalAmount === 'number' ? renewalAmount : 0) * 0.15;
    const crossSellBonus = (typeof crossSellAmount === 'number' ? crossSellAmount : 0) * 0.10;
    const planBonus = rev * 0.10;
    const retentionBonus = rev * 0.10;
    const annualBonus = rev * 0.05;
    const totalAgentBonuses = newSalesBonus + renewalBonus + crossSellBonus + planBonus + retentionBonus + annualBonus;
    const escrow = totalAgentBonuses;
    const companyProfit = companyProfitBeforeBonuses - totalAgentBonuses;
    setEconomics({ platformFee, companyProfitBeforeBonuses, newSalesBonus, renewalBonus, crossSellBonus, planBonus, retentionBonus, annualBonus, totalAgentBonuses, escrow, companyProfit });
  }, [revenue, renewalAmount, crossSellAmount]);

  const handlePayAndCreate = async () => {
    setShowPayment(true);
    // Имитация обработки платежа (2 секунды)
    await new Promise(resolve => setTimeout(resolve, 2000));
    setPaymentSuccess(true);
    // Ещё 1 секунда на показ успеха
    await new Promise(resolve => setTimeout(resolve, 1000));
    await createContract();
  };

  const createContract = async () => {
    if (!user || typeof revenue !== 'number') return;
    setLoading(true);
    try {
      const { data: companyData } = await supabase.from('companies').select('id').eq('user_id', user.id).maybeSingle();
      if (!companyData) { alert(t('contractModal.errorNoCompany')); setLoading(false); return; }

      const finalCalls = typeof kpiCalls === 'number' ? kpiCalls : kpiSuggestions.calls;
      const finalMeetings = typeof kpiMeetings === 'number' ? kpiMeetings : kpiSuggestions.meetings;
      const finalProposals = typeof kpiProposals === 'number' ? kpiProposals : kpiSuggestions.proposals;
      const finalClients = typeof targetClients === 'number' ? targetClients : kpiSuggestions.clients;
      const generatedDescription = title + ' | KPI: ' + finalCalls + ' зв., ' + finalMeetings + ' встр., ' + finalProposals + ' КП, ' + finalClients + ' кл.';

      const { data: newContract, error } = await supabase.from('contracts').insert({
        company_id: companyData.id,
        agent_id: selectedAgentId || null,
        title, description: generatedDescription,
        kpi_revenue: revenue, revenue,
        kpi_calls: finalCalls, kpi_meetings: finalMeetings, kpi_proposals: finalProposals,
        target_conversion: typeof targetConversion === 'number' ? targetConversion : 20,
        avg_check: typeof avgCheck === 'number' ? avgCheck : 100000,
        target_clients: finalClients,
        escrow_amount: economics.escrow,
        agent_payouts_total: economics.totalAgentBonuses,
        company_profit: economics.companyProfit,
        roi_percentage: 0, deadline, status: 'ACTIVE',
        created_at: new Date().toISOString(),
        bitrix_deal_id: bitrixDealId || null,
      }).select().single();

      if (error) throw error;

      if (selectedAgentId && newContract) {
        try {
          const { data: agentData } = await supabase.from('agents').select('user_id').eq('id', selectedAgentId).maybeSingle();
          if (agentData?.user_id) await notifyContractCreated(agentData.user_id, title, newContract.id);
        } catch (notifErr) { console.error('Ошибка уведомления:', notifErr); }
      }

      onCreated();
      onClose();
      resetForm();
    } catch (err) {
      console.error('Ошибка:', err);
      alert(t('common.error') + ': ' + (err as Error).message);
    } finally {
      setLoading(false);
      setShowPayment(false);
      setPaymentSuccess(false);
    }
  };

  const resetForm = () => {
    setTitle(''); setRevenue(''); setDeadline(''); setSelectedAgentId('');
    setKpiCalls(''); setKpiMeetings(''); setKpiProposals('');
    setTargetConversion(''); setAvgCheck(''); setTargetClients('');
    setRenewalAmount(''); setCrossSellAmount(''); setBitrixDealId('');
  };

  if (!isOpen) return null;

  const isFormValid = typeof revenue === 'number' && revenue > 0 && title && deadline;
  const rev = typeof revenue === 'number' ? revenue : 0;

  // Экран оплаты (заглушка)
  if (showPayment) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 border border-[#000052]/10 text-center">
          {paymentSuccess ? (
            <>
              <div className="w-20 h-20 rounded-full bg-[#B8860B]/10 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-10 h-10 text-[#B8860B]" />
              </div>
              <h2 className="text-2xl font-bold text-[#000052] mb-2">Оплата успешна!</h2>
              <p className="text-sm text-[#000052]/70 mb-4">Средства заблокированы в смарт-контракте</p>
              <div className="bg-[#000052]/5 p-4 rounded-lg text-left space-y-2">
                <div className="flex justify-between text-sm"><span className="text-[#000052]/70">Заморожено:</span><span className="font-bold text-[#B8860B]">${economics.escrow.toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#000052]/70">Ждёт агента:</span><span className="font-bold text-[#000052]">${(economics.escrow * 0.88).toLocaleString()}</span></div>
                <div className="flex justify-between text-sm"><span className="text-[#000052]/70">Комиссия InCORE:</span><span className="font-bold text-[#000052]">${economics.platformFee.toLocaleString()}</span></div>
              </div>
            </>
          ) : (
            <>
              <div className="w-20 h-20 rounded-full bg-[#000052]/5 flex items-center justify-center mx-auto mb-4">
                <CreditCard className="w-10 h-10 text-[#000052] animate-pulse" />
              </div>
              <h2 className="text-2xl font-bold text-[#000052] mb-2">Обработка платежа...</h2>
              <p className="text-sm text-[#000052]/70 mb-4">Подключение к платёжному шлюзу</p>
              <div className="w-full h-2 bg-[#000052]/10 rounded-full overflow-hidden">
                <div className="h-full bg-[#B8860B] rounded-full animate-pulse" style={{ width: '70%' }}></div>
              </div>
              <p className="text-xs text-[#000052]/50 mt-4">Демо-режим: имитация split-payment</p>
            </>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-6xl max-h-[95vh] overflow-y-auto border border-[#000052]/10">
        <div className="flex items-center justify-between p-6 border-b border-[#000052]/10">
          <h2 className="text-2xl font-bold text-[#000052]">{t('contractModal.title')}</h2>
          <button onClick={onClose} className="p-2 hover:bg-[#000052]/5 rounded-full transition-colors">
            <X className="w-5 h-5 text-[#000052]" />
          </button>
        </div>

        <form onSubmit={(e) => { e.preventDefault(); handlePayAndCreate(); }} className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="space-y-5">
            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.goal')} *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder={t('contractModal.goalPlaceholder')} required />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.assignAgent')}</label>
              <div className="relative">
                <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30 appearance-none">
                  <option value="">{t('contractModal.selectAgentPlaceholder')}</option>
                  {agents.map((agent) => (<option key={agent.id} value={agent.id}>{agent.full_name} {agent.specialization ? '(' + agent.specialization + ')' : ''}</option>))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#000052]/40 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#000052] mb-1.5">ID сделки в Битрикс24</label>
              <input type="text" value={bitrixDealId} onChange={(e) => setBitrixDealId(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder="Например: 456" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.plannedRevenue')} *</label>
                <input type="number" value={revenue} onChange={(e) => setRevenue(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder="1000000" min="0" required />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#000052] mb-1.5">{t('contractModal.deadline')} *</label>
                <input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} className="w-full px-4 py-2.5 bg-white border border-[#000052]/20 rounded-lg text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" required />
              </div>
            </div>

            <div className="bg-[#000052]/5 rounded-lg p-4 border border-[#000052]/10">
              <div className="flex items-center gap-2 mb-4">
                <Target className="w-5 h-5 text-[#000052]" />
                <h3 className="text-sm font-bold text-[#000052]">{t('contractModal.kpiTitle')}</h3>
                <span className="text-xs text-[#000052]/50 ml-auto">{t('contractModal.kpiOptional')}</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-medium text-[#000052]/70 mb-1"><Phone className="w-3 h-3 inline mr-1" />{t('contractModal.calls')}</label><input type="number" value={kpiCalls} onChange={(e) => setKpiCalls(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder={String(kpiSuggestions.calls)} /></div>
                <div><label className="block text-xs font-medium text-[#000052]/70 mb-1"><Handshake className="w-3 h-3 inline mr-1" />{t('contractModal.meetings')}</label><input type="number" value={kpiMeetings} onChange={(e) => setKpiMeetings(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder={String(kpiSuggestions.meetings)} /></div>
                <div><label className="block text-xs font-medium text-[#000052]/70 mb-1"><FileText className="w-3 h-3 inline mr-1" />{t('contractModal.proposals')}</label><input type="number" value={kpiProposals} onChange={(e) => setKpiProposals(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder={String(kpiSuggestions.proposals)} /></div>
                <div><label className="block text-xs font-medium text-[#000052]/70 mb-1"><Users className="w-3 h-3 inline mr-1" />{t('contractModal.targetClients')}</label><input type="number" value={targetClients} onChange={(e) => setTargetClients(e.target.value === '' ? '' : Number(e.target.value))} className="w-full px-3 py-2 bg-white border border-[#000052]/20 rounded text-sm text-[#000052] focus:outline-none focus:ring-2 focus:ring-[#B8860B]/30" placeholder={String(kpiSuggestions.clients)} /></div>
              </div>
            </div>
          </div>

          <div className="bg-[#000052]/5 rounded-xl p-6 border border-[#000052]/10">
            <div className="flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-[#B8860B]" />
              <h3 className="text-lg font-bold text-[#000052]">{t('contractModal.unitEconomics')}</h3>
            </div>

            <div className="space-y-3 mb-6">
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-[#000052]/10">
                <span className="text-sm font-semibold text-[#000052]">GMV</span>
                <span className="font-bold text-[#000052] text-lg">${rev.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-white rounded-lg border border-[#000052]/10">
                <span className="text-sm text-[#000052]/70">Комиссия InCORE (12%)</span>
                <span className="font-semibold text-[#000052]/70">${economics.platformFee.toLocaleString()}</span>
              </div>
            </div>

            {rev > 0 && (
              <div className="mb-6 p-4 bg-white rounded-lg border border-[#000052]/10">
                <p className="text-xs font-bold text-[#000052] uppercase mb-3">6 потоков выплат (эскроу)</p>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs"><span className="text-[#000052]/70">Новые продажи (50%)</span><span className="font-semibold text-[#000052]">${economics.newSalesBonus.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#000052]/70">Продление (15%)</span><span className="font-semibold text-[#000052]">${economics.renewalBonus.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#000052]/70">Кросс-продажи (10%)</span><span className="font-semibold text-[#000052]">${economics.crossSellBonus.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#000052]/70">Бонус за план (10%)</span><span className="font-semibold text-[#000052]">${economics.planBonus.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#000052]/70">Удержание 90 дней (10%)</span><span className="font-semibold text-[#B8860B]">${economics.retentionBonus.toLocaleString()}</span></div>
                  <div className="flex justify-between text-xs"><span className="text-[#000052]/70">Годовой бонус (5%)</span><span className="font-semibold text-[#000052]">${economics.annualBonus.toLocaleString()}</span></div>
                </div>
                <div className="mt-3 pt-3 border-t border-[#000052]/10 flex justify-between text-xs">
                  <span className="font-bold text-[#000052]">Итого эскроу:</span>
                  <span className="font-bold text-[#B8860B]">${economics.escrow.toLocaleString()}</span>
                </div>
              </div>
            )}

            {economics.escrow > 0 && (
              <div className="mb-6 p-4 bg-[#B8860B]/10 border border-[#B8860B]/20 rounded-lg">
                <div className="flex items-start gap-2">
                  <ShieldCheck className="w-5 h-5 text-[#B8860B] flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-bold text-[#000052]">Хеджирование рисков</p>
                    <p className="text-xs text-[#000052]/70 mt-1">
                      ${economics.escrow.toLocaleString()} заблокируется в смарт-контракте. Выплата — по верификации через InCORE.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <button type="submit" disabled={!isFormValid || loading} className={'w-full py-3 px-4 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ' + (isFormValid ? 'bg-[#B8860B] hover:bg-[#9a7209] text-white shadow-lg' : 'bg-[#000052]/10 text-[#000052]/50 cursor-not-allowed')}>
              <CreditCard className="w-5 h-5" />
              {loading ? 'Создание...' : 'Оплатить эскроу и опубликовать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}