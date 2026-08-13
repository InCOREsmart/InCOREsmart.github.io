import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { getAnnualBonusForAgent } from '../../lib/annualBonus';
import { DollarSign, Shield, Clock, CheckCircle, AlertTriangle, TrendingUp, Lock, Award } from 'lucide-react';

const getStreamAmount = (stream: any) => stream.stream_key === 'annual' ? 0 : Number(stream.amount || 0);

function Tooltip({ content, children }: { content: React.ReactNode; children: React.ReactNode }) {
  return <div className="group relative inline-flex w-full">
    {children}
    <div className="pointer-events-none absolute left-1/2 top-full z-50 mt-2 hidden w-72 -translate-x-1/2 rounded-xl bg-[#000052] px-4 py-3 text-left text-xs leading-relaxed text-white shadow-xl group-hover:block">
      {content}
    </div>
  </div>;
}

export function AgentDashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [agent, setAgent] = useState<any>(null);
  const [contracts, setContracts] = useState<any[]>([]);
  const [streams, setStreams] = useState<any[]>([]);

  useEffect(() => {
    if (!user) { setLoading(false); return; }
    const fetchData = async () => {
      try {
        const { data: agentData } = await supabase.from('agents').select('*').eq('user_id', user.id).maybeSingle();
        if (!agentData) { setLoading(false); return; }
        setAgent(agentData);
        const { data: contractsData } = await supabase.from('contracts').select('*').eq('agent_id', agentData.id).order('created_at', { ascending: false });
        setContracts(contractsData || []);
        if (contractsData?.length) {
          const { data: streamsData } = await supabase.from('contract_payout_streams').select('*').in('contract_id', contractsData.map(c => c.id)).neq('stream_key', 'annual');
          setStreams(streamsData || []);
        }
      } catch (err) { console.error('Ошибка:', err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  if (loading) return <div className="p-8 text-center"><div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-[#B8860B]" /><p className="mt-4 text-[#000052]">{t('common.loading')}</p></div>;
  if (!agent) return <div className="p-8 text-center"><p className="text-lg text-[#000052]">{t('agent.agentNotFound')}</p></div>;

  let totalEarned = 0;
  let availableForWithdrawal = 0;
  let pendingVerification = 0;
  let escrowBalance = 0;
  let retentionLocked = 0;
  let clawedBack = 0;

  contracts.forEach(contract => {
    const contractStreams = streams.filter(stream => stream.contract_id === contract.id);
    contractStreams.forEach(stream => {
      const amount = getStreamAmount(stream);
      if (stream.status === 'PAID') totalEarned += amount;
      if (stream.status === 'UNLOCKED' || stream.status === 'PAYABLE') availableForWithdrawal += amount;
      if (stream.status === 'PENDING_VERIFICATION') pendingVerification += amount;
      if (stream.status === 'LOCKED') escrowBalance += amount;
      if (stream.stream_key === 'retention' && stream.status === 'LOCKED') retentionLocked += amount;
      if (stream.status === 'CLAWED_BACK') clawedBack += amount;
    });
  });

  const annualBonus = getAnnualBonusForAgent({ ...agent, contracts }, 2026);
  const activeContractsCount = contracts.filter(c => c.status === 'ACTIVE' || c.status === 'IN_PROGRESS').length;
  const completedContractsCount = contracts.filter(c => c.status === 'COMPLETED').length;
  const kpis = [
    { label: t('agent.totalEarned'), value: totalEarned, icon: DollarSign, color: 'bg-[#000052]', textColor: 'text-white', detail: <><div className="font-semibold mb-1">Заработано</div><div>Сумма потоков выплат со статусом <b>PAID</b>.</div><div className="mt-1">Доступно к выводу отдельно не считается, пока выплата не перешла в соответствующий статус.</div></> },
    { label: t('agent.availableForWithdrawal'), value: availableForWithdrawal, icon: CheckCircle, color: 'bg-[#1E3A5F]', textColor: 'text-white', detail: <><div className="font-semibold mb-1">Доступно к выводу</div><div>Сумма потоков со статусами <b>UNLOCKED</b> и <b>PAYABLE</b>.</div><div className="mt-1">Это деньги, которые уже можно направлять на выплату агенту.</div></> },
    { label: t('agent.pendingVerification'), value: pendingVerification, icon: Clock, color: 'bg-[#B8860B]', textColor: 'text-white', detail: <><div className="font-semibold mb-1">На проверке</div><div>Средства по потокам, ожидающим подтверждения выполнения условий.</div><div className="mt-1">Они ещё не считаются доступными к выводу.</div></> },
    { label: t('agent.escrowBalance'), value: escrowBalance, icon: Lock, color: 'bg-white', textColor: 'text-[#000052]', detail: <><div className="font-semibold mb-1">Escrow</div><div>Средства, временно заблокированные до выполнения условий договора.</div><div className="mt-1">После выполнения условий поток может перейти в выплату.</div></> },
    { label: t('payouts.retention'), value: retentionLocked, icon: Shield, color: 'bg-white', textColor: 'text-[#000052]', detail: <><div className="font-semibold mb-1">Удержание</div><div>Заблокированная часть выплаты за retention.</div><div className="mt-1">Она освобождается только после выполнения условия удержания клиента.</div></> },
    { label: t('agent.clawedBack'), value: clawedBack, icon: AlertTriangle, color: 'bg-[#46618C]', textColor: 'text-white', detail: <><div className="font-semibold mb-1">Возврат средств</div><div>Сумма потоков со статусом <b>CLAWED_BACK</b>.</div><div className="mt-1">Эти средства были возвращены из расчёта выплаты.</div></> },
  ];

  return <div className="p-4 md:p-6 space-y-6">
    <div><h1 className="text-2xl md:text-3xl font-bold text-[#000052]">{t('agent.dashboardTitle')}</h1><p className="text-sm text-[#000052]/70 mt-1">{agent.full_name}</p></div>
    <div className="bg-gradient-to-r from-[#000052] to-[#B8860B] text-white p-5 rounded-xl"><div className="flex items-start gap-3"><Shield className="w-6 h-6 flex-shrink-0 mt-0.5" /><div><h3 className="font-bold mb-1">{t('agent.fundsVerified')}</h3><p className="text-sm opacity-90">{t('agent.clawbackWarning')}</p></div></div></div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">{kpis.map((kpi, i) => { const Icon = kpi.icon; return <Tooltip key={i} content={kpi.detail}><div className={`${kpi.color} ${kpi.textColor} p-5 rounded-xl border border-[#000052]/10 cursor-help`}><div className="flex items-center justify-between mb-3"><h3 className="text-sm font-medium opacity-80">{kpi.label}</h3><Icon className="w-5 h-5 opacity-80" /></div><p className="text-2xl font-bold">${kpi.value.toLocaleString()}</p></div></Tooltip>; })}</div>
    <Tooltip content={<><div className="font-semibold mb-1">Годовой бонус</div><div>Бонус накапливается по выполнению годового плана продаж и <b>не входит в Escrow</b>.</div><div className="mt-1">Выплата предусмотрена в январе 2027 года.</div><div className="mt-1">Сейчас накоплено: <b>${annualBonus.accruedBonus.toLocaleString()}</b> из ${annualBonus.maxBonus.toLocaleString()}.</div></>}>
      <div className="bg-white p-6 rounded-xl border border-[#000052]/10 cursor-help"><div className="flex items-center justify-between gap-4 mb-3"><div><h2 className="text-lg font-bold text-[#000052] flex items-center gap-2"><Award className="w-5 h-5 text-[#B8860B]" />{t('agent.annualBonus')} · {annualBonus.year}</h2><p className="text-sm text-[#000052]/60 mt-1">Годовой бонус не входит в эскроу и выплачивается в январе 2027.</p></div><div className="text-right"><div className="text-xl font-bold text-[#000052]">${annualBonus.accruedBonus.toLocaleString()}</div><div className="text-xs text-[#000052]/60">{t('agent.maxBonus')} ${annualBonus.maxBonus.toLocaleString()}</div></div></div><div className="h-3 bg-[#000052]/10 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${Math.min(annualBonus.progressPercent, 100)}%` }} /></div><div className="flex justify-between mt-2 text-xs text-[#000052]/60"><span>{t('agent.planAchievement')}: {annualBonus.planAchievementPercent}%</span><span>{t('agent.accumulated')}: {annualBonus.progressPercent}%</span></div></div>
    </Tooltip>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><Tooltip content={<><div className="font-semibold mb-1">Активные контракты</div><div>Сейчас в работе: <b>{activeContractsCount}</b>.</div><div>В показатель входят статусы ACTIVE и IN_PROGRESS.</div><div className="mt-1">Завершено: {completedContractsCount}.</div></>}><button onClick={() => navigate('/agent/contracts')} className="bg-white p-5 rounded-xl border border-[#000052]/10 hover:shadow-md transition text-left cursor-help"><div className="flex items-center gap-3 mb-2"><TrendingUp className="w-6 h-6 text-[#B8860B]" /><h3 className="font-bold text-[#000052]">{t('agent.myActiveContracts')}</h3></div><p className="text-sm text-[#000052]/70 mt-1">{activeContractsCount} {t('agent.activeContracts')}</p></button></Tooltip><Tooltip content={<><div className="font-semibold mb-1">Выплаты</div><div>Здесь собраны финансовые потоки по вашим договорам.</div><div className="mt-1">Отдельно учитываются выплаченные, доступные к выводу, проверяемые и замороженные суммы.</div></>}><button onClick={() => navigate('/agent/payouts')} className="bg-white p-5 rounded-xl border border-[#000052]/10 hover:shadow-md transition text-left cursor-help"><div className="flex items-center gap-3 mb-2"><DollarSign className="w-6 h-6 text-[#B8860B]" /><h3 className="font-bold text-[#000052]">{t('payouts.title')}</h3></div><p className="text-sm text-[#000052]/70">{t('payouts.subtitle')}</p></button></Tooltip></div>
  </div>;
}
