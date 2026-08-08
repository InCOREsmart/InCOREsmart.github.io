export interface DemoAgent {
  id: string;
  name: string;
  full_name: string;
  email: string;
  phone: string;
  specialization: string;
  start_date: string;
  contracts: DemoContract[];
}

export interface DemoPayoutStream {
  id: string;
  contract_id: string;
  stream_key: 'new_sales_property' | 'new_sales_casco' | 'new_sales_dms' | 'renewal' | 'cross_sell' | 'plan_bonus' | 'retention' | 'annual';
  title: string;
  percent: number;
  amount: number;
  status: 'LOCKED' | 'UNLOCKED' | 'PAID' | 'CLAWED_BACK';
  unlock_condition: string;
  unlocked_at: string | null;
  paid_at: string | null;
  clawback_reason: string | null;
}

export interface DemoEscrowEvent {
  id: string;
  contract_id: string;
  event_type: 'ESCROW_CREATED' | 'ESCROW_FUNDED' | 'PARTIAL_RELEASE' | 'PAYOUT_TO_AGENT' | 'CLAWBACK';
  amount: number | null;
  actor_role: 'SYSTEM' | 'ORACLE' | 'CEO';
  metadata: Record<string, any>;
  created_at: string;
}

export interface DemoOracleEvent {
  id: string;
  contract_id: string;
  event_type: 'CLIENT_PAYMENT_CONFIRMED' | 'RETENTION_PERIOD_PASSED' | 'RENEWAL_CONFIRMED' | 'CROSS_SELL_CONFIRMED' | 'PLAN_ACHIEVED' | 'ANNUAL_BONUS_CONFIRMED';
  source: string;
  payload: Record<string, any>;
  created_at: string;
}

export interface BitrixDeal {
  id: string;
  title: string;
  stage: string;
  amount: number;
  created_at: string;
}

export interface DemoContract {
  id: string;
  title: string;
  description: string;
  revenue: number;
  escrow_amount: number;
  escrow_status: 'FUNDED';
  agent_payouts_total: number;
  company_profit: number;
  platform_fee: number;
  total_paid: number;
  total_locked: number;
  status: 'ACTIVE' | 'IN_PROGRESS' | 'COMPLETED';
  start_date: string;
  deadline: string;
  month: string;
  kpi_calls: number;
  kpi_meetings: number;
  kpi_proposals: number;
  target_clients: number;
  actual_calls: number;
  actual_meetings: number;
  actual_proposals: number;
  actual_clients: number;
  bitrix_deals: BitrixDeal[];
  payout_streams: DemoPayoutStream[];
  escrow_events: DemoEscrowEvent[];
  oracle_events: DemoOracleEvent[];
}

const DEMO_AS_OF_DATE = new Date('2026-08-08T23:59:59Z');
const PLATFORM_FEE_PERCENT = 12;

const STREAM_CONFIG = [
  { key: 'new_sales_property' as const, title: 'Новые продажи: Имущество/риски', percent: 20, condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'new_sales_casco' as const, title: 'Новые продажи: Автопарки (КАСКО)', percent: 15, condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'new_sales_dms' as const, title: 'Новые продажи: Медицина (ДМС)', percent: 10, condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'renewal' as const, title: 'Продление договоров', percent: 15, condition: 'Подписание доп. соглашения в CRM' },
  { key: 'cross_sell' as const, title: 'Кросс-продажи', percent: 10, condition: 'Продажа дополнительного продукта подтверждена' },
  { key: 'plan_bonus' as const, title: 'Бонус за выполнение плана', percent: 10, condition: '100% выполнение KPI квартала' },
  { key: 'retention' as const, title: 'Удержание 90 дней', percent: 0, fixedAmount: 200, condition: 'Клиент активен более 90 дней' },
  { key: 'annual' as const, title: 'Годовой бонус', percent: 0, fixedAmount: 7000, condition: 'Годовой KPI подтверждён в CRM' },
];

const MONTH_FACTORS = [0.94, 0.98, 1.03, 1.00, 1.06, 0.97, 1.04, 1.01];

