import { useTranslation } from 'react-i18next';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { DollarSign, Shield, TrendingUp, CheckCircle, BarChart3, Wallet, Award } from 'lucide-react';
import { DEMO_AGENTS, calculateContractKPI } from '../../lib/demoData';
import { calculateAnnualBonusProgress } from '../../lib/annualBonus';
import { InfoTooltip } from '../../components/ui/InfoTooltip';
import { getActualContractRevenue, getContractAccountingSnapshot, money } from '../../lib/contractFinance';

const n = (value: any) => Number(value || 0);
const active = (contract: any) => contract?.status === 'ACTIVE' || contract?.status === 'IN_PROGRESS';

const realKPI = (contract: any) => {
  const pairs: Array<[any, any]> = [
    [contract.actual_calls, contract.kpi_calls],
    [contract.actual_meetings, contract.kpi_meetings],
    [contract.actual_proposals, contract.kpi_proposals],
    [contract.actual_clients, contract.target_clients],
  ].filter(([, target]) => n(target) > 0) as Array<[any, any]>;

  if (pairs.length) {
    return Math.round(
      pairs.reduce((sum, [actual, target]) => sum + (n(actual) / n(target)) * 100, 0) / pairs.length,
    );
  }

  const planned = n(contract.planned_revenue || contract.revenue);
  const actual = getActualContractRevenue(contract);
  return planned > 0 ? Math.round((actual / planned) * 100) : 0;
};

const getStreamsForContract = (contract: any, payoutStreams: any[]) => (
  contract.is_demo
    ? (Array.isArray(contract.payout_streams) ? contract.payout_streams : [])
    : payoutStreams.filter(stream => stream.contract_id === contract.id)
);

