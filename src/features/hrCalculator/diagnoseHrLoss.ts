import type { HrCalculatorResult } from './hrCalculator';

export type HrLossDriver = 'turnover' | 'productivity';

export type HrLossDiagnosis = {
  primaryDriver: HrLossDriver;
  secondaryDriver: HrLossDriver;
  primaryShare: number;
  secondaryShare: number;
  priority: 'high' | 'medium' | 'low';
  headline: string;
};

export function diagnoseHrLoss(result: HrCalculatorResult): HrLossDiagnosis {
  const turnoverLoss = result.recruitmentCost;
  const productivityLoss = result.adaptationSalary + result.lostRevenue;
  const total = turnoverLoss + productivityLoss;

  if (total <= 0) {
    return {
      primaryDriver: 'productivity',
      secondaryDriver: 'turnover',
      primaryShare: 0,
      secondaryShare: 0,
      priority: 'low',
      headline: 'Недостаточно данных для финансового диагноза',
    };
  }

  const productivityIsPrimary = productivityLoss >= turnoverLoss;
  const primaryDriver = productivityIsPrimary ? 'productivity' : 'turnover';
  const secondaryDriver = productivityIsPrimary ? 'turnover' : 'productivity';
  const primaryValue = productivityIsPrimary ? productivityLoss : turnoverLoss;
  const secondaryValue = productivityIsPrimary ? turnoverLoss : productivityLoss;
  const primaryShare = (primaryValue / total) * 100;
  const secondaryShare = (secondaryValue / total) * 100;

  return {
    primaryDriver,
    secondaryDriver,
    primaryShare,
    secondaryShare,
    priority: primaryShare >= 60 ? 'high' : primaryShare >= 40 ? 'medium' : 'low',
    headline: primaryDriver === 'productivity'
      ? 'Основной финансовый разрыв возникает до выхода сотрудника на результат'
      : 'Основной финансовый разрыв создаёт текучесть и стоимость замещения',
  };
}