function roundMoney(value: number): number {
  return Math.round(value);
}

function toDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function monthKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date: Date): string {
  return date.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
}

function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

function firstDayOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function daysInMonth(date: Date): number {
  return endOfMonth(date).getDate();
}

function elapsedMonthRatio(start: Date, deadline: Date, asOf: Date): number {
  if (asOf.getTime() < start.getTime()) return 0;
  if (asOf.getTime() >= deadline.getTime()) return 1;
  const total = Math.max(deadline.getTime() - start.getTime(), 1);
  return Math.min(Math.max((asOf.getTime() - start.getTime()) / total, 0), 1);
}

function generateBitrixDeals(contract: Omit<DemoContract, 'bitrix_deals' | 'payout_streams' | 'escrow_events' | 'oracle_events'>): BitrixDeal[] {
  const deals: BitrixDeal[] = [];
  const startDate = new Date(`${contract.start_date}T00:00:00Z`);
  const label = monthLabel(startDate);
  const dealValue = contract.target_clients > 0 ? contract.revenue / contract.target_clients : 0;

  for (let i = 0; i < Math.min(contract.actual_meetings, 6); i += 1) {
    deals.push({
      id: `${contract.id}-meeting-${i + 1}`,
      title: `Встреча с клиентом ${i + 1} (${label})`,
      stage: 'Встреча проведена',
      amount: 0,
      created_at: new Date(startDate.getTime() + (i + 2) * 86400000).toISOString(),
    });
  }

  for (let i = 0; i < contract.actual_clients; i += 1) {
    deals.push({
      id: `${contract.id}-client-${i + 1}`,
      title: `Корпоративный клиент ${i + 1} (${label})`,
      stage: 'Успешно реализовано',
      amount: roundMoney(dealValue),
      created_at: new Date(startDate.getTime() + Math.min(i + 7, 25) * 86400000).toISOString(),
    });
  }

  return deals;
}

function buildPayoutStreams(
  contractId: string,
  plannedRevenue: number,
  contractStart: Date,
  deadline: Date,
  actualClients: number,
  targetClients: number,
  isCompleted: boolean,
  performance: number,
): DemoPayoutStream[] {
  const newSalesRevenue = plannedRevenue / 3;
  const amounts: Record<string, number> = {
    new_sales_property: roundMoney(newSalesRevenue * 0.20),
    new_sales_casco: roundMoney(newSalesRevenue * 0.15),
    new_sales_dms: roundMoney(newSalesRevenue * 0.10),
    renewal: roundMoney(newSalesRevenue * 0.15),
    cross_sell: roundMoney(newSalesRevenue * 0.10),
    plan_bonus: roundMoney(plannedRevenue * 0.10),
    retention: 200,
    annual: 7000,
  };

  const clientPaymentDate = new Date(contractStart.getTime() + Math.max(1, Math.round((deadline.getTime() - contractStart.getTime()) * 0.45)));
  const kpiAchieved = actualClients >= targetClients && performance >= 1;
  const streams: DemoPayoutStream[] = [];

  STREAM_CONFIG.forEach((config, index) => {
    let status: DemoPayoutStream['status'] = 'LOCKED';
    let unlockedAt: string | null = null;
    let paidAt: string | null = null;

    if (config.key === 'new_sales_property' || config.key === 'new_sales_casco' || config.key === 'new_sales_dms') {
      if (isCompleted || performance >= 0.70) {
        status = isCompleted ? 'PAID' : 'UNLOCKED';
        unlockedAt = toDate(clientPaymentDate);
        paidAt = isCompleted ? toDate(new Date(clientPaymentDate.getTime() + 86400000)) : null;
      }
    } else if (config.key === 'renewal') {
      if (isCompleted && performance >= 0.85) {
        status = 'PAID';
        unlockedAt = toDate(new Date(deadline.getTime() - 5 * 86400000));
        paidAt = toDate(new Date(deadline.getTime() - 4 * 86400000));
      }
    } else if (config.key === 'cross_sell') {
      if (actualClients >= Math.ceil(targetClients * 0.60)) {
        status = isCompleted ? 'PAID' : 'UNLOCKED';
        unlockedAt = toDate(new Date(contractStart.getTime() + Math.max(2, Math.round((deadline.getTime() - contractStart.getTime()) * 0.65))));
        paidAt = isCompleted ? toDate(new Date(new Date(unlockedAt).getTime() + 86400000)) : null;
      }
    } else if (config.key === 'plan_bonus') {
      if (kpiAchieved) {
        status = isCompleted ? 'PAID' : 'UNLOCKED';
        unlockedAt = toDate(deadline);
        paidAt = isCompleted ? toDate(new Date(deadline.getTime() + 86400000)) : null;
      }
    } else if (config.key === 'retention') {
      if (isCompleted && performance >= 0.90) {
        status = 'PAID';
        unlockedAt = toDate(new Date(deadline.getTime() + 90 * 86400000));
        paidAt = toDate(new Date(deadline.getTime() + 91 * 86400000));
      }
    } else if (config.key === 'annual') {
      status = 'LOCKED';
    }

    streams.push({
      id: `${contractId}-stream-${index + 1}`,
      contract_id: contractId,
      stream_key: config.key,
      title: config.title,
      percent: config.percent,
      amount: amounts[config.key],
      status,
      unlock_condition: config.condition,
      unlocked_at: unlockedAt,
      paid_at: paidAt,
      clawback_reason: null,
    });
  });

  return streams;
}

