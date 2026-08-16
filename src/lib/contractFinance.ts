export const CONTRACT_BONUS_RATES = {
  property: 0.20,
  casco: 0.15,
  dms: 0.10,
  renewal: 0.15,
  crossSell: 0.10,
} as const;

export const RETENTION_BONUS = 200;
export const ANNUAL_BONUS = 7000;
export const PLATFORM_FEE_PERCENT = 12;

export interface ContractRevenueBreakdown {
  property: number;
  casco: number;
  dms: number;
  renewal: number;
  crossSell: number;
}

export interface ContractFinancials extends ContractRevenueBreakdown {
  totalContractRevenue: number;
  bonusProperty: number;
  bonusCasco: number;
  bonusDms: number;
  bonusRenewal: number;
  bonusCrossSell: number;
  bonusPlan: number;
  bonusRetention: number;
  bonusAnnual: number;
  totalEscrow: number;
  platformFee: number;
  agentPayout: number;
  companyProfit: number;
  roi: number;
}

export interface ContractAccountingSnapshot {
  revenue: number;
  escrow: number;
  paid: number;
  locked: number;
  payout: number;
  commission: number;
  companyProfit: number;
  annualBonus: number;
}

export function money(value: unknown): number {
  const number = Number(value);
  return Number.isFinite(number) ? Math.round(number) : 0;
}

export function calculateContractFinancials(
  revenue: ContractRevenueBreakdown,
  planBonusPercent = 10,
  retentionBonus = RETENTION_BONUS,
  annualBonus = ANNUAL_BONUS,
): ContractFinancials {
  const property = money(revenue.property);
  const casco = money(revenue.casco);
  const dms = money(revenue.dms);
  const renewal = money(revenue.renewal);
  const crossSell = money(revenue.crossSell);

  const totalContractRevenue = property + casco + dms + renewal + crossSell;
  const bonusProperty = money(property * CONTRACT_BONUS_RATES.property);
  const bonusCasco = money(casco * CONTRACT_BONUS_RATES.casco);
  const bonusDms = money(dms * CONTRACT_BONUS_RATES.dms);
  const bonusRenewal = money(renewal * CONTRACT_BONUS_RATES.renewal);
  const bonusCrossSell = money(crossSell * CONTRACT_BONUS_RATES.crossSell);
  const bonusPlan = money(totalContractRevenue * (money(planBonusPercent) / 100));
  const bonusRetention = money(retentionBonus);
  const bonusAnnual = money(annualBonus);

  // Annual bonus is a year-end accrual and is deliberately NOT part of escrow.
  const totalEscrow =
    bonusProperty +
    bonusCasco +
    bonusDms +
    bonusRenewal +
    bonusCrossSell +
    bonusPlan +
    bonusRetention;

  const platformFee = money(totalEscrow * PLATFORM_FEE_PERCENT / 100);
  const agentPayout = totalEscrow;

  // Company result is revenue less the agent payout and platform commission.
  // The annual bonus remains outside escrow and therefore does not reduce
  // the current company result here.
  const companyProfit = totalContractRevenue - agentPayout - platformFee;
  const roi = totalContractRevenue > 0
    ? Math.round(companyProfit / totalContractRevenue * 100)
    : 0;

  return {
    property,
    casco,
    dms,
    renewal,
    crossSell,
    totalContractRevenue,
    bonusProperty,
    bonusCasco,
    bonusDms,
    bonusRenewal,
    bonusCrossSell,
    bonusPlan,
    bonusRetention,
    bonusAnnual,
    totalEscrow,
    platformFee,
    agentPayout,
    companyProfit,
    roi,
  };
}

export function getActualContractRevenue(contract: any): number {
  const explicit = [
    contract?.actual_contract_revenue,
    contract?.actual_revenue,
    contract?.client_contract_amount,
  ]
    .map(Number)
    .find(value => Number.isFinite(value) && value > 0);

  if (explicit) return money(explicit);

  const deals = Array.isArray(contract?.bitrix_deals) ? contract.bitrix_deals : [];
  const dealTotal = deals.reduce(
    (sum: number, deal: any) => sum + money(deal?.amount),
    0,
  );

  if (dealTotal > 0) return dealTotal;
  return money(contract?.revenue);
}

