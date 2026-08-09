import { supabase } from './supabase';

export interface PayoutStream {
  id: string;
  contract_id: string;
  stream_key: 'new_sales_property' | 'new_sales_casco' | 'new_sales_dms' | 'renewal' | 'cross_sell' | 'plan_bonus' | 'retention' | 'annual';
  title: string;
  percent: number;
  amount: number;
  status: 'LOCKED' | 'PENDING_VERIFICATION' | 'UNLOCKED' | 'PAYABLE' | 'PAID' | 'CLAWED_BACK' | 'CANCELLED';
  unlock_condition: string | null;
  unlocked_at: string | null;
  paid_at: string | null;
  clawback_reason: string | null;
  created_at: string;
}

export interface EscrowEvent {
  id: string;
  contract_id: string;
  event_type: 'ESCROW_CREATED' | 'ESCROW_FUNDED' | 'PARTIAL_RELEASE' | 'PAYOUT_TO_AGENT' | 'REFUND_TO_CEO' | 'CLAWBACK' | 'DISPUTE_OPENED';
  amount: number | null;
  actor_role: 'CEO' | 'ORACLE' | 'SYSTEM' | null;
  actor_id: string | null;
  metadata: any;
  created_at: string;
}

export interface OracleEvent {
  id: string;
  contract_id: string;
  event_type: 'CLIENT_PAYMENT_CONFIRMED' | 'CLIENT_PAYMENT_FAILED' | 'CLIENT_CHURNED_BEFORE_90_DAYS' | 'RETENTION_PERIOD_PASSED' | 'RENEWAL_CONFIRMED' | 'CROSS_SELL_CONFIRMED' | 'PLAN_ACHIEVED' | 'ANNUAL_BONUS_CONFIRMED' | 'DISPUTE_OPENED' | 'DISPUTE_RESOLVED';
  source: string | null;
  payload: any;
  signature: string | null;
  created_by: string | null;
  created_at: string;
}

export interface Dispute {
  id: string;
  contract_id: string;
  opened_by: string | null;
  reason: string;
  status: 'OPEN' | 'RESOLVED' | 'REJECTED';
  resolution: string | null;
  created_at: string;
  resolved_at: string | null;
}

export const PAYOUT_STREAMS_CONFIG = {
  new_sales_property: { title: 'Новые продажи: Имущество/риски', percent: 20, unlock_condition: 'Оплата клиента подтверждена Oracle' },
  new_sales_casco: { title: 'Новые продажи: Автопарки (КАСКО)', percent: 15, unlock_condition: 'Оплата клиента подтверждена Oracle' },
  new_sales_dms: { title: 'Новые продажи: Медицина (ДМС)', percent: 10, unlock_condition: 'Оплата клиента подтверждена Oracle' },
  renewal: { title: 'Продление договоров', percent: 15, unlock_condition: 'Подписание доп. соглашения в CRM' },
  cross_sell: { title: 'Кросс-продажи', percent: 10, unlock_condition: 'Продажа доп. продукта подтверждена' },
  plan_bonus: { title: 'Бонус за выполнение плана', percent: 10, unlock_condition: '100% выполнение KPI квартала' },
  retention: { title: 'Удержание 90 дней', percent: 0, fixed_amount: 200, unlock_condition: 'Клиент активен > 90 дней (Clawback при уходе < 90 дней)' },
  annual: { title: 'Годовой бонус', percent: 0, fixed_amount: 7000, unlock_condition: 'Январь 2027, KPI за год из CRM' },
};

export const PLATFORM_FEE_PERCENT = 12;