function buildEvents(contract: DemoContract): { escrow: DemoEscrowEvent[]; oracle: DemoOracleEvent[] } {
  const events: DemoEscrowEvent[] = [
    {
      id: `${contract.id}-escrow-created`,
      contract_id: contract.id,
      event_type: 'ESCROW_CREATED',
      amount: contract.escrow_amount,
      actor_role: 'SYSTEM',
      metadata: { streams_count: contract.payout_streams.length, total_escrow: contract.escrow_amount },
      created_at: `${contract.start_date}T09:00:00.000Z`,
    },
    {
      id: `${contract.id}-escrow-funded`,
      contract_id: contract.id,
      event_type: 'ESCROW_FUNDED',
      amount: contract.escrow_amount,
      actor_role: 'SYSTEM',
      metadata: { source: 'DEMO_SCENARIO' },
      created_at: `${contract.start_date}T09:15:00.000Z`,
    },
  ];

  const oracle: DemoOracleEvent[] = [];
  const paidStreams = contract.payout_streams.filter(s => s.status === 'PAID');

  if (contract.actual_clients > 0) {
    oracle.push({
      id: `${contract.id}-oracle-payment`,
      contract_id: contract.id,
      event_type: 'CLIENT_PAYMENT_CONFIRMED',
      source: 'DEMO_ORACLE',
      payload: { confirmed_clients: contract.actual_clients, planned_clients: contract.target_clients },
      created_at: `${contract.start_date}T12:00:00.000Z`,
    });
  }

  if (contract.actual_clients >= Math.ceil(contract.target_clients * 0.60)) {
    oracle.push({
      id: `${contract.id}-oracle-crosssell`,
      contract_id: contract.id,
      event_type: 'CROSS_SELL_CONFIRMED',
      source: 'DEMO_ORACLE',
      payload: { eligible_clients: contract.actual_clients },
      created_at: `${contract.deadline}T10:00:00.000Z`,
    });
  }

  if (contract.actual_clients >= contract.target_clients) {
    oracle.push({
      id: `${contract.id}-oracle-plan`,
      contract_id: contract.id,
      event_type: 'PLAN_ACHIEVED',
      source: 'DEMO_ORACLE',
      payload: { target_clients: contract.target_clients, actual_clients: contract.actual_clients },
      created_at: `${contract.deadline}T11:00:00.000Z`,
    });
  }

  paidStreams.forEach((stream, index) => {
    events.push({
      id: `${contract.id}-escrow-payout-${index + 1}`,
      contract_id: contract.id,
      event_type: 'PAYOUT_TO_AGENT',
      amount: stream.amount,
      actor_role: 'ORACLE',
      metadata: { stream_key: stream.stream_key, stream_title: stream.title },
      created_at: `${stream.paid_at}T12:00:00.000Z`,
    });
  });

  return { escrow: events, oracle };
}

