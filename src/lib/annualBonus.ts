import type { DemoAgent, DemoContract } from './demoData';

export const ANNUAL_BONUS_MAX = 7000;

export interface AnnualBonusProgress {
  year: number;
  maxBonus: number;
  accruedBonus: number;
  progressPercent: number;
  planAchievementPercent: number;
  monthsCounted: number;
}

function clamp(value: number, min = 0, max = 1): number {
  return Math.min(Math.max(value, min), max);
}

function getPlannedRevenue(contract: any): number {
  return Number(
    contract.sales_plan ??
    contract.annual_sales_plan ??
    contract.target_revenue ??
    contract.kpi_revenue ??
    contract.planned_revenue ??
    0,
  );
}

function getActualRevenue(contract: any): number {
  const explicitActual = Number(
    contract.actual_revenue ??
    contract.sales_amount ??
    0,
  );

  if (explicitActual > 0) return explicitActual;

  // В демо revenue = плановая выручка. Для годового бонуса это нельзя
  // считать фактическими продажами, иначе каждый месяц автоматически даёт 100%.
  if (contract.target_clients && contract.actual_clients != null && Number(contract.revenue) > 0) {
    return Number(contract.revenue) * clamp(
      Number(contract.actual_clients) / Number(contract.target_clients),
    );
  }

  return Number(contract.revenue ?? 0);
}

function contractAchievement(contract: any): number {
  const plannedRevenue = getPlannedRevenue(contract);
  const actualRevenue = getActualRevenue(contract);

  if (plannedRevenue > 0) {
    return clamp(actualRevenue / plannedRevenue);
  }

  if (contract.target_clients && contract.actual_clients != null) {
    return clamp(Number(contract.actual_clients) / Number(contract.target_clients));
  }

  if (contract.client_payment_confirmed) return 1;
  return 0;
}

export function calculateAnnualBonusProgress(
  contracts: Array<DemoContract | any>,
  year = new Date().getFullYear(),
): AnnualBonusProgress {
  const yearContracts = contracts.filter(contract => {
    const dateValue = contract.start_date || contract.start_at || contract.created_at;
    if (!dateValue) return false;
    return new Date(dateValue).getFullYear() === year;
  });

  // Годовой бонус не является payout stream и не попадает в escrow.
  // Он накапливается по фактическому выполнению годового плана продаж.
  const plannedAnnualSales = yearContracts.reduce((sum, contract) => {
    return sum + getPlannedRevenue(contract);
  }, 0);

  const actualAnnualSales = yearContracts.reduce((sum, contract) => {
    return sum + getActualRevenue(contract);
  }, 0);

  const revenueBasedAchievement = plannedAnnualSales > 0
    ? clamp(actualAnnualSales / plannedAnnualSales)
    : null;

  const fallbackAchievements = yearContracts
    .filter(contract => getPlannedRevenue(contract) <= 0)
    .map(contractAchievement);

  const fallbackAchievement = fallbackAchievements.length
    ? fallbackAchievements.reduce((sum, value) => sum + value, 0) / fallbackAchievements.length
    : 0;

  const planAchievement = revenueBasedAchievement ?? fallbackAchievement;
  const accruedBonus = Math.round(ANNUAL_BONUS_MAX * planAchievement);
  const progressPercent = Math.round(planAchievement * 100);

  const months = new Set(
    yearContracts.map(contract => {
      const dateValue = contract.start_date || contract.start_at || contract.created_at;
      const date = new Date(dateValue);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }),
  );

  return {
    year,
    maxBonus: ANNUAL_BONUS_MAX,
    accruedBonus,
    progressPercent,
    planAchievementPercent: Math.round(planAchievement * 100),
    monthsCounted: months.size,
  };
}

export function getEscrowStreams(streams: any[] = []): any[] {
  return streams.filter(stream => stream.stream_key !== 'annual');
}

export function getEscrowAmount(contract: any, streams?: any[]): number {
  const source = streams || contract?.payout_streams || [];
  return getEscrowStreams(source).reduce((sum, stream) => sum + Number(stream.amount || 0), 0);
}

export function getPaidAmount(streams: any[] = []): number {
  return getEscrowStreams(streams)
    .filter(stream => stream.status === 'PAID')
    .reduce((sum, stream) => sum + Number(stream.amount || 0), 0);
}

export function getLockedAmount(streams: any[] = []): number {
  return getEscrowStreams(streams)
    .filter(stream => stream.status === 'LOCKED')
    .reduce((sum, stream) => sum + Number(stream.amount || 0), 0);
}

export function getAnnualBonusForAgent(agent: DemoAgent | any, year = new Date().getFullYear()): AnnualBonusProgress {
  return calculateAnnualBonusProgress(agent?.contracts || [], year);
}