export function CEODashboard() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState({
    totalRevenue: 0,
    totalEscrow: 0,
    totalPaidToAgents: 0,
    netProfit: 0,
    avgROI: 0,
    activeContracts: 0,
    pendingPayouts: 0,
    periodPaid: 0,
    periodPending: 0,
    locked: 0,
    released: 0,
    liability: 0,
  });
  const [efficiency, setEfficiency] = useState<any[]>([]);
  const [expectedIncome, setExpectedIncome] = useState<any[]>([]);
  const [annualBonuses, setAnnualBonuses] = useState<any[]>([]);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }

    const load = async () => {
      try {
        const demoContracts = DEMO_AGENTS.flatMap(agent =>
          agent.contracts.map(contract => ({
            ...contract,
            agent_id: agent.id,
            agent_name: agent.full_name,
            is_demo: true,
          })),
        );
        const demoNames = new Set(DEMO_AGENTS.map(agent => agent.full_name.trim().toLowerCase()));

        const { data: company, error: companyError } = await supabase
          .from('companies')
          .select('id')
          .eq('user_id', user.id)
          .maybeSingle();

        if (companyError) throw companyError;

        let agents: any[] = [];
        let realContracts: any[] = [];
        let payoutStreams: any[] = [];

        if (company?.id) {
          const agentsResult = await supabase
            .from('agents')
            .select('*')
            .eq('company_id', company.id);
          if (agentsResult.error) throw agentsResult.error;
          agents = agentsResult.data || [];

          const contractsResult = await supabase
            .from('contracts')
            .select('*')
            .eq('company_id', company.id)
            .order('created_at', { ascending: false });
          if (contractsResult.error) throw contractsResult.error;

          const realAgentNames = new Map(
            agents.map(agent => [
              agent.id,
              (agent.full_name || agent.name || agent.email || '').trim().toLowerCase(),
            ]),
          );

          const latestByAgent = new Map<string, any>();
          (contractsResult.data || []).forEach(contract => {
            const name = (realAgentNames.get(contract.agent_id) || '').trim().toLowerCase();
            if (name && demoNames.has(name)) return;
            const key = contract.agent_id || contract.id;
            if (!latestByAgent.has(key)) latestByAgent.set(key, contract);
          });

          realContracts = Array.from(latestByAgent.values());
          const ids = realContracts.map(contract => contract.id).filter(Boolean);

          if (ids.length) {
            const streamsResult = await supabase
              .from('contract_payout_streams')
              .select('*')
              .in('contract_id', ids);
            if (streamsResult.error) throw streamsResult.error;
            payoutStreams = streamsResult.data || [];
          }
        }

        const names = new Map(
          agents.map(agent => [
            agent.id,
            agent.full_name || agent.name || agent.email || t('agent.agentNotFound'),
          ]),
        );

        const realContractsWithNames = realContracts.map(contract => ({
          ...contract,
          agent_name: names.get(contract.agent_id) || t('agent.agentNotFound'),
          is_demo: false,
        }));

        const allContracts = [...demoContracts, ...realContractsWithNames];
        const activeContracts = allContracts.filter(active);

        let totalRevenue = 0;
        let totalEscrow = 0;
        let totalPaid = 0;
        let profit = 0;
        let roiSum = 0;
        let roiCount = 0;
        let periodPaid = 0;
        let pending = 0;
        let locked = 0;
        let liability = 0;

        const efficiencyByAgent: Record<string, { name: string; value: number; count: number }> = {};
        const expectedByAgent: Record<string, { name: string; amount: number }> = {};
        const annualByAgent: Record<string, any[]> = {};

        allContracts.forEach(contract => {
          const streams = getStreamsForContract(contract, payoutStreams);
          const accounting = getContractAccountingSnapshot({ ...contract, payout_streams: streams });
          const revenue = accounting.revenue;
          const key = contract.agent_id || contract.agent_name || contract.id;
          const name = contract.agent_name || t('agent.agentNotFound');

          if (!efficiencyByAgent[key]) efficiencyByAgent[key] = { name, value: 0, count: 0 };
          if (!expectedByAgent[key]) expectedByAgent[key] = { name, amount: 0 };
          if (!annualByAgent[key]) annualByAgent[key] = [];
          annualByAgent[key].push(contract);

          // График показывает всех агентов с контрактом, включая 0%.
          const kpi = contract.is_demo ? calculateContractKPI(contract) : realKPI(contract);
          efficiencyByAgent[key].value += kpi;
          efficiencyByAgent[key].count += 1;

          // Ожидаемый доход = payout активного контракта из единого финансового ядра.
          if (active(contract)) expectedByAgent[key].amount += accounting.payout;

          // Финансовые показатели учитываются только по активным контрактам.
          if (!active(contract)) return;

          totalRevenue += revenue;
          totalEscrow += accounting.escrow;
          totalPaid += accounting.paid;
          profit += accounting.companyProfit;

          if (revenue > 0) {
            roiSum += accounting.companyProfit / revenue * 100;
            roiCount += 1;
          }

          streams.filter(stream => stream.stream_key !== 'annual').forEach(stream => {
            const amount = money(stream.amount);

            if (stream.status === 'PAID') {
              const eventDate = stream.paid_at || stream.payment_date || stream.updated_at || stream.created_at;
              if (eventDate) {
                const d = new Date(eventDate);
                const now = new Date();
                if (d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth()) {
                  periodPaid += amount;
                }
              }
            }

            if (stream.status === 'LOCKED') locked += amount;
            if (['LOCKED', 'UNLOCKED', 'PAYABLE'].includes(stream.status)) liability += amount;
            if (['UNLOCKED', 'PAYABLE'].includes(stream.status)) pending += amount;
          });
        });

        const annualBonusRows = Object.entries(annualByAgent)
          .map(([key, contracts]) => ({
            id: key,
            name: efficiencyByAgent[key]?.name || expectedByAgent[key]?.name || t('agent.agentNotFound'),
            ...calculateAnnualBonusProgress(contracts, 2026),
          }))
          .filter(row => row.monthsCounted > 0)
          .sort((a, b) => b.progressPercent - a.progressPercent);

        const efficiencyRows = Object.values(efficiencyByAgent)
          .map(agent => ({
            name: agent.name,
            value: Math.round(agent.value / agent.count),
          }))
          .sort((a, b) => b.value - a.value);

        setMetrics({
          totalRevenue,
          totalEscrow,
          totalPaidToAgents: totalPaid,
          netProfit: Math.round(profit),
          avgROI: roiCount ? Math.round(roiSum / roiCount) : 0,
          activeContracts: activeContracts.length,
          pendingPayouts: pending,
          periodPaid,
          periodPending: pending,
          locked,
          released: totalPaid,
          liability,
        });
        setEfficiency(efficiencyRows);
        setExpectedIncome(
          Object.values(expectedByAgent)
            .filter(agent => agent.amount > 0)
            .sort((a, b) => b.amount - a.amount),
        );
        setAnnualBonuses(annualBonusRows);
      } catch (error) {
        console.error('Ошибка загрузки финансового ядра:', error);
        setMetrics({
          totalRevenue: 0,
          totalEscrow: 0,
          totalPaidToAgents: 0,
          netProfit: 0,
          avgROI: 0,
          activeContracts: 0,
          pendingPayouts: 0,
          periodPaid: 0,
          periodPending: 0,
          locked: 0,
          released: 0,
          liability: 0,
        });
        setEfficiency([]);
        setExpectedIncome([]);
        setAnnualBonuses([]);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, t]);

  if (loading) return <div className="p-8 text-center text-[#000052]">{t('ui.loading')}</div>;

  const paymentBase = metrics.periodPaid + metrics.periodPending;
  const paymentProgress = paymentBase ? Math.round((metrics.periodPaid / paymentBase) * 100) : 0;
  const barClass = (value: number) => value < 80 ? 'bg-red-500' : value > 100 ? 'bg-emerald-500' : 'bg-[#B8860B]';
  const label = (value: number) => value < 80 ? t('ui.critical') : value > 100 ? t('ui.overachieved') : t('ui.planAchievement');

  const cards = [
    [t('ui.totalRevenue'), `$${metrics.totalRevenue.toLocaleString()}`, DollarSign, 'bg-[#000052]', 'text-white', 'GMV: фактическая сумма договоров с клиентами по активным контрактам.'],
    [t('ui.profit'), `$${metrics.netProfit.toLocaleString()}`, TrendingUp, 'bg-white', 'text-[#000052]', 'Прибыль компании: фактическая сумма договоров минус полный payout агенту и комиссия InCORE.'],
    [t('ui.averageROI'), `${metrics.avgROI}%`, BarChart3, 'bg-[#1E3A5F]', 'text-white', 'Средний ROI: доля прибыли компании в фактической сумме договоров активных контрактов.'],
    [t('ui.activeContracts'), String(metrics.activeContracts), CheckCircle, 'bg-white', 'text-[#000052]', 'Количество контрактов со статусом ACTIVE или IN_PROGRESS.'],
  ];

  return <div className="w-full min-w-0 overflow-x-hidden p-4 md:p-6 space-y-6">
    <div className="min-w-0">
      <h1 className="text-2xl md:text-3xl font-bold text-[#000052] break-words">{t('ui.financialCore')}</h1>
      <p className="text-sm text-[#000052]/70 mt-1 break-words">{t('ui.financialOverview')}</p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 min-w-0">
      {cards.map(([title, value, Icon, bg, fg, hint]: any, index: number) => (
        <div key={index} className={`${bg} ${fg} min-w-0 p-5 rounded-xl border border-[#000052]/10`}>
          <div className="flex items-start justify-between gap-3 mb-3">
            <h3 className="min-w-0 text-sm font-medium opacity-80 flex items-center break-words">
              {title}<InfoTooltip>{hint}</InfoTooltip>
            </h3>
            <Icon className="w-5 h-5 opacity-80 shrink-0" />
          </div>
          <p className="text-2xl font-bold break-words">{value}</p>
        </div>
      ))}
    </div>

    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 min-w-0">
      <div className="bg-white min-w-0 p-5 rounded-xl border border-[#000052]/10">
        <p className="text-sm text-[#000052]/60 flex items-center break-words">{t('ui.locked', 'Заблокировано')}<InfoTooltip>Сумма потоков выплат со статусом LOCKED по активным контрактам. Эти средства ещё не доступны агенту.</InfoTooltip></p>
        <p className="text-2xl font-bold text-[#B8860B] mt-1">${metrics.locked.toLocaleString()}</p>
        <p className="text-xs text-[#000052]/50 mt-1">Средства заблокированы</p>
      </div>
      <div className="bg-white min-w-0 p-5 rounded-xl border border-[#000052]/10">
        <p className="text-sm text-[#000052]/60 flex items-center break-words">{t('ui.released', 'Выплачено')}<InfoTooltip>Сумма потоков со статусом PAID. Это уже выплаченные агентам средства.</InfoTooltip></p>
        <p className="text-2xl font-bold text-emerald-600 mt-1">${metrics.released.toLocaleString()}</p>
        <p className="text-xs text-[#000052]/50 mt-1">Средства выплачены</p>
      </div>
      <div className="bg-white min-w-0 p-5 rounded-xl border border-[#000052]/10">
        <p className="text-sm text-[#000052]/60 flex items-center break-words">{t('ui.liability', 'Обязательства')}<InfoTooltip>Текущие обязательства по активным контрактам: LOCKED + UNLOCKED + PAYABLE. PAID сюда не входит.</InfoTooltip></p>
        <p className="text-2xl font-bold text-[#000052] mt-1">${metrics.liability.toLocaleString()}</p>
        <p className="text-xs text-[#000052]/50 mt-1">Текущие обязательства по выплатам</p>
      </div>
    </div>

    <div className="bg-white min-w-0 p-4 md:p-6 rounded-xl border border-[#000052]/10">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-5">
        <div className="min-w-0">
          <div className="flex items-start gap-2">
            <Shield className="w-5 h-5 text-[#B8860B] shrink-0 mt-0.5" />
            <h2 className="text-lg font-bold text-[#000052] break-words">{t('ui.cashMovementAugust')}<InfoTooltip>Сравниваются выплаты текущего месяца и ожидаемые выплаты. Процент показывает долю уже выплаченных средств от PAID + UNLOCKED/PAYABLE.</InfoTooltip></h2>
          </div>
          <p className="text-sm text-[#000052]/60 mt-1 break-words">{t('ui.cashMovementDescription')}</p>
        </div>
        <div className="text-left sm:text-right shrink-0">
          <div className="text-xs text-[#000052]/60 flex items-center sm:justify-end">{t('ui.inEscrow')}<InfoTooltip>Общая сумма payout по активным контрактам из единого финансового ядра. Годовой бонус в escrow не входит.</InfoTooltip></div>
          <div className="text-xl font-bold text-[#000052]">${metrics.totalEscrow.toLocaleString()}</div>
        </div>
      </div>
      <div className="h-5 bg-[#000052]/10 rounded-full overflow-hidden flex">
        <div className="h-full bg-emerald-500" style={{ width: `${paymentProgress}%` }} />
        <div className="h-full bg-[#B8860B]" style={{ width: `${100 - paymentProgress}%` }} />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4 text-sm">
        <div><div className="text-[#000052]/60 flex items-center">{t('ui.escrow')}<InfoTooltip>Полный payout агенту по активным контрактам. Годовой бонус не включается.</InfoTooltip></div><div className="font-bold mt-1">${metrics.totalEscrow.toLocaleString()}</div></div>
        <div><div className="text-[#000052]/60 flex items-center">{t('ui.paidInAugust')}<InfoTooltip>Сумма потоков со статусом PAID, дата которых относится к текущему месяцу.</InfoTooltip></div><div className="font-bold text-emerald-600 mt-1">${metrics.periodPaid.toLocaleString()}</div></div>
        <div><div className="text-[#000052]/60 flex items-center">{t('ui.pendingPayout')}<InfoTooltip>Сумма потоков со статусом UNLOCKED или PAYABLE, которые ещё не имеют PAID.</InfoTooltip></div><div className="font-bold text-[#B8860B] mt-1">${metrics.periodPending.toLocaleString()}</div></div>
      </div>
      <div className="flex justify-between gap-3 mt-3 text-xs text-[#000052]/60"><span>{t('ui.paid')}: {paymentProgress}%</span><span>{t('ui.pending')}: {100 - paymentProgress}%</span></div>
    </div>

    <div className="bg-white min-w-0 p-4 md:p-6 rounded-xl border border-[#000052]/10">
      <div className="flex items-start gap-2 mb-5">
        <Wallet className="w-5 h-5 text-[#B8860B] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#000052] flex items-center break-words">{t('ui.agentExpectedIncome', 'Ожидаемый доход агентов')}<InfoTooltip>Показывает полный payout по активному контракту каждого агента из финансового ядра. Это ожидаемая сумма, а не уже выплаченные деньги.</InfoTooltip></h2>
          <p className="text-sm text-[#000052]/60 break-words">Payout по активному контракту</p>
        </div>
      </div>
      <div className="space-y-3">
        {expectedIncome.map((agent: any) => (
          <div key={agent.name} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 p-3 bg-[#000052]/5 rounded-lg min-w-0">
            <span className="font-medium text-[#000052] min-w-0 break-words">{agent.name}</span>
            <span className="font-bold text-[#B8860B] shrink-0">${Math.round(agent.amount).toLocaleString()}</span>
          </div>
        ))}
        {expectedIncome.length === 0 && <p className="text-sm text-[#000052]/60">Нет контрактов</p>}
      </div>
    </div>

    <div className="bg-white min-w-0 p-4 md:p-6 rounded-xl border border-[#000052]/10">
      <div className="flex items-start gap-2 mb-5">
        <Award className="w-5 h-5 text-[#B8860B] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#000052] flex items-center break-words">{t('ui.annualBonusProgress', 'Годовой бонус')}<InfoTooltip>Накопление бонуса по выполнению годового плана продаж. Бонус отображается отдельно и не входит в escrow.</InfoTooltip></h2>
          <p className="text-sm text-[#000052]/60 break-words">Накопление бонуса по выполнению годового плана продаж. Бонус не входит в эскроу.</p>
        </div>
      </div>
      <div className="space-y-4">
        {annualBonuses.map((agent: any) => (
          <div key={agent.id} className="p-4 bg-[#000052]/5 rounded-lg min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <div className="min-w-0">
                <div className="font-semibold text-[#000052] break-words">{agent.name}</div>
                <div className="text-xs text-[#000052]/60 flex items-center break-words">{agent.planAchievementPercent}% {t('ui.planAchievement')}<InfoTooltip>Процент выполнения годового плана продаж по учтённым месяцам.</InfoTooltip></div>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <div className="font-bold text-[#B8860B]">${agent.accruedBonus.toLocaleString()} / ${agent.maxBonus.toLocaleString()}</div>
                <div className="text-xs text-[#000052]/60 flex items-center sm:justify-end">{agent.progressPercent}%<InfoTooltip>Доля максимально возможного годового бонуса, которая уже накоплена.</InfoTooltip></div>
              </div>
            </div>
            <div className="h-3 bg-[#000052]/10 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${Math.min(agent.progressPercent, 100)}%` }} /></div>
          </div>
        ))}
        {annualBonuses.length === 0 && <p className="text-sm text-[#000052]/60">Нет агентов</p>}
      </div>
    </div>

    <div className="bg-white min-w-0 p-4 md:p-6 rounded-xl border border-[#000052]/10">
      <div className="flex items-start gap-2 mb-5">
        <BarChart3 className="w-5 h-5 text-[#B8860B] shrink-0 mt-0.5" />
        <div className="min-w-0">
          <h2 className="text-lg font-bold text-[#000052] flex items-center break-words">{t('ui.agentPlanAchievement')}<InfoTooltip>Средний KPI агента по его контрактам. Для реальных контрактов учитываются фактические показатели KPI, а при их отсутствии используется фактическая сумма договоров относительно плановой.</InfoTooltip></h2>
          <p className="text-sm text-[#000052]/60 mt-1 break-words">{t('ui.agentPlanDescription')}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 mb-6 text-xs text-[#000052]/70"><span>{t('ui.below80')} — {t('ui.critical')}</span><span>100% — {t('ui.planAchievement')}</span><span>{t('ui.above100')} — {t('ui.overachieved')}</span></div>

      <div className="md:hidden space-y-3">
        {efficiency.map((agent: any, index: number) => (
          <div key={`${agent.name}-${index}`} className="rounded-lg border border-[#000052]/10 p-4 bg-[#000052]/5 min-w-0">
            <div className="flex items-center justify-between gap-3 mb-3"><div className="font-semibold text-[#000052] min-w-0 break-words">{agent.name}</div><div className="font-bold text-[#000052] shrink-0">{agent.value}%</div></div>
            <div className="h-3 bg-[#000052]/10 rounded-full overflow-hidden"><div className={`h-full ${barClass(agent.value)} rounded-full`} style={{ width: `${Math.min(Math.max(agent.value, 0), 100)}%` }} /></div>
            <div className="flex items-center justify-between gap-3 mt-2 text-xs text-[#000052]/60"><span>{label(agent.value)}</span><span>{agent.value < 80 ? t('ui.below80') : agent.value > 100 ? t('ui.above100') : '100%'}</span></div>
          </div>
        ))}
        {efficiency.length === 0 && <p className="text-sm text-[#000052]/60">Нет данных</p>}
      </div>

      <div className="hidden md:block overflow-x-auto">
        <div className="grid grid-cols-7 min-w-[1050px] border border-[#000052]/10 rounded-lg overflow-hidden">
          {efficiency.map((agent: any, index: number) => {
            const height = Math.max(8, Math.min(180, agent.value / 120 * 180));
            return (
              <div key={`${agent.name}-${index}`} className={`flex flex-col items-center min-w-0 px-3 py-4 ${index < efficiency.length - 1 ? 'border-r border-[#000052]/10' : ''}`}>
                <div className="w-full h-[190px] flex items-end justify-center relative border-b border-[#000052]/10">
                  <div className={`w-12 ${barClass(agent.value)} rounded-t-lg relative`} style={{ height: `${height}px` }}>
                    <span className="absolute -top-7 left-1/2 -translate-x-1/2 text-sm font-bold text-[#000052] whitespace-nowrap">{agent.value}%</span>
                  </div>
                </div>
                <div className="text-center mt-3 w-full"><div className="font-semibold text-sm text-[#000052] leading-tight break-words" title={agent.name}>{agent.name}</div><div className="text-xs text-[#000052]/60 mt-1">{label(agent.value)}</div></div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  </div>;
}