function generateMonthlyContracts(
  agentId: string,
  startDate: string,
  baseKpi: { calls: number; meetings: number; proposals: number },
  performance: number,
  baseRevenue: number,
): DemoContract[] {
  const contracts: DemoContract[] = [];
  const employmentStart = new Date(`${startDate}T00:00:00Z`);
  const firstMonth = firstDayOfMonth(employmentStart);
  const lastMonth = firstDayOfMonth(DEMO_AS_OF_DATE);
  let currentMonth = new Date(firstMonth);
  let index = 1;

  while (currentMonth.getTime() <= lastMonth.getTime()) {
    const isFirstMonth = currentMonth.getFullYear() === employmentStart.getFullYear() && currentMonth.getMonth() === employmentStart.getMonth();
    const contractStart = isFirstMonth ? new Date(employmentStart) : firstDayOfMonth(currentMonth);
    const contractDeadline = endOfMonth(currentMonth);
    const key = monthKey(currentMonth);
    const monthIndex = currentMonth.getMonth();
    const monthFactor = MONTH_FACTORS[monthIndex] ?? 1;
    const activeRatio = elapsedMonthRatio(contractStart, contractDeadline, DEMO_AS_OF_DATE);
    const isCurrentMonth = key === monthKey(DEMO_AS_OF_DATE);
    const effectiveFactor = isCurrentMonth ? Math.min(activeRatio, 1) : 1;
    const expectedPerformance = performance * monthFactor;

    const kpiCalls = Math.round(baseKpi.calls * (0.96 + monthFactor * 0.04));
    const kpiMeetings = Math.round(baseKpi.meetings * (0.96 + monthFactor * 0.04));
    const kpiProposals = Math.round(baseKpi.proposals * (0.96 + monthFactor * 0.04));
    const targetClients = 30;

    const actualFactor = Math.min(expectedPerformance, 1.15) * effectiveFactor;
    const actualCalls = Math.min(kpiCalls, Math.max(0, Math.round(kpiCalls * actualFactor)));
    const actualMeetings = Math.min(kpiMeetings, Math.max(0, Math.round(kpiMeetings * actualFactor)));
    const actualProposals = Math.min(kpiProposals, Math.max(0, Math.round(kpiProposals * actualFactor)));
    const actualClients = Math.min(targetClients, Math.max(0, Math.round(targetClients * actualFactor)));

    const plannedRevenue = roundMoney(baseRevenue * monthFactor);
    const isCompleted = DEMO_AS_OF_DATE.getTime() > contractDeadline.getTime();
    const status: DemoContract['status'] = isCompleted ? 'COMPLETED' : isCurrentMonth ? 'ACTIVE' : 'IN_PROGRESS';

    const contractId = `contract-${agentId}-${index}`;
    const contractBase: Omit<DemoContract, 'bitrix_deals' | 'payout_streams' | 'escrow_events' | 'oracle_events'> = {
      id: contractId,
      title: 'Привлечь 30 корпоративных клиентов',
      description: `Ежемесячный контракт на привлечение 30 корпоративных клиентов и выполнение KPI за ${monthLabel(currentMonth)}.`,
      revenue: plannedRevenue,
      escrow_amount: 0,
      escrow_status: 'FUNDED',
      agent_payouts_total: 0,
      company_profit: 0,
      platform_fee: 0,
      total_paid: 0,
      total_locked: 0,
      status,
      start_date: toDate(contractStart),
      deadline: toDate(contractDeadline),
      month: key,
      kpi_calls: kpiCalls,
      kpi_meetings: kpiMeetings,
      kpi_proposals: kpiProposals,
      target_clients: targetClients,
      actual_calls: actualCalls,
      actual_meetings: actualMeetings,
      actual_proposals: actualProposals,
      actual_clients: actualClients,
    };

    const payoutStreams = buildPayoutStreams(
      contractId,
      plannedRevenue,
      contractStart,
      contractDeadline,
      actualClients,
      targetClients,
      isCompleted,
      expectedPerformance,
    );
    const escrowAmount = payoutStreams.reduce((sum, stream) => sum + stream.amount, 0);
    const totalPaid = payoutStreams.filter(stream => stream.status === 'PAID').reduce((sum, stream) => sum + stream.amount, 0);
    const totalLocked = payoutStreams.filter(stream => stream.status === 'LOCKED').reduce((sum, stream) => sum + stream.amount, 0);
    const platformFee = roundMoney(escrowAmount * PLATFORM_FEE_PERCENT / 100);
    const companyProfit = plannedRevenue - escrowAmount;

    const completedContract = {
      ...contractBase,
      escrow_amount: escrowAmount,
      agent_payouts_total: escrowAmount,
      company_profit: companyProfit,
      platform_fee: platformFee,
      total_paid: totalPaid,
      total_locked: totalLocked,
      bitrix_deals: [] as BitrixDeal[],
      payout_streams: payoutStreams,
      escrow_events: [] as DemoEscrowEvent[],
      oracle_events: [] as DemoOracleEvent[],
    };

    completedContract.bitrix_deals = generateBitrixDeals(completedContract);
    const events = buildEvents(completedContract);
    completedContract.escrow_events = events.escrow;
    completedContract.oracle_events = events.oracle;
    contracts.push(completedContract);

    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    index += 1;
  }

  return contracts;
}

