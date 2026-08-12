import { DEMO_AGENTS, type DemoContract } from './demoData';
import { calculateContractFinancials } from './contractFinance';

interface HistoricalContractConfig {
  agentId: string;
  month: string;
  deadline: string;
  revenue: number;
}

function buildCompletedContract(config: HistoricalContractConfig, index: number): DemoContract {
  const { agentId, month, deadline, revenue: totalRevenue } = config;
  const id = `demo-completed-${agentId}-${month}-${index + 1}`;
  const startDate = `${month}-01`;
  const perCategory = Math.round(totalRevenue / 5);
  const finance = calculateContractFinancials({
    property: perCategory,
    casco: perCategory,
    dms: perCategory,
    renewal: perCategory,
    crossSell: totalRevenue - perCategory * 4,
  });
  const clients = Math.max(5, Math.round(totalRevenue / 375));
  const deals = Array.from({ length: clients }, (_, i) => ({
    id: `${id}-deal-${i + 1}`,
    title: `Корпоративный клиент ${i + 1}`,
    stage: 'Успешно реализовано',
    amount: Math.round(totalRevenue / clients),
    created_at: `${startDate}T10:00:00.000Z`,
  }));

  const streams = [
    ['new_sales_property', 'Новые продажи: Имущество/риски', 20, finance.bonusProperty],
    ['new_sales_casco', 'Новые продажи: Автопарки (КАСКО)', 15, finance.bonusCasco],
    ['new_sales_dms', 'Новые продажи: Медицина (ДМС)', 10, finance.bonusDms],
    ['renewal', 'Продление договоров', 15, finance.bonusRenewal],
    ['cross_sell', 'Кросс-продажи', 10, finance.bonusCrossSell],
    ['plan_bonus', 'Бонус за выполнение плана', 10, finance.bonusPlan],
    ['retention', 'Удержание 90 дней', 0, finance.bonusRetention],
    ['annual', 'Годовой бонус', 0, finance.bonusAnnual],
  ].map(([stream_key, title, percent, amount], i: number) => ({
    id: `${id}-stream-${i + 1}`,
    contract_id: id,
    stream_key: stream_key as any,
    title: String(title),
    percent: Number(percent),
    amount: Number(amount),
    status: stream_key === 'annual' ? 'LOCKED' as const : 'PAID' as const,
    unlock_condition: 'Фактическая сумма договора подтверждена CRM/Oracle',
    unlocked_at: `${deadline}T12:00:00.000Z`,
    paid_at: stream_key === 'annual' ? null : `${deadline}T12:00:00.000Z`,
    clawback_reason: null,
  }));

  const escrowEvents = [
    {
      id: `${id}-escrow`,
      contract_id: id,
      event_type: 'ESCROW_CREATED' as const,
      amount: finance.totalEscrow,
      actor_role: 'SYSTEM' as const,
      metadata: { actual_contract_revenue: totalRevenue, annual_bonus_excluded: true },
      created_at: `${startDate}T09:00:00.000Z`,
    },
    {
      id: `${id}-paid`,
      contract_id: id,
      event_type: 'PAYOUT_TO_AGENT' as const,
      amount: finance.totalEscrow,
      actor_role: 'ORACLE' as const,
      metadata: { actual_contract_revenue: totalRevenue },
      created_at: `${deadline}T12:00:00.000Z`,
    },
  ];

  const oracleEvents = [
    {
      id: `${id}-payment`,
      contract_id: id,
      event_type: 'CLIENT_PAYMENT_CONFIRMED' as const,
      source: 'DEMO_ORACLE',
      payload: { actual_contract_revenue: totalRevenue, deals_count: clients },
      created_at: `${deadline}T10:00:00.000Z`,
    },
    {
      id: `${id}-plan`,
      contract_id: id,
      event_type: 'PLAN_ACHIEVED' as const,
      source: 'DEMO_ORACLE',
      payload: { actual_contract_revenue: totalRevenue },
      created_at: `${deadline}T11:00:00.000Z`,
    },
  ];

  return {
    id,
    title: `Завершённый контракт: ${clients} корпоративных клиентов`,
    description: 'Контракт завершён. Расчёт бонусов выполнен от фактических сумм договоров с клиентами.',
    revenue: Math.round(totalRevenue),
    planned_revenue: Math.round(totalRevenue),
    actual_property_revenue: perCategory,
    actual_casco_revenue: perCategory,
    actual_dms_revenue: perCategory,
    actual_renewal_revenue: perCategory,
    actual_cross_sell_revenue: totalRevenue - perCategory * 4,
    escrow_amount: finance.totalEscrow,
    escrow_status: 'FUNDED',
    agent_payouts_total: finance.agentPayout,
    company_profit: finance.companyProfit,
    platform_fee: finance.platformFee,
    roi_percentage: finance.roi,
    total_paid: finance.totalEscrow,
    total_locked: 0,
    status: 'COMPLETED',
    start_date: startDate,
    deadline,
    month,
    kpi_calls: 100,
    kpi_meetings: 50,
    kpi_proposals: 40,
    target_clients: clients,
    actual_calls: 100,
    actual_meetings: 50,
    actual_proposals: 40,
    actual_clients: clients,
    bitrix_deals: deals,
    payout_streams: streams,
    escrow_events: escrowEvents,
    oracle_events: oracleEvents,
  };
}

// Historical demo data: one completed contract for every month January-July.
// August contracts are supplied by DEMO_AGENTS and are intentionally not duplicated here.
const HISTORICAL_CONTRACTS: HistoricalContractConfig[] = [
  { agentId: 'demo-1', month: '2026-01', deadline: '2026-01-28', revenue: 14700 },
  { agentId: 'demo-2', month: '2026-02', deadline: '2026-02-28', revenue: 18150 },
  { agentId: 'demo-3', month: '2026-03', deadline: '2026-03-28', revenue: 20250 },
  { agentId: 'demo-4', month: '2026-04', deadline: '2026-04-28', revenue: 16800 },
  { agentId: 'demo-5', month: '2026-05', deadline: '2026-05-28', revenue: 21450 },
  { agentId: 'demo-7', month: '2026-06', deadline: '2026-06-28', revenue: 19320 },
  { agentId: 'demo-1', month: '2026-07', deadline: '2026-07-28', revenue: 23750 },
];

export const COMPLETED_DEMO_CONTRACTS: DemoContract[] = HISTORICAL_CONTRACTS.map((config, index) =>
  buildCompletedContract(config, index),
);

export function getCompletedDemoContractById(id: string): DemoContract | undefined {
  return COMPLETED_DEMO_CONTRACTS.find(contract => contract.id === id);
}