export function getActualContractRevenueBreakdown(contract: any): ContractRevenueBreakdown {
  const explicit = {
    property: contract?.actual_property_revenue,
    casco: contract?.actual_casco_revenue,
    dms: contract?.actual_dms_revenue,
    renewal: contract?.actual_renewal_revenue,
    crossSell: contract?.actual_cross_sell_revenue,
  };

  const explicitValues = Object.values(explicit).map(Number);
  if (explicitValues.some(value => Number.isFinite(value) && value > 0)) {
    return {
      property: money(explicit.property),
      casco: money(explicit.casco),
      dms: money(explicit.dms),
      renewal: money(explicit.renewal),
      crossSell: money(explicit.crossSell),
    };
  }

  const deals = Array.isArray(contract?.bitrix_deals) ? contract.bitrix_deals : [];
  const breakdown: ContractRevenueBreakdown = {
    property: 0,
    casco: 0,
    dms: 0,
    renewal: 0,
    crossSell: 0,
  };

  let categorizedDeals = 0;
  for (const deal of deals) {
    const rawCategory = String(
      deal?.category ??
      deal?.direction ??
      deal?.product ??
      deal?.type ??
      deal?.stream_key ??
      deal?.deal_type ??
      '',
    ).toLowerCase();
    const amount = money(deal?.amount);
    if (!amount) continue;

    if (rawCategory.includes('property') || rawCategory.includes('имуще') || rawCategory.includes('риск')) {
      breakdown.property += amount;
      categorizedDeals++;
    } else if (rawCategory.includes('casco') || rawCategory.includes('каско') || rawCategory.includes('автопарк')) {
      breakdown.casco += amount;
      categorizedDeals++;
    } else if (rawCategory.includes('dms') || rawCategory.includes('дмс') || rawCategory.includes('медицин')) {
      breakdown.dms += amount;
      categorizedDeals++;
    } else if (rawCategory.includes('renewal') || rawCategory.includes('продлен')) {
      breakdown.renewal += amount;
      categorizedDeals++;
    } else if (rawCategory.includes('cross') || rawCategory.includes('кросс')) {
      breakdown.crossSell += amount;
      categorizedDeals++;
    }
  }

  if (categorizedDeals > 0) return breakdown;

  // Demo contracts created from the same CreateContractModal use five
  // independent revenue directions with the same $375 average check.
  // When the demo CRM deals contain only the total client amount and no
  // category, reproduce that creation-form model instead of treating the
  // whole revenue as one property stream. This keeps escrow and company
  // result tied to the same financial model as contract creation.
  const actualRevenue = getActualContractRevenue(contract);
  if (actualRevenue > 0) {
    const categories: (keyof ContractRevenueBreakdown)[] = [
      'property',
      'casco',
      'dms',
      'renewal',
      'crossSell',
    ];
    const targetClients = money(contract?.target_clients || contract?.target_clients_new) || 0;
    const actualClients = money(contract?.actual_clients) || 0;

    if (targetClients > 0 && actualClients > 0) {
      const targetRevenue = 375 * targetClients;
      const scale = targetRevenue > 0 ? actualRevenue / (targetRevenue * categories.length) : 0;
      const perCategory = money(375 * actualClients * scale);
      const values = categories.map(() => perCategory);
      const remainder = actualRevenue - values.reduce((sum, value) => sum + value, 0);
      values[0] += remainder;
      return {
        property: values[0],
        casco: values[1],
        dms: values[2],
        renewal: values[3],
        crossSell: values[4],
      };
    }
  }

  return { property: 0, casco: 0, dms: 0, renewal: 0, crossSell: 0 };
}

export function getStoredPayoutAmounts(streams: any[] = []) {
  const byKey = new Map(streams.map(stream => [stream.stream_key, money(stream.amount)]));
  return {
    property: byKey.get('new_sales_property') || 0,
    casco: byKey.get('new_sales_casco') || 0,
    dms: byKey.get('new_sales_dms') || 0,
    renewal: byKey.get('renewal') || 0,
    crossSell: byKey.get('cross_sell') || 0,
    planBonus: byKey.get('plan_bonus') || 0,
    retention: byKey.get('retention') || 0,
    annual: byKey.get('annual') || ANNUAL_BONUS,
  };
}

/**
 * Single source of truth for CEO accounting exports.
 * Uses actual contract revenue and the financial core whenever a revenue
 * breakdown is available. Existing persisted escrow/payout values are used
 * as the source for contracts that predate the breakdown fields.
 */
export function getContractAccountingSnapshot(contract: any): ContractAccountingSnapshot {
  const revenue = getActualContractRevenue(contract);
  const breakdown = getActualContractRevenueBreakdown(contract);
  const breakdownTotal = Object.values(breakdown).reduce((sum, value) => sum + value, 0);
  const streams = Array.isArray(contract?.payout_streams) ? contract.payout_streams : [];
  const stored = getStoredPayoutAmounts(streams);

  if (breakdownTotal > 0) {
    const financials = calculateContractFinancials(breakdown);
    const isCompleted = contract?.status === 'COMPLETED';
    const paidFromStreams = streams
      .filter((stream: any) => stream?.status === 'PAID' && stream?.stream_key !== 'annual')
      .reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);

    const paid = isCompleted
      ? financials.totalEscrow
      : money(contract?.total_paid) || paidFromStreams;
    const locked = isCompleted
      ? 0
      : money(contract?.total_locked) || Math.max(0, financials.totalEscrow - paid);

    return {
      revenue,
      escrow: financials.totalEscrow,
      paid,
      locked,
      payout: paid,
      commission: financials.platformFee,
      companyProfit: financials.companyProfit,
      annualBonus: financials.bonusAnnual,
    };
  }

  const persistedEscrow = money(contract?.escrow_amount);
  const persistedPaid = money(contract?.total_paid);
  const persistedLocked = money(contract?.total_locked);
  const streamPaid = streams
    .filter((stream: any) => stream?.status === 'PAID' && stream?.stream_key !== 'annual')
    .reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
  const streamLocked = streams
    .filter((stream: any) => stream?.status === 'LOCKED' && stream?.stream_key !== 'annual')
    .reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
  const paid = contract?.status === 'COMPLETED'
    ? persistedEscrow
    : persistedPaid || streamPaid;
  const locked = contract?.status === 'COMPLETED'
    ? 0
    : persistedLocked || streamLocked || Math.max(0, persistedEscrow - paid);
  const payout = paid;
  const commission = money(persistedEscrow * PLATFORM_FEE_PERCENT / 100);
  const companyProfit = money(revenue - persistedEscrow - commission);

  return {
    revenue,
    escrow: persistedEscrow,
    paid,
    locked,
    payout,
    commission,
    companyProfit,
    annualBonus: stored.annual,
  };
}