export const DEMO_AGENTS: DemoAgent[] = [
  { id: 'demo-1', name: 'Смирнов Александр', full_name: 'Смирнов Александр Иванович', email: 'a.smirnov@incore.demo', phone: '+7 900 123-45-67', specialization: 'B2B Страхование', start_date: '2026-01-15', contracts: generateMonthlyContracts('demo-1', '2026-01-15', { calls: 120, meetings: 45, proposals: 30 }, 0.95, 250000) },
  { id: 'demo-2', name: 'Козлова Мария', full_name: 'Козлова Мария Петровна', email: 'm.kozlova@incore.demo', phone: '+7 900 234-56-78', specialization: 'Корпоративные клиенты', start_date: '2026-01-20', contracts: generateMonthlyContracts('demo-2', '2026-01-20', { calls: 150, meetings: 60, proposals: 40 }, 1.05, 300000) },
  { id: 'demo-3', name: 'Волков Дмитрий', full_name: 'Волков Дмитрий Сергеевич', email: 'd.volkov@incore.demo', phone: '+7 900 345-67-89', specialization: 'МСБ сегмент', start_date: '2026-02-10', contracts: generateMonthlyContracts('demo-3', '2026-02-10', { calls: 90, meetings: 30, proposals: 20 }, 0.80, 180000) },
  { id: 'demo-4', name: 'Петрова Елена', full_name: 'Петрова Елена Александровна', email: 'e.petrova@incore.demo', phone: '+7 900 456-78-90', specialization: 'Страхование жизни', start_date: '2026-03-05', contracts: generateMonthlyContracts('demo-4', '2026-03-05', { calls: 130, meetings: 50, proposals: 35 }, 1.02, 220000) },
  { id: 'demo-5', name: 'Тихонов Иван', full_name: 'Тихонов Иван Михайлович', email: 'i.tikhonov@incore.demo', phone: '+7 900 567-89-01', specialization: 'Региональные продажи', start_date: '2026-03-12', contracts: generateMonthlyContracts('demo-5', '2026-03-12', { calls: 80, meetings: 25, proposals: 18 }, 1.10, 150000) },
  { id: 'demo-6', name: 'Морозова Ольга', full_name: 'Морозова Ольга Викторовна', email: 'o.morozova@incore.demo', phone: '+7 900 678-90-12', specialization: 'Удержание клиентов', start_date: '2026-03-18', contracts: generateMonthlyContracts('demo-6', '2026-03-18', { calls: 160, meetings: 65, proposals: 45 }, 0.75, 280000) },
  { id: 'demo-7', name: 'Новиков Сергей', full_name: 'Новиков Сергей Андреевич', email: 's.novikov@incore.demo', phone: '+7 900 789-01-23', specialization: 'Партнерская сеть', start_date: '2026-03-25', contracts: generateMonthlyContracts('demo-7', '2026-03-25', { calls: 110, meetings: 40, proposals: 28 }, 0.92, 200000) },
  { id: 'demo-8', name: 'Киселева Наталья', full_name: 'Киселева Наталья Викторовна', email: 'n.kiseleva@incore.demo', phone: '+7 909 013-35-44', specialization: 'EdTech & HRTech', start_date: '2026-01-10', contracts: generateMonthlyContracts('demo-8', '2026-01-10', { calls: 140, meetings: 55, proposals: 38 }, 0.98, 260000) },
];

