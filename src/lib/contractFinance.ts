export const CONTRACT_BONUS_RATES = { property: 0.20, casco: 0.15, dms: 0.10, renewal: 0.15, crossSell: 0.10, planBonus: 0.10 } as const;
export const RETENTION_BONUS = 200;
export const ANNUAL_BONUS = 7000;
export const PLATFORM_FEE_PERCENT = 12;

export interface ContractRevenueBreakdown { property: number; casco: number; dms: number; renewal: number; crossSell: number; }
export interface ContractFinancials extends ContractRevenueBreakdown { totalContractRevenue: number; bonusProperty: number; bonusCasco: number; bonusDms: number; bonusRenewal: number; bonusCrossSell: number; bonusPlan: number; bonusRetention: number; bonusAnnual: number; totalEscrow: number; platformFee: number; agentPayout: number; companyProfit: number; roi: number; }

export function money(value: unknown): number { const number = Number(value); return Number.isFinite(number) ? Math.round(number) : 0; }

export function calculateContractFinancials(revenue: ContractRevenueBreakdown, planBonusPercent = 10, retentionBonus = RETENTION_BONUS, annualBonus = ANNUAL_BONUS): ContractFinancials {
  const property = money(revenue.property), casco = money(revenue.casco), dms = money(revenue.dms), renewal = money(revenue.renewal), crossSell = money(revenue.crossSell);
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
  const platformFee = money(totalEscrow * PLATFORM_FEE_PERCENT / 100);
  const agentPayout = totalEscrow;
  const companyProfit = totalContractRevenue - agentPayout;
  const roi = totalContractRevenue > 0 ? Math.round(companyProfit / totalContractRevenue * 100) : 0;
  return { property, casco, dms, renewal, crossSell, totalContractRevenue, bonusProperty, bonusCasco, bonusDms, bonusRenewal, bonusCrossSell, bonusPlan, bonusRetention, bonusAnnual, totalEscrow, platformFee, agentPayout, companyProfit, roi };
}

export function getActualContractRevenue(contract: any): number {
  const explicit = [contract?.actual_contract_revenue, contract?.actual_revenue, contract?.client_contract_amount].map(Number).find(value => Number.isFinite(value) && value > 0);
  if (explicit) return money(explicit);
  const deals = Array.isArray(contract?.bitrix_deals) ? contract.bitrix_deals : [];
  const dealTotal = deals.reduce((sum: number, deal: any) => sum + money(deal?.amount), 0);
  if (dealTotal > 0) return dealTotal;
  return money(contract?.revenue);
}

export function getStoredPayoutAmounts(streams: any[] = []) {
  const byKey = new Map(streams.map(stream => [stream.stream_key, money(stream.amount)]));
  return { property: byKey.get('new_sales_property') || 0, casco: byKey.get('new_sales_casco') || 0, dms: byKey.get('new_sales_dms') || 0, renewal: byKey.get('renewal') || 0, crossSell: byKey.get('cross_sell') || 0, planBonus: byKey.get('plan_bonus') || 0, retention: byKey.get('retention') || 0, annual: byKey.get('annual') || ANNUAL_BONUS };
}
