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

const AS_OF_DATE = new Date('2026-08-10T23:59:59Z');
const PLATFORM_FEE_PERCENT = 12;
const SALES_PLAN = { clients: 10, averageCheck: 375, revenue: 18750, calls: 100, meetings: 50, proposals: 40 };

// Каноническая финансовая модель одного демо-контракта.
// Суммы потоков являются именно бонусами агента, а не полной суммой договора.
// Годовой бонус никогда не входит в escrow.
const STREAM_CONFIG = [
  { key: 'new_sales_property' as const, title: 'Новые продажи: Имущество/риски', percent: 20, amount: 750, condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'new_sales_casco' as const, title: 'Новые продажи: Автопарки (КАСКО)', percent: 15, amount: 563, condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'new_sales_dms' as const, title: 'Новые продажи: Медицина (ДМС)', percent: 10, amount: 375, condition: 'Оплата клиента подтверждена Oracle' },
  { key: 'renewal' as const, title: 'Продление договоров', percent: 15, amount: 563, condition: 'Подписание доп. соглашения в CRM' },
  { key: 'cross_sell' as const, title: 'Кросс-продажи', percent: 10, amount: 375, condition: 'Продажа дополнительного продукта подтверждена' },
  { key: 'plan_bonus' as const, title: 'Бонус за выполнение плана', percent: 10, amount: 1875, condition: '100% выполнение KPI квартала' },
  { key: 'retention' as const, title: 'Удержание 90 дней', percent: 0, amount: 200, condition: 'Клиент активен более 90 дней' },
  { key: 'annual' as const, title: 'Годовой бонус', percent: 0, amount: 7000, condition: 'Годовой KPI подтверждён в CRM' },
];

const ESCROW_PER_CONTRACT = 4701;
const PLATFORM_FEE_PER_CONTRACT = 564;
const COMPANY_PROFIT_PER_CONTRACT = 14049;

function roundMoney(value: number): number {
  return Math.round(value);
}

function toDate(value: Date): string {
  return value.toISOString().slice(0, 10);
}