export function getDemoAgentById(id: string): DemoAgent | null {
  return DEMO_AGENTS.find(agent => agent.id === id) ?? null;
}

export function getDemoContractById(id: string): DemoContract | null {
  for (const agent of DEMO_AGENTS) {
    const contract = agent.contracts.find(item => item.id === id);
    if (contract) return contract;
  }
  return null;
}

export function calculateContractKPI(contract: Pick<DemoContract, 'actual_calls' | 'kpi_calls' | 'actual_meetings' | 'kpi_meetings' | 'actual_proposals' | 'kpi_proposals' | 'actual_clients' | 'target_clients'>): number {
  const calls = contract.kpi_calls > 0 ? contract.actual_calls / contract.kpi_calls : 0;
  const meetings = contract.kpi_meetings > 0 ? contract.actual_meetings / contract.kpi_meetings : 0;
  const proposals = contract.kpi_proposals > 0 ? contract.actual_proposals / contract.kpi_proposals : 0;
  const clients = contract.target_clients > 0 ? contract.actual_clients / contract.target_clients : 0;
  return Math.round(((calls + meetings + proposals + clients) / 4) * 100);
}

export function calculateAgentKPI(agent: { contracts: Array<Pick<DemoContract, 'actual_calls' | 'kpi_calls' | 'actual_meetings' | 'kpi_meetings' | 'actual_proposals' | 'kpi_proposals' | 'actual_clients' | 'target_clients'>> }): number {
  if (agent.contracts.length === 0) return 0;
  const total = agent.contracts.reduce((sum, contract) => sum + calculateContractKPI(contract), 0);
  return Math.round(total / agent.contracts.length);
}

export function calculateRevenueByMonth(): { month: string; value: number; label: string }[] {
  const months = [
    { key: '2026-01', label: 'Янв' },
    { key: '2026-02', label: 'Фев' },
    { key: '2026-03', label: 'Мар' },
    { key: '2026-04', label: 'Апр' },
    { key: '2026-05', label: 'Май' },
    { key: '2026-06', label: 'Июн' },
    { key: '2026-07', label: 'Июл' },
    { key: '2026-08', label: 'Авг' },
  ];

  return months.map(month => {
    const value = DEMO_AGENTS.reduce((sum, agent) => {
      return sum + agent.contracts
        .filter(contract => contract.month === month.key)
        .reduce((contractSum, contract) => contractSum + contract.revenue, 0);
    }, 0);
    return { month: month.key, value, label: month.label };
  });
}

export function calculateTotalBitrixDeals(): number {
  return DEMO_AGENTS.reduce((sum, agent) => sum + agent.contracts.reduce((contractSum, contract) => contractSum + contract.bitrix_deals.length, 0), 0);
}

export function calculateSalesGoalAchievement(): { planned: number; actual: number; percent: number } {
  const currentMonth = '2026-08';
  const contracts = DEMO_AGENTS.flatMap(agent => agent.contracts.filter(contract => contract.month === currentMonth));
  const planned = contracts.reduce((sum, contract) => sum + contract.revenue, 0);
  const actual = contracts.reduce((sum, contract) => sum + contract.revenue * (contract.actual_clients / Math.max(contract.target_clients, 1)), 0);
  return {
    planned: roundMoney(planned),
    actual: roundMoney(actual),
    percent: planned > 0 ? Math.round((actual / planned) * 100) : 0,
  };
}
