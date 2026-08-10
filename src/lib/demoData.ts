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
  actual_property_revenue?: number;
  actual_casco_revenue?: number;
  actual_dms_revenue?: number;
  actual_renewal_revenue?: number;
  actual_cross_sell_revenue?: number;
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
