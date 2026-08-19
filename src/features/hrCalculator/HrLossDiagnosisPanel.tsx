import { AlertTriangle, ArrowDownRight, TrendingUp } from 'lucide-react';
import type { TFunction } from 'i18next';
import type { HrCalculatorResult } from './hrCalculator';
import { diagnoseHrLoss } from './diagnoseHrLoss';

type Props = { result: HrCalculatorResult; t: TFunction; money: (value: number) => string };

export function HrLossDiagnosisPanel({ result, t, money }: Props) {
  const diagnosis = diagnoseHrLoss(result);
  const primaryValue = diagnosis.primaryDriver === 'productivity' ? result.adaptationSalary + result.lostRevenue : result.recruitmentCost;
  const secondaryValue = diagnosis.secondaryDriver === 'productivity' ? result.adaptationSalary + result.lostRevenue : result.recruitmentCost;
  const primaryLabel = t(`hrCalculator.diagnosis.drivers.${diagnosis.primaryDriver}`);
  const secondaryLabel = t(`hrCalculator.diagnosis.drivers.${diagnosis.secondaryDriver}`);

  return (
    <section className="rounded-3xl border border-amber-200 bg-amber-50 p-6 shadow-sm sm:p-7">
      <div className="flex items-start gap-3"><div className="rounded-xl bg-white p-2 text-amber-700 shadow-sm"><AlertTriangle size={20} /></div><div className="min-w-0"><div className="text-xs font-bold uppercase tracking-wide text-amber-700">{t('hrCalculator.diagnosis.badge')}</div><h2 className="mt-1 text-xl font-black text-slate-900">{t('hrCalculator.diagnosis.title')}</h2><p className="mt-2 text-sm leading-6 text-slate-700">{t(`hrCalculator.diagnosis.headlines.${diagnosis.primaryDriver}`)}</p></div></div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-white p-4 shadow-sm"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-slate-900">{primaryLabel}</span><span className="text-lg font-black text-slate-900">{Math.round(diagnosis.primaryShare)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-amber-500" style={{ width: `${Math.min(100, diagnosis.primaryShare)}%` }} /></div><div className="mt-2 text-xs text-slate-500">{money(primaryValue)}</div></div>
        <div className="rounded-2xl bg-white/70 p-4"><div className="flex items-center justify-between gap-3"><span className="text-sm font-bold text-slate-700">{secondaryLabel}</span><span className="text-lg font-black text-slate-700">{Math.round(diagnosis.secondaryShare)}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-400" style={{ width: `${Math.min(100, diagnosis.secondaryShare)}%` }} /></div><div className="mt-2 text-xs text-slate-500">{money(secondaryValue)}</div></div>
      </div>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl border border-white bg-white/80 p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><ArrowDownRight size={15} /> {t('hrCalculator.diagnosis.priority')}</div><div className="mt-1 text-sm font-black text-slate-900">{t(`hrCalculator.diagnosis.priorityValues.${diagnosis.priority}`)}</div></div>
        <div className="rounded-2xl border border-white bg-white/80 p-4"><div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500"><TrendingUp size={15} /> {t('hrCalculator.diagnosis.recommendedLever')}</div><div className="mt-1 text-sm font-black text-slate-900">{t(`hrCalculator.diagnosis.levers.${diagnosis.primaryDriver}`)}</div></div>
      </div>
    </section>
  );
}
