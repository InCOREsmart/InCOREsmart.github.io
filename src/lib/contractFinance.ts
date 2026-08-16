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
  const totalEscrow = bonusProperty + bonusCasco + bonusDms + bonusRenewal + bonusCrossSell + bonusPlan + bonusRetention;
  const agentPayout = totalEscrow;
  const platformFee = money(agentPayout * PLATFORM_FEE_PERCENT / 100);
  const companyProfit = totalContractRevenue - agentPayout - platformFee;
  const roi = totalContractRevenue > 0 ? Math.round(companyProfit / totalContractRevenue * 100) : 0;
  return { property, casco, dms, renewal, crossSell, totalContractRevenue, bonusProperty, bonusCasco, bonusDms, bonusRenewal, bonusCrossSell, bonusPlan, bonusRetention, bonusAnnual, totalEscrow, platformFee, agentPayout, companyProfit, roi };
}

export function calculateContractFinancialsFromPayoutStreams(
  revenue: number,
  streams: any[] = [],
): Pick<ContractFinancials, 'totalContractRevenue' | 'totalEscrow' | 'platformFee' | 'agentPayout' | 'companyProfit' | 'roi'> {
  const totalContractRevenue = money(revenue);
  const currentStreams = streams.filter(stream => stream?.stream_key !== 'annual');
  const agentPayout = currentStreams.reduce((sum, stream) => sum + money(stream?.amount), 0);
  const totalEscrow = agentPayout;
  const platformFee = money(agentPayout * PLATFORM_FEE_PERCENT / 100);
  const companyProfit = totalContractRevenue - agentPayout - platformFee;
  const roi = totalContractRevenue > 0 ? Math.round(companyProfit / totalContractRevenue * 100) : 0;
  return { totalContractRevenue, totalEscrow, platformFee, agentPayout, companyProfit, roi };
}

/**
 * Realized sales only.
 * For demo contracts, legacy actual_* fields are the generated demo facts.
 * For real contracts, persisted contract value is NEVER treated as a sale.
 */
export function getActualContractRevenue(contract: any): number {
  if (!contract) return 0;

  const explicit = [
    contract?.actual_contract_revenue,
    contract?.actual_revenue,
    contract?.client_contract_amount,
    contract?.realized_sales_revenue,
    contract?.actual_sales_revenue,
  ].map(Number).find(value => Number.isFinite(value) && value >= 0);
  if (explicit !== undefined) return money(explicit);

  const deals = Array.isArray(contract?.bitrix_deals) ? contract.bitrix_deals : [];
  const dealTotal = deals.reduce((sum: number, deal: any) => sum + money(deal?.amount), 0);
  if (dealTotal > 0) return dealTotal;

  if (contract?.is_demo === true) {
    const actualFields = [
      contract?.actual_property_revenue,
      contract?.actual_casco_revenue,
      contract?.actual_dms_revenue,
      contract?.actual_renewal_revenue,
      contract?.actual_cross_sell_revenue,
    ].map(Number);
    if (actualFields.some(value => Number.isFinite(value) && value > 0)) {
      return money(actualFields.reduce((sum, value) => sum + (Number.isFinite(value) && value > 0 ? value : 0), 0));
    }
  }

  // Real contract without a confirmed sale: zero realized revenue.
  return 0;
}

export function getSalesPlanAchievement(contract: any): number {
  if (!contract) return 0;
  const plan = money(contract?.planned_revenue ?? contract?.sales_plan_revenue ?? contract?.revenue);
  if (plan <= 0) return 0;
  return Math.round(Math.min(1, getActualContractRevenue(contract) / plan) * 100);
}

export function getActualContractRevenueBreakdown(contract: any): ContractRevenueBreakdown {
  const explicit = {
    property: contract?.actual_property_revenue,
    casco: contract?.actual_casco_revenue,
    dms: contract?.actual_dms_revenue,
    renewal: contract?.actual_renewal_revenue,
    crossSell: contract?.actual_cross_sell_revenue,
  };

  if (contract?.is_demo === true) {
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
  }

  const deals = Array.isArray(contract?.bitrix_deals) ? contract.bitrix_deals : [];
  const breakdown: ContractRevenueBreakdown = { property: 0, casco: 0, dms: 0, renewal: 0, crossSell: 0 };
  let categorizedDeals = 0;
  for (const deal of deals) {
    const rawCategory = String(deal?.category ?? deal?.direction ?? deal?.product ?? deal?.type ?? deal?.stream_key ?? deal?.deal_type ?? '').toLowerCase();
    const amount = money(deal?.amount);
    if (!amount) continue;
    if (rawCategory.includes('property') || rawCategory.includes('имуще') || rawCategory.includes('риск')) { breakdown.property += amount; categorizedDeals++; }
    else if (rawCategory.includes('casco') || rawCategory.includes('каско') || rawCategory.includes('автопарк')) { breakdown.casco += amount; categorizedDeals++; }
    else if (rawCategory.includes('dms') || rawCategory.includes('дмс') || rawCategory.includes('медицин')) { breakdown.dms += amount; categorizedDeals++; }
    else if (rawCategory.includes('renewal') || rawCategory.includes('продлен')) { breakdown.renewal += amount; categorizedDeals++; }
    else if (rawCategory.includes('cross') || rawCategory.includes('кросс')) { breakdown.crossSell += amount; categorizedDeals++; }
  }
  if (categorizedDeals > 0) return breakdown;
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

export function getContractAccountingSnapshot(contract: any): ContractAccountingSnapshot {
  const revenue = money(contract?.revenue ?? contract?.planned_revenue);
  const streams = Array.isArray(contract?.payout_streams) ? contract.payout_streams : [];
  const persistedEscrow = money(contract?.escrow_amount);
  const persistedPaid = money(contract?.total_paid);
  const persistedLocked = money(contract?.total_locked);
  const streamPaid = streams.filter((stream: any) => stream?.status === 'PAID' && stream?.stream_key !== 'annual').reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
  const streamLocked = streams.filter((stream: any) => stream?.status === 'LOCKED' && stream?.stream_key !== 'annual').reduce((sum: number, stream: any) => sum + money(stream?.amount), 0);
  const payout = persistedEscrow || (persistedPaid + persistedLocked) || (streamPaid + streamLocked);
  const paid = contract?.status === 'COMPLETED' ? payout : persistedPaid || streamPaid;
  const locked = contract?.status === 'COMPLETED' ? 0 : persistedLocked || streamLocked || Math.max(0, payout - paid);
  const commission = money(payout * PLATFORM_FEE_PERCENT / 100);
  const companyProfit = money(revenue - payout - commission);
  return { revenue, escrow: persistedEscrow, paid, locked, payout, commission, companyProfit, annualBonus: ANNUAL_BONUS };
}
