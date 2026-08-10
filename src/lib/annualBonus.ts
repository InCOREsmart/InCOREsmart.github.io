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
    contract.annual_sales_plan_monthly ??
    contract.target_revenue ??
    contract.kpi_revenue ??
    contract.planned_revenue ??
    0,
  );
}

function isDemoContract(contract: any): boolean {
  return typeof contract?.id === 'string' && contract.id.startsWith('contract-demo-');
}

function getActualRevenue(contract: any): number {
  const planned = getPlannedRevenue(contract);

  const explicitActual = Number(
    contract.actual_revenue ??
    contract.sales_amount ??
    0,
  );

  if (explicitActual > 0) return explicitActual;

  // Демо-сценарий моделирует одинаковое выполнение плана всеми агентами.
  // Не используем contract.revenue как фактическую годовую продажу, иначе
  // каждый существующий месячный контракт автоматически даст 100% годового бонуса.
  if (isDemoContract(contract)) return planned;

  if (contract.target_clients && contract.actual_clients != null && planned > 0) {
    return planned * clamp(Number(contract.actual_clients) / Number(contract.target_clients));
  }

  return 0;
}

export function calculateAnnualBonusProgress(
  contracts: Array<DemoContract | any>,
  year = new Date().getFullYear(),
): AnnualBonusProgress {
  const yearContracts = contracts.filter(contract => {
    const dateValue = contract.start_date || contract.start_at || contract.created_at;
    if (!dateValue) return false;
    const date = new Date(dateValue);
    return !Number.isNaN(date.getTime()) && date.getFullYear() === year;
  });

  if (!yearContracts.length) {
    return {
      year,
      maxBonus: ANNUAL_BONUS_MAX,
      accruedBonus: 0,
      progressPercent: 0,
      planAchievementPercent: 0,
      monthsCounted: 0,
    };
  }

  const explicitAnnualTarget = yearContracts.reduce((sum, contract) => {
    const annualTarget = Number(contract.annual_sales_plan || contract.year_sales_plan || 0);
    return sum + (annualTarget > 0 ? annualTarget : 0);
  }, 0);

  const monthlyPlans = yearContracts
    .map(getPlannedRevenue)
    .filter(value => value > 0);

  // Для ежемесячных контрактов годовой план всегда равен 12 месячным планам.
  // Поэтому наличие только январь-август в данных не превращает бонус в 100%.
  const monthlyPlan = monthlyPlans.length
    ? monthlyPlans.reduce((sum, value) => sum + value, 0) / monthlyPlans.length
    : 0;
  const annualTarget = explicitAnnualTarget > 0
    ? explicitAnnualTarget
    : monthlyPlan * 12;

  const actualAnnualSales = yearContracts.reduce(
    (sum, contract) => sum + getActualRevenue(contract),
    0,
  );

  const planAchievement = annualTarget > 0
    ? clamp(actualAnnualSales / annualTarget)
    : 0;

  const months = new Set(
    yearContracts.map(contract => {
      const dateValue = contract.start_date || contract.start_at || contract.created_at;
      const date = new Date(dateValue);
      return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    }),
  );

  const progressPercent = Math.round(planAchievement * 100);

  return {
    year,
    maxBonus: ANNUAL_BONUS_MAX,
    accruedBonus: Math.round(ANNUAL_BONUS_MAX * planAchievement),
    progressPercent,
    planAchievementPercent: progressPercent,
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
