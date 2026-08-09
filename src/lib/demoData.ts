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
  planned_revenue?: number;
  escrow_amount: number;
  escrow_status: 'FUNDED';
  agent_payouts_total: number;
  company_profit: number;
  platform_fee: number;
  roi_percentage?: number;
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

const SALES_PLAN = {
  clients: 10,
  averageCheck: 375,
  revenue: 18750,
  calls: 100,
  meetings: 50,
  proposals: 40,
};

// Процентные потоки считаются от всей плановой выручки.
// Годовой бонус отображается отдельно и никогда не входит в escrow.
const STREAM_CONFIG = [
  { key: 'new_sales_property' as const, title: 'Новые продажи: Имущество/риски', percent: 20, amount: roundMoney(SALES_PLAN.revenue * 0.20), condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'new_sales_casco' as const, title: 'Новые продажи: Автопарки (КАСКО)', percent: 15, amount: roundMoney(SALES_PLAN.revenue * 0.15), condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'new_sales_dms' as const, title: 'Новые продажи: Медицина (ДМС)', percent: 10, amount: roundMoney(SALES_PLAN.revenue * 0.10), condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'renewal' as const, title: 'Продление договоров', percent: 15, amount: roundMoney(SALES_PLAN.revenue * 0.15), condition: 'Подписание доп. соглашения в CRM' },
  { key: 'cross_sell' as const, title: 'Кросс-продажи', percent: 10, amount: roundMoney(SALES_PLAN.revenue * 0.10), condition: 'Продажа дополнительного продукта подтверждена' },
  { key: 'plan_bonus' as const, title: 'Бонус за выполнение плана', percent: 10, amount: roundMoney(SALES_PLAN.revenue * 0.10), condition: '100% выполнение KPI квартала' },
  { key: 'retention' as const, title: 'Удержание 90 дней', percent: 0, amount: 200, condition: 'Клиент активен более 90 дней' },
  { key: 'annual' as const, title: 'Годовой бонус', percent: 0, amount: 7000, condition: 'Годовой KPI подтверждён в CRM' },
];

const ESCROW_PER_CONTRACT = STREAM_CONFIG
  .filter(stream => stream.key !== 'annual')
  .reduce((sum, stream) => sum + stream.amount, 0);

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

function generateBitrixDeals(contract: DemoContract): BitrixDeal[] {
  const deals: BitrixDeal[] = [];
  const start = new Date(`${contract.start_date}T00:00:00Z`);
  const label = monthLabel(start);
  const dealValue = contract.target_clients > 0 ? contract.revenue / contract.target_clients : 0;

  for (let i = 0; i < contract.actual_clients; i += 1) {
    deals.push({
      id: `${contract.id}-client-${i + 1}`,
      title: `Корпоративный клиент ${i + 1} (${label})`,
      stage: 'Успешно реализовано',
      amount: roundMoney(dealValue),
      created_at: new Date(start.getTime() + Math.min(i + 7, 25) * 86400000).toISOString(),
    });
  }

  return deals;
}

