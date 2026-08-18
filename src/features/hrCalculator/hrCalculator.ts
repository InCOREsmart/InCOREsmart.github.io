export type HrCalculatorInput = {
  averageSalary: number;
  departuresPerYear: number;
  rampMonths: number;
  revenuePerEmployee: number;
  hrCount: number;
  hrSalary: number;
  hiresPerMonthPerHr: number;
};

export type HrCalculatorResult = {
  hiresPerHrYear: number;
  hrAnnualCapacity: number;
  costPerHire: number;
  recruitmentCost: number;
  adaptationSalary: number;
  lostRevenue: number;
  totalLoss: number;
  annualSalaryBase: number;
  lossAsPercentOfSalary: number;
  lossPerDeparture: number;
  monthlyRevenueAtRisk: number;
  productivityLossMonths: number;
  productivityLossSalary: number;
  replacementRevenueGap: number;
  hrCostPerYear: number;
  turnoverCostPerEmployee: number;
  savingsAt10PercentLowerTurnover: number;
  savingsAt25PercentLowerTurnover: number;
  savingsAt40PercentLowerTurnover: number;
};

export type HrLossDriver = 'turnover' | 'productivity' | 'recruitment';

export type HrDiagnostic = {
  primaryDriver: HrLossDriver;
  primaryShare: number;
  secondaryDriver: HrLossDriver;
  secondaryShare: number;
  headline: 'turnover' | 'productivity' | 'recruitment';
  recommendation: 'turnover' | 'productivity' | 'recruitment';
};

const safe = (value: number) => Number.isFinite(value) && value > 0 ? value : 0;

export function calculateHrLoss(input: HrCalculatorInput): HrCalculatorResult {
  const salary = safe(input.averageSalary);
  const departures = safe(input.departuresPerYear);
  const ramp = safe(input.rampMonths);
  const revenue = safe(input.revenuePerEmployee);
  const hrSalary = safe(input.hrSalary);
  const hiresPerMonthPerHr = safe(input.hiresPerMonthPerHr);
  const hrCount = safe(input.hrCount);

  const hiresPerHrYear = hiresPerMonthPerHr * 12;
  const hrAnnualCapacity = hrCount * hiresPerHrYear;
  const hrCostPerYear = hrCount * hrSalary * 12;
  const costPerHire = hiresPerHrYear > 0 ? (hrSalary * 12) / hiresPerHrYear : 0;
  const recruitmentCost = departures * costPerHire;
  const adaptationSalary = departures * salary * ramp;
  const lostRevenue = departures * revenue * ramp / 2;
  const totalLoss = recruitmentCost + adaptationSalary + lostRevenue;
  const annualSalaryBase = salary * departures;
  const productivityLossMonths = departures * ramp;
  const productivityLossSalary = adaptationSalary;
  const replacementRevenueGap = departures * revenue * ramp;

  return {
    hiresPerHrYear, hrAnnualCapacity, costPerHire, recruitmentCost, adaptationSalary,
    lostRevenue, totalLoss, annualSalaryBase,
    lossAsPercentOfSalary: annualSalaryBase > 0 ? (totalLoss / annualSalaryBase) * 100 : 0,
    lossPerDeparture: departures > 0 ? totalLoss / departures : 0,
    monthlyRevenueAtRisk: lostRevenue / 12,
    productivityLossMonths, productivityLossSalary, replacementRevenueGap, hrCostPerYear,
    turnoverCostPerEmployee: departures > 0 ? totalLoss / departures : 0,
    savingsAt10PercentLowerTurnover: totalLoss * 0.10,
    savingsAt25PercentLowerTurnover: totalLoss * 0.25,
    savingsAt40PercentLowerTurnover: totalLoss * 0.40,
  };
}

export function calculateHrScenario(input: HrCalculatorInput, turnoverReductionPercent: number, rampReductionPercent: number) {
  const turnover = Math.min(100, Math.max(0, turnoverReductionPercent));
  const rampReduction = Math.min(100, Math.max(0, rampReductionPercent));
  const scenarioInput: HrCalculatorInput = {
    ...input,
    departuresPerYear: input.departuresPerYear * (1 - turnover / 100),
    rampMonths: input.rampMonths * (1 - rampReduction / 100),
  };
  const baseline = calculateHrLoss(input);
  const scenario = calculateHrLoss(scenarioInput);
  return {
    baseline,
    scenario,
    saving: Math.max(0, baseline.totalLoss - scenario.totalLoss),
    savingPercent: baseline.totalLoss > 0 ? Math.max(0, ((baseline.totalLoss - scenario.totalLoss) / baseline.totalLoss) * 100) : 0,
    scenarioInput,
  };
}

export function diagnoseHrLoss(result: HrCalculatorResult): HrDiagnostic {
  const drivers: Array<{ key: HrLossDriver; amount: number }> = [
    { key: 'turnover', amount: result.recruitmentCost },
    { key: 'productivity', amount: result.adaptationSalary + result.lostRevenue },
    { key: 'recruitment', amount: result.recruitmentCost },
  ];
  const total = Math.max(result.totalLoss, 1);
  const ranked = [...drivers].sort((a, b) => b.amount - a.amount);
  const primary = ranked[0];
  const secondary = ranked[1];
  const productivityShare = ((result.adaptationSalary + result.lostRevenue) / total) * 100;
  const recruitmentShare = (result.recruitmentCost / total) * 100;

  if (productivityShare >= recruitmentShare) {
    return {
      primaryDriver: 'productivity',
      primaryShare: productivityShare,
      secondaryDriver: 'recruitment',
      secondaryShare: recruitmentShare,
      headline: 'productivity',
      recommendation: 'productivity',
    };
  }

  return {
    primaryDriver: primary.key,
    primaryShare: (primary.amount / total) * 100,
    secondaryDriver: secondary.key,
    secondaryShare: (secondary.amount / total) * 100,
    headline: primary.key === 'turnover' ? 'turnover' : 'recruitment',
    recommendation: primary.key === 'turnover' ? 'turnover' : 'recruitment',
  };
}