export async function createPayoutStreamsForContract(
  contractId: string,
  plannedRevenue: number,
  _targetClientsNew: number,
  _targetClientsRenewal: number,
  _targetClientsCrossSell: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const revenue = Number(plannedRevenue);
    if (!Number.isFinite(revenue) || revenue < 0) {
      return { success: false, error: 'Некорректная плановая выручка' };
    }

    // Все процентные payout streams считаются от ОДНОЙ базы:
    // plannedRevenue. Деление выручки на 3 здесь было ошибкой и занижало
    // обязательства перед агентом в 3 раза для первых пяти потоков.
    const percentageAmount = (percent: number) => Math.round(revenue * percent / 100);

    const streams = [
      {
        contract_id: contractId,
        stream_key: 'new_sales_property',
        title: PAYOUT_STREAMS_CONFIG.new_sales_property.title,
        percent: PAYOUT_STREAMS_CONFIG.new_sales_property.percent,
        amount: percentageAmount(PAYOUT_STREAMS_CONFIG.new_sales_property.percent),
        status: 'LOCKED',
        unlock_condition: PAYOUT_STREAMS_CONFIG.new_sales_property.unlock_condition,
      },
      {
        contract_id: contractId,
        stream_key: 'new_sales_casco',
        title: PAYOUT_STREAMS_CONFIG.new_sales_casco.title,
        percent: PAYOUT_STREAMS_CONFIG.new_sales_casco.percent,
        amount: percentageAmount(PAYOUT_STREAMS_CONFIG.new_sales_casco.percent),
        status: 'LOCKED',
        unlock_condition: PAYOUT_STREAMS_CONFIG.new_sales_casco.unlock_condition,
      },
      {
        contract_id: contractId,
        stream_key: 'new_sales_dms',
        title: PAYOUT_STREAMS_CONFIG.new_sales_dms.title,
        percent: PAYOUT_STREAMS_CONFIG.new_sales_dms.percent,
        amount: percentageAmount(PAYOUT_STREAMS_CONFIG.new_sales_dms.percent),
        status: 'LOCKED',
        unlock_condition: PAYOUT_STREAMS_CONFIG.new_sales_dms.unlock_condition,
      },
      {
        contract_id: contractId,
        stream_key: 'renewal',
        title: PAYOUT_STREAMS_CONFIG.renewal.title,
        percent: PAYOUT_STREAMS_CONFIG.renewal.percent,
        amount: percentageAmount(PAYOUT_STREAMS_CONFIG.renewal.percent),
        status: 'LOCKED',
        unlock_condition: PAYOUT_STREAMS_CONFIG.renewal.unlock_condition,
      },
      {
        contract_id: contractId,
        stream_key: 'cross_sell',
        title: PAYOUT_STREAMS_CONFIG.cross_sell.title,
        percent: PAYOUT_STREAMS_CONFIG.cross_sell.percent,
        amount: percentageAmount(PAYOUT_STREAMS_CONFIG.cross_sell.percent),
        status: 'LOCKED',
        unlock_condition: PAYOUT_STREAMS_CONFIG.cross_sell.unlock_condition,
      },
      {
        contract_id: contractId,
        stream_key: 'plan_bonus',
        title: PAYOUT_STREAMS_CONFIG.plan_bonus.title,
        percent: PAYOUT_STREAMS_CONFIG.plan_bonus.percent,
        amount: percentageAmount(PAYOUT_STREAMS_CONFIG.plan_bonus.percent),
        status: 'LOCKED',
        unlock_condition: PAYOUT_STREAMS_CONFIG.plan_bonus.unlock_condition,
      },
      {
        contract_id: contractId,
        stream_key: 'retention',
        title: PAYOUT_STREAMS_CONFIG.retention.title,
        percent: 0,
        amount: PAYOUT_STREAMS_CONFIG.retention.fixed_amount || 200,
        status: 'LOCKED',
        unlock_condition: PAYOUT_STREAMS_CONFIG.retention.unlock_condition,
      },
    ];

    const { error } = await supabase.from('contract_payout_streams').insert(streams);
    if (error) throw error;

    const totalEscrow = streams.reduce((sum, stream) => sum + stream.amount, 0);
    const { error: escrowError } = await supabase.from('escrow_events').insert({
      contract_id: contractId,
      event_type: 'ESCROW_CREATED',
      amount: totalEscrow,
      actor_role: 'SYSTEM',
      metadata: {
        streams_count: streams.length,
        total_escrow: totalEscrow,
        annual_bonus_excluded: true,
        percentage_base: revenue,
        percentage_payout_total: 80,
      },
    });
    if (escrowError) throw escrowError;

    return { success: true };
  } catch (err) {
    console.error('Ошибка создания потоков выплат:', err);
    return { success: false, error: (err as Error).message };
  }
}

export async function simulateOracleEvent(
  contractId: string,
  eventType: OracleEvent['event_type'],
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error: oracleError } = await supabase.from('oracle_events').insert({
      contract_id: contractId,
      event_type: eventType,
      source: 'MANUAL_DEMO',
      payload: { triggered_by: userId, timestamp: new Date().toISOString() },
      signature: `demo_sig_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`,
      created_by: userId,
    });
    if (oracleError) throw oracleError;

    switch (eventType) {
      case 'CLIENT_PAYMENT_CONFIRMED': await handleClientPaymentConfirmed(contractId, userId); break;
      case 'CLIENT_CHURNED_BEFORE_90_DAYS': await handleClientChurnedBefore90Days(contractId, userId); break;
      case 'RETENTION_PERIOD_PASSED': await handleRetentionPeriodPassed(contractId, userId); break;
      case 'RENEWAL_CONFIRMED': await handleRenewalConfirmed(contractId, userId); break;
      case 'CROSS_SELL_CONFIRMED': await handleCrossSellConfirmed(contractId, userId); break;
      case 'PLAN_ACHIEVED': await handlePlanAchieved(contractId, userId); break;
      case 'ANNUAL_BONUS_CONFIRMED': break;
      case 'DISPUTE_OPENED':
      case 'DISPUTE_RESOLVED': break;
    }
    return { success: true };
  } catch (err) {
    console.error('Ошибка симуляции Oracle:', err);
    return { success: false, error: (err as Error).message };
  }
}