function buildPayoutStreams(
  contractId: string,
  contractStart: Date,
  deadline: Date,
  actualClients: number,
  performance: number,
  isCurrentMonth: boolean,
  isCompleted: boolean,
): DemoPayoutStream[] {
  const clientPaymentDate = new Date(contractStart.getTime() + Math.max(1, Math.round((deadline.getTime() - contractStart.getTime()) * 0.45)));
  const streams: DemoPayoutStream[] = [];

  STREAM_CONFIG.forEach((config, index) => {
    let status: DemoPayoutStream['status'] = 'LOCKED';
    let unlockedAt: string | null = null;
    let paidAt: string | null = null;

    if (config.key === 'new_sales_property') {
      if (isCurrentMonth) {
        status = 'PAID';
        unlockedAt = toDate(clientPaymentDate);
        paidAt = toDate(new Date(clientPaymentDate.getTime() + 86400000));
      } else if (isCompleted) {
        status = 'PAID';
        unlockedAt = toDate(clientPaymentDate);
        paidAt = toDate(new Date(clientPaymentDate.getTime() + 86400000));
      } else if (performance >= 0.70) {
        status = 'UNLOCKED';
        unlockedAt = toDate(clientPaymentDate);
      }
    } else if (config.key === 'new_sales_casco' || config.key === 'new_sales_dms') {
      if (isCurrentMonth && actualClients > 0) {
        status = 'UNLOCKED';
        unlockedAt = toDate(clientPaymentDate);
      } else if (isCompleted && actualClients > 0) {
        status = 'PAID';
        unlockedAt = toDate(clientPaymentDate);
        paidAt = toDate(new Date(clientPaymentDate.getTime() + 86400000));
      }
    } else if (config.key === 'renewal') {
      if (isCompleted && performance >= 0.85) {
        status = 'PAID';
        unlockedAt = toDate(new Date(deadline.getTime() - 5 * 86400000));
        paidAt = toDate(new Date(deadline.getTime() - 4 * 86400000));
      }
    } else if (config.key === 'cross_sell') {
      if (actualClients >= Math.ceil(SALES_PLAN.clients * 0.60)) {
        status = isCompleted ? 'PAID' : 'UNLOCKED';
        unlockedAt = toDate(new Date(contractStart.getTime() + Math.max(2, Math.round((deadline.getTime() - contractStart.getTime()) * 0.65))));
        paidAt = isCompleted ? toDate(new Date(new Date(unlockedAt).getTime() + 86400000)) : null;
      }
    } else if (config.key === 'plan_bonus') {
      if (performance >= 1 && actualClients >= SALES_PLAN.clients) {
        status = isCompleted ? 'PAID' : 'UNLOCKED';
        unlockedAt = toDate(deadline);
        paidAt = isCompleted ? toDate(new Date(deadline.getTime() + 86400000)) : null;
      }
    } else if (config.key === 'retention') {
      status = 'LOCKED';
    } else if (config.key === 'annual') {
      status = 'LOCKED';
    }

    streams.push({
      id: `${contractId}-stream-${index + 1}`,
      contract_id: contractId,
      stream_key: config.key,
      title: config.title,
      percent: config.percent,
      amount: config.amount,
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
  const escrow: DemoEscrowEvent[] = [
    {
      id: `${contract.id}-escrow-created`,
      contract_id: contract.id,
      event_type: 'ESCROW_CREATED',
      amount: contract.escrow_amount,
      actor_role: 'SYSTEM',
      metadata: { streams_count: contract.payout_streams.filter(s => s.stream_key !== 'annual').length, total_escrow: contract.escrow_amount },
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

  contract.payout_streams
    .filter(stream => stream.status === 'PAID' && stream.stream_key !== 'annual')
    .forEach((stream, index) => {
      escrow.push({
        id: `${contract.id}-escrow-payout-${index + 1}`,
        contract_id: contract.id,
        event_type: 'PAYOUT_TO_AGENT',
        amount: stream.amount,
        actor_role: 'ORACLE',
        metadata: { stream_key: stream.stream_key, stream_title: stream.title },
        created_at: `${stream.paid_at || contract.start_date}T12:00:00.000Z`,
      });
    });

  const oracle: DemoOracleEvent[] = [];
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

  if (contract.actual_clients >= Math.ceil(SALES_PLAN.clients * 0.60)) {
    oracle.push({
      id: `${contract.id}-oracle-crosssell`,
      contract_id: contract.id,
      event_type: 'CROSS_SELL_CONFIRMED',
      source: 'DEMO_ORACLE',
      payload: { eligible_clients: contract.actual_clients },
      created_at: `${contract.deadline}T10:00:00.000Z`,
    });
  }

  if (contract.actual_clients >= SALES_PLAN.clients) {
    oracle.push({
      id: `${contract.id}-oracle-plan`,
      contract_id: contract.id,
      event_type: 'PLAN_ACHIEVED',
      source: 'DEMO_ORACLE',
      payload: { target_clients: contract.target_clients, actual_clients: contract.actual_clients },
      created_at: `${contract.deadline}T11:00:00.000Z`,
    });
  }

  return { escrow, oracle };
}

function generateMonthlyContracts(
  agentId: string,
  startDate: string,
  performance: number,
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
    const isCurrentMonth = key === monthKey(DEMO_AS_OF_DATE);
    const isCompleted = DEMO_AS_OF_DATE.getTime() > contractDeadline.getTime();

    const kpiCalls = SALES_PLAN.calls;
    const kpiMeetings = SALES_PLAN.meetings;
    const kpiProposals = SALES_PLAN.proposals;
    const targetClients = SALES_PLAN.clients;

    const actualCalls = Math.max(0, Math.round(kpiCalls * performance));
    const actualMeetings = Math.max(0, Math.round(kpiMeetings * performance));
    const actualProposals = Math.max(0, Math.round(kpiProposals * performance));
    const actualClients = Math.max(0, Math.round(targetClients * performance));

    const contractId = `contract-${agentId}-${index}`;
    const payoutStreams = buildPayoutStreams(contractId, contractStart, contractDeadline, actualClients, performance, isCurrentMonth, isCompleted);
    const escrowAmount = ESCROW_PER_CONTRACT;
    const totalPaid = payoutStreams.filter(stream => stream.status === 'PAID' && stream.stream_key !== 'annual').reduce((sum, stream) => sum + stream.amount, 0);
    const totalLocked = payoutStreams.filter(stream => stream.status === 'LOCKED' && stream.stream_key !== 'annual').reduce((sum, stream) => sum + stream.amount, 0);
    const platformFee = roundMoney(escrowAmount * PLATFORM_FEE_PERCENT / 100);
    // Та же финансовая формула, что и в smartContractLogic:
    // выручка - escrow - комиссия InCORE. Годовой бонус не участвует.
    const companyProfit = SALES_PLAN.revenue - escrowAmount - platformFee;

    const contract: DemoContract = {
      id: contractId,
      title: 'Привлечь 10 корпоративных клиентов',
      description: `Выполнить план продаж: ${SALES_PLAN.clients} клиентов, ${SALES_PLAN.calls} звонков, ${SALES_PLAN.meetings} встреч, ${SALES_PLAN.proposals} КП.`,
      revenue: SALES_PLAN.revenue,
      planned_revenue: SALES_PLAN.revenue,
      escrow_amount: escrowAmount,
      escrow_status: 'FUNDED',
      agent_payouts_total: escrowAmount,
      company_profit: companyProfit,
      platform_fee: platformFee,
      roi_percentage: Math.round((companyProfit / SALES_PLAN.revenue) * 100),
      total_paid: totalPaid,
      total_locked: totalLocked,
      status: isCompleted ? 'COMPLETED' : isCurrentMonth ? 'ACTIVE' : 'IN_PROGRESS',
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
      bitrix_deals: [],
      payout_streams: payoutStreams,
      escrow_events: [],
      oracle_events: [],
    };

    contract.bitrix_deals = generateBitrixDeals(contract);
    const events = buildEvents(contract);
    contract.escrow_events = events.escrow;
    contract.oracle_events = events.oracle;
    contracts.push(contract);

    currentMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);
    index += 1;
  }

  return contracts;
}

export const DEMO_AGENTS: DemoAgent[] = [
  { id: 'demo-1', name: 'Смирнов Александр', full_name: 'Смирнов Александр Иванович', email: 'a.smirnov@incore.demo', phone: '+7 900 123-45-67', specialization: 'B2B Страхование', start_date: '2026-01-15', contracts: generateMonthlyContracts('demo-1', '2026-01-15', 0.67) },
  { id: 'demo-2', name: 'Козлова Мария', full_name: 'Козлова Мария Петровна', email: 'm.kozlova@incore.demo', phone: '+7 900 234-56-78', specialization: 'Корпоративные клиенты', start_date: '2026-01-20', contracts: generateMonthlyContracts('demo-2', '2026-01-20', 1.07) },
  { id: 'demo-3', name: 'Волков Дмитрий', full_name: 'Волков Дмитрий Сергеевич', email: 'd.volkov@incore.demo', phone: '+7 900 345-67-89', specialization: 'МСБ сегмент', start_date: '2026-02-10', contracts: generateMonthlyContracts('demo-3', '2026-02-10', 1.00) },
  { id: 'demo-4', name: 'Петрова Елена', full_name: 'Петрова Елена Александровна', email: 'e.petrova@incore.demo', phone: '+7 900 456-78-90', specialization: 'Страхование жизни', start_date: '2026-03-05', contracts: generateMonthlyContracts('demo-4', '2026-03-05', 0.95) },
  { id: 'demo-5', name: 'Тихонов Иван', full_name: 'Тихонов Иван Михайлович', email: 'i.tikhonov@incore.demo', phone: '+7 900 567-89-01', specialization: 'Региональные продажи', start_date: '2026-03-12', contracts: generateMonthlyContracts('demo-5', '2026-03-12', 0.80) },
  { id: 'demo-7', name: 'Новиков Сергей', full_name: 'Новиков Сергей Андреевич', email: 's.novikov@incore.demo', phone: '+7 900 789-01-23', specialization: 'Партнерская сеть', start_date: '2026-03-25', contracts: generateMonthlyContracts('demo-7', '2026-03-25', 0.81) },
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
  const values = [
    contract.kpi_calls > 0 ? contract.actual_calls / contract.kpi_calls : 0,
    contract.kpi_meetings > 0 ? contract.actual_meetings / contract.kpi_meetings : 0,
    contract.kpi_proposals > 0 ? contract.actual_proposals / contract.kpi_proposals : 0,
    contract.target_clients > 0 ? contract.actual_clients / contract.target_clients : 0,
  ];
  return Math.round((values.reduce((sum, value) => sum + value, 0) / values.length) * 100);
}
