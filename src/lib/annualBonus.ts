import { DemoAgent, DemoContract } from './demoData';

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

function contractAchievement(contract: any): number {
  if (contract.target_clients && contract.actual_clients != null) {
    return clamp(Number(contract.actual_clients) / Number(contract.target_clients));
  }

  if (contract.planned_revenue && contract.revenue != null) {
    return clamp(Number(contract.revenue) / Number(contract.planned_revenue));
  }

  if (contract.kpi_revenue && contract.revenue != null) {
    return clamp(Number(contract.revenue) / Number(contract.kpi_revenue));
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

  const monthly = new Map<string, number>();
  yearContracts.forEach(contract => {
    const dateValue = contract.start_date || contract.start_at || contract.created_at;
    const date = new Date(dateValue);
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    monthly.set(key, Math.max(monthly.get(key) || 0, contractAchievement(contract)));
  });

  const monthsCounted = monthly.size;
  const planAchievement = monthsCounted > 0
    ? Array.from(monthly.values()).reduce((sum, value) => sum + value, 0) / monthsCounted
    : 0;

  const accruedBonus = Math.round(ANNUAL_BONUS_MAX * Array.from(monthly.values()).reduce((sum, value) => sum + value, 0) / 12);
  const progressPercent = Math.round((accruedBonus / ANNUAL_BONUS_MAX) * 100);

  return {
    year,
    maxBonus: ANNUAL_BONUS_MAX,
    accruedBonus,
    progressPercent,
    planAchievementPercent: Math.round(planAchievement * 100),
    monthsCounted,
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