async function handleClientPaymentConfirmed(contractId: string, userId: string) {
  await supabase.from('contracts').update({
    client_payment_confirmed: true,
    client_payment_date: new Date().toISOString(),
    oracle_status: 'VERIFIED',
    escrow_status: 'FUNDED'
  }).eq('id', contractId);

  await supabase.from('contract_payout_streams').update({
    status: 'UNLOCKED', unlocked_at: new Date().toISOString()
  }).eq('contract_id', contractId)
    .in('stream_key', ['new_sales_property', 'new_sales_casco', 'new_sales_dms']);

  const { data: streams } = await supabase.from('contract_payout_streams')
    .select('amount').eq('contract_id', contractId)
    .in('stream_key', ['new_sales_property', 'new_sales_casco', 'new_sales_dms']);

  const totalReleased = streams?.reduce((sum, stream) => sum + (stream.amount || 0), 0) || 0;
  await supabase.from('escrow_events').insert({
    contract_id: contractId,
    event_type: 'PARTIAL_RELEASE',
    amount: totalReleased,
    actor_role: 'ORACLE',
    actor_id: userId,
    metadata: { event: 'CLIENT_PAYMENT_CONFIRMED', streams: ['new_sales_property', 'new_sales_casco', 'new_sales_dms'] },
  });
}

async function handleClientChurnedBefore90Days(contractId: string, userId: string) {
  await supabase.from('contract_payout_streams').update({
    status: 'CLAWED_BACK',
    clawback_reason: 'Клиент ушёл до 90 дней. Бонус за удержание не выплачивается.'
  }).eq('contract_id', contractId).eq('stream_key', 'retention');

  await supabase.from('contracts').update({ clawback_applied: true }).eq('id', contractId);
  await supabase.from('escrow_events').insert({
    contract_id: contractId,
    event_type: 'CLAWBACK',
    amount: 200,
    actor_role: 'ORACLE',
    actor_id: userId,
    metadata: { reason: 'CLIENT_CHURNED_BEFORE_90_DAYS' },
  });
}

async function handleRetentionPeriodPassed(contractId: string, userId: string) {
  const { data: stream } = await supabase.from('contract_payout_streams')
    .select('amount').eq('contract_id', contractId).eq('stream_key', 'retention').maybeSingle();
  const amount = Number(stream?.amount || PAYOUT_STREAMS_CONFIG.retention.fixed_amount || 200);

  await supabase.from('contract_payout_streams').update({
    status: 'UNLOCKED', unlocked_at: new Date().toISOString()
  }).eq('contract_id', contractId).eq('stream_key', 'retention');

  await supabase.from('escrow_events').insert({
    contract_id: contractId, event_type: 'PARTIAL_RELEASE', amount,
    actor_role: 'ORACLE', actor_id: userId, metadata: { event: 'RETENTION_PERIOD_PASSED' },
  });
}

async function handleRenewalConfirmed(contractId: string, userId: string) {
  await supabase.from('contract_payout_streams').update({
    status: 'UNLOCKED', unlocked_at: new Date().toISOString()
  }).eq('contract_id', contractId).eq('stream_key', 'renewal');

  const { data: stream } = await supabase.from('contract_payout_streams')
    .select('amount').eq('contract_id', contractId).eq('stream_key', 'renewal').single();

  await supabase.from('escrow_events').insert({
    contract_id: contractId, event_type: 'PARTIAL_RELEASE', amount: stream?.amount || 0,
    actor_role: 'ORACLE', actor_id: userId, metadata: { event: 'RENEWAL_CONFIRMED' },
  });
}

async function handleCrossSellConfirmed(contractId: string, userId: string) {
  await supabase.from('contract_payout_streams').update({
    status: 'UNLOCKED', unlocked_at: new Date().toISOString()
  }).eq('contract_id', contractId).eq('stream_key', 'cross_sell');

  const { data: stream } = await supabase.from('contract_payout_streams')
    .select('amount').eq('contract_id', contractId).eq('stream_key', 'cross_sell').single();

  await supabase.from('escrow_events').insert({
    contract_id: contractId, event_type: 'PARTIAL_RELEASE', amount: stream?.amount || 0,
    actor_role: 'ORACLE', actor_id: userId, metadata: { event: 'CROSS_SELL_CONFIRMED' },
  });
}