function monthKey(value: Date): string {
  return `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(value: Date): string {
  return value.toLocaleString('ru-RU', { month: 'long', year: 'numeric' });
}

function generateBitrixDeals(contract: DemoContract): BitrixDeal[] {
  const start = new Date(`${contract.start_date}T00:00:00Z`);
  const label = monthLabel(start);
  const dealValue = contract.target_clients > 0 ? contract.revenue / contract.target_clients : 0;
  return Array.from({ length: contract.actual_clients }, (_, index) => ({
    id: `${contract.id}-client-${index + 1}`,
    title: `Корпоративный клиент ${index + 1} (${label})`,
    stage: 'Успешно реализовано',
    amount: roundMoney(dealValue),
    created_at: new Date(start.getTime() + Math.min(index + 7, 25) * 86400000).toISOString(),
  }));
}

function buildPayoutStreams(contractId: string, startDate: string, performance: number): DemoPayoutStream[] {
  const start = new Date(`${startDate}T00:00:00Z`);
  const paidAt = toDate(new Date(Math.min(AS_OF_DATE.getTime(), start.getTime() + 7 * 86400000)));
  const actualClients = Math.max(0, Math.round(SALES_PLAN.clients * performance));

  return STREAM_CONFIG.map((config, index) => {
    let status: DemoPayoutStream['status'] = 'LOCKED';
    let unlockedAt: string | null = null;
    let streamPaidAt: string | null = null;

    if (config.key === 'new_sales_property') {
      status = 'PAID';
      unlockedAt = paidAt;
      streamPaidAt = paidAt;
    } else if (config.key === 'new_sales_casco' || config.key === 'new_sales_dms') {
      if (actualClients > 0) {
        status = 'UNLOCKED';
        unlockedAt = paidAt;
      }
    } else if (config.key === 'renewal') {
      status = 'LOCKED';
    } else if (config.key === 'cross_sell') {
      if (actualClients >= Math.ceil(SALES_PLAN.clients * 0.60)) {
        status = 'UNLOCKED';
        unlockedAt = paidAt;
      }
    } else if (config.key === 'plan_bonus') {
      if (performance >= 1) {
        status = 'UNLOCKED';
        unlockedAt = paidAt;
      }
    } else if (config.key === 'retention') {
      status = 'LOCKED';
    } else if (config.key === 'annual') {
      status = 'LOCKED';
    }

    return {
      id: `${contractId}-stream-${index + 1}`,
      contract_id: contractId,
      stream_key: config.key,
      title: config.title,
      percent: config.percent,
      amount: config.amount,
      status,
      unlock_condition: config.condition,
      unlocked_at: unlockedAt,
      paid_at: streamPaidAt,
      clawback_reason: null,
    };
  });
}

function buildEvents(contract: DemoContract): { escrow: DemoEscrowEvent[]; oracle: DemoOracleEvent[] } {
  const escrow: DemoEscrowEvent[] = [
    { id: `${contract.id}-created`, contract_id: contract.id, event_type: 'ESCROW_CREATED', amount: contract.escrow_amount, actor_role: 'SYSTEM', metadata: { annual_bonus_excluded: true }, created_at: `${contract.start_date}T09:00:00.000Z` },
    { id: `${contract.id}-funded`, contract_id: contract.id, event_type: 'ESCROW_FUNDED', amount: contract.escrow_amount, actor_role: 'SYSTEM', metadata: { annual_bonus_excluded: true }, created_at: `${contract.start_date}T09:15:00.000Z` },
  ];

  contract.payout_streams.filter(stream => stream.status === 'PAID' && stream.stream_key !== 'annual').forEach((stream, index) => {
    escrow.push({ id: `${contract.id}-payout-${index + 1}`, contract_id: contract.id, event_type: 'PAYOUT_TO_AGENT', amount: stream.amount, actor_role: 'ORACLE', metadata: { stream_key: stream.stream_key }, created_at: `${stream.paid_at || contract.start_date}T12:00:00.000Z` });
  });

  const oracle: DemoOracleEvent[] = [];
  if (contract.actual_clients > 0) {
    oracle.push({ id: `${contract.id}-payment`, contract_id: contract.id, event_type: 'CLIENT_PAYMENT_CONFIRMED', source: 'DEMO_ORACLE', payload: { actual_clients: contract.actual_clients, target_clients: contract.target_clients }, created_at: `${contract.start_date}T12:00:00.000Z` });
  }
  if (contract.actual_clients >= Math.ceil(SALES_PLAN.clients * 0.60)) {
    oracle.push({ id: `${contract.id}-crosssell`, contract_id: contract.id, event_type: 'CROSS_SELL_CONFIRMED', source: 'DEMO_ORACLE', payload: { actual_clients: contract.actual_clients }, created_at: `${contract.start_date}T13:00:00.000Z` });
  }
  if (contract.actual_clients >= SALES_PLAN.clients) {
    oracle.push({ id: `${contract.id}-plan`, contract_id: contract.id, event_type: 'PLAN_ACHIEVED', source: 'DEMO_ORACLE', payload: { target_clients: contract.target_clients }, created_at: `${contract.start_date}T14:00:00.000Z` });
  }
  return { escrow, oracle };
}

function generateContract(agentId: string, startDate: string, performance: number): DemoContract {
  const actualCalls = Math.max(0, Math.round(SALES_PLAN.calls * performance));
  const actualMeetings = Math.max(0, Math.round(SALES_PLAN.meetings * performance));
  const actualProposals = Math.max(0, Math.round(SALES_PLAN.proposals * performance));
  const actualClients = Math.max(0, Math.round(SALES_PLAN.clients * performance));
  const id = `contract-${agentId}-2026-08`;
  const payoutStreams = buildPayoutStreams(id, startDate, performance);
  const totalPaid = payoutStreams.filter(stream => stream.status === 'PAID' && stream.stream_key !== 'annual').reduce((sum, stream) => sum + stream.amount, 0);
  const totalLocked = payoutStreams.filter(stream => stream.status === 'LOCKED' && stream.stream_key !== 'annual').reduce((sum, stream) => sum + stream.amount, 0);

  const contract: DemoContract = {
    id,
    title: 'Привлечь 10 корпоративных клиентов',
    description: `Выполнить план продаж: ${SALES_PLAN.clients} клиентов, средний чек $${SALES_PLAN.averageCheck}, ${SALES_PLAN.calls} звонков, ${SALES_PLAN.meetings} встреч, ${SALES_PLAN.proposals} КП.`,
    revenue: SALES_PLAN.revenue,
    planned_revenue: SALES_PLAN.revenue,
    escrow_amount: ESCROW_PER_CONTRACT,
    escrow_status: 'FUNDED',
    agent_payouts_total: ESCROW_PER_CONTRACT,
    company_profit: COMPANY_PROFIT_PER_CONTRACT,
    platform_fee: PLATFORM_FEE_PER_CONTRACT,
    roi_percentage: 75,
    total_paid: totalPaid,
    total_locked: totalLocked,
    status: 'ACTIVE',
    start_date: startDate,
    deadline: '2026-08-31',
    month: '2026-08',
    kpi_calls: SALES_PLAN.calls,
    kpi_meetings: SALES_PLAN.meetings,
    kpi_proposals: SALES_PLAN.proposals,
    target_clients: SALES_PLAN.clients,
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
  return contract;
}

export const DEMO_AGENTS: DemoAgent[] = [
  { id: 'demo-1', name: 'Смирнов Александр', full_name: 'Смирнов Александр Иванович', email: 'a.smirnov@incore.demo', phone: '+7 900 123-45-67', specialization: 'B2B Страхование', start_date: '2026-01-15', contracts: [generateContract('demo-1', '2026-08-01', 0.67)] },
  { id: 'demo-2', name: 'Козлова Мария', full_name: 'Козлова Мария Петровна', email: 'm.kozlova@incore.demo', phone: '+7 900 234-56-78', specialization: 'Корпоративные клиенты', start_date: '2026-01-20', contracts: [generateContract('demo-2', '2026-08-01', 1.07)] },
  { id: 'demo-3', name: 'Волков Дмитрий', full_name: 'Волков Дмитрий Сергеевич', email: 'd.volkov@incore.demo', phone: '+7 900 345-67-89', specialization: 'МСБ сегмент', start_date: '2026-02-10', contracts: [generateContract('demo-3', '2026-08-01', 1.00)] },
  { id: 'demo-4', name: 'Петрова Елена', full_name: 'Петрова Елена Александровна', email: 'e.petrova@incore.demo', phone: '+7 900 456-78-90', specialization: 'Страхование жизни', start_date: '2026-03-05', contracts: [generateContract('demo-4', '2026-08-01', 0.95)] },
  { id: 'demo-5', name: 'Тихонов Иван', full_name: 'Тихонов Иван Михайлович', email: 'i.tikhonov@incore.demo', phone: '+7 900 567-89-01', specialization: 'Региональные продажи', start_date: '2026-03-12', contracts: [generateContract('demo-5', '2026-08-01', 0.80)] },
  { id: 'demo-7', name: 'Новиков Сергей', full_name: 'Новиков Сергей Андреевич', email: 's.novikov@incore.demo', phone: '+7 900 789-01-23', specialization: 'Партнерская сеть', start_date: '2026-03-25', contracts: [generateContract('demo-7', '2026-08-01', 0.81)] },
];

export function getDemoAgentById(id: string): DemoAgent | null {
  return DEMO_AGENTS.find(agent => agent.id === id) ?? null;
}

export function getDemoContractById(id: string): DemoContract | null {
  for (const agent of DEMO_AGENTS) {
    const contract = agent.contracts.find(contract => contract.id === id);
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