async function handlePlanAchieved(contractId: string, userId: string) {
  await supabase.from('contract_payout_streams').update({
    status: 'UNLOCKED', unlocked_at: new Date().toISOString()
  }).eq('contract_id', contractId).eq('stream_key', 'plan_bonus');

  const { data: stream } = await supabase.from('contract_payout_streams')
    .select('amount').eq('contract_id', contractId).eq('stream_key', 'plan_bonus').single();

  await supabase.from('escrow_events').insert({
    contract_id: contractId, event_type: 'PARTIAL_RELEASE', amount: stream?.amount || 0,
    actor_role: 'ORACLE', actor_id: userId, metadata: { event: 'PLAN_ACHIEVED' },
  });
}

// Годовой бонус не является payout stream и никогда не попадает в escrow.
async function handleAnnualBonusConfirmed(contractId: string, userId: string) {
  console.info('Annual bonus confirmed for visual/audit purposes only', { contractId, userId });
}

export async function getContractFullData(contractId: string) {
  try {
    const { data: contract, error: contractError } = await supabase.from('contracts').select('*').eq('id', contractId).single();
    if (contractError) throw contractError;

    const { data: streams, error: streamsError } = await supabase.from('contract_payout_streams')
      .select('*').eq('contract_id', contractId).order('created_at', { ascending: true });
    if (streamsError) throw streamsError;

    const { data: escrowEvents, error: escrowError } = await supabase.from('escrow_events')
      .select('*').eq('contract_id', contractId).order('created_at', { ascending: false });
    if (escrowError) throw escrowError;

    const { data: oracleEvents, error: oracleError } = await supabase.from('oracle_events')
      .select('*').eq('contract_id', contractId).order('created_at', { ascending: false });
    if (oracleError) throw oracleError;

    const { data: disputes, error: disputesError } = await supabase.from('disputes')
      .select('*').eq('contract_id', contractId).order('created_at', { ascending: false });
    if (disputesError) throw disputesError;

    let agent = null;
    if (contract.agent_id) {
      const { data: agentData } = await supabase.from('agents').select('*').eq('id', contract.agent_id).single();
      agent = agentData;
    }

    const escrowStreams = (streams || []).filter(stream => stream.stream_key !== 'annual');
    const totalEscrow = escrowStreams.reduce((sum, stream) => sum + Number(stream.amount || 0), 0);
    const totalUnlocked = escrowStreams
      .filter(stream => ['UNLOCKED', 'PAYABLE', 'PAID'].includes(stream.status))
      .reduce((sum, stream) => sum + Number(stream.amount || 0), 0);
    const totalLocked = escrowStreams.filter(stream => stream.status === 'LOCKED')
      .reduce((sum, stream) => sum + Number(stream.amount || 0), 0);
    const plannedRevenue = Number(contract.planned_revenue || contract.revenue || 0);
    const platformFee = Math.round(totalEscrow * PLATFORM_FEE_PERCENT / 100);
    const companyProfit = plannedRevenue - totalEscrow - platformFee;

    return {
      contract,
      streams: streams || [],
      escrowEvents: escrowEvents || [],
      oracleEvents: oracleEvents || [],
      disputes: disputes || [],
      agent,
      financials: { totalEscrow, totalUnlocked, totalLocked, platformFee, companyProfit, plannedRevenue },
    };
  } catch (err) {
    console.error('Ошибка получения данных контракта:', err);
    return null;
  }
}

export async function openDispute(contractId: string, openedBy: string, reason: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('disputes').insert({ contract_id: contractId, opened_by: openedBy, reason, status: 'OPEN' });
    if (error) throw error;

    await supabase.from('contracts').update({ status: 'DISPUTED', oracle_status: 'DISPUTED' }).eq('id', contractId);
    await supabase.from('escrow_events').insert({
      contract_id: contractId, event_type: 'DISPUTE_OPENED', actor_role: 'CEO', actor_id: openedBy, metadata: { reason },
    });
    await supabase.from('oracle_events').insert({
      contract_id: contractId, event_type: 'DISPUTE_OPENED', source: 'MANUAL_DEMO', payload: { reason }, created_by: openedBy,
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

export async function releasePayment(contractId: string, streamId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: stream, error: streamError } = await supabase.from('contract_payout_streams')
      .select('*').eq('id', streamId).single();
    if (streamError) throw streamError;

    if (!stream || stream.status !== 'UNLOCKED' || stream.stream_key === 'annual') {
      return { success: false, error: 'Поток не разблокирован или не является выплатой из эскроу' };
    }

    const { error: updateError } = await supabase.from('contract_payout_streams')
      .update({ status: 'PAID', paid_at: new Date().toISOString() }).eq('id', streamId);
    if (updateError) throw updateError;

    const { error: eventError } = await supabase.from('escrow_events').insert({
      contract_id: contractId,
      event_type: 'PAYOUT_TO_AGENT',
      amount: stream.amount,
      actor_role: 'ORACLE',
      actor_id: userId,
      metadata: { stream_key: stream.stream_key, stream_id: streamId },
    });
    if (eventError) throw eventError;

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
