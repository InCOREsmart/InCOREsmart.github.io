import { useMemo, useState } from 'react';
import { ArrowRight, CheckCircle2, CircleDollarSign, RotateCcw, TrendingDown, Users } from 'lucide-react';
import { calculateHrLoss, HrCalculatorInput } from '../../features/hrCalculator/hrCalculator';

const initialInput: HrCalculatorInput = {
  averageSalary: 120000,
  departuresPerYear: 24,
  rampMonths: 2,
  revenuePerEmployee: 450000,
  hrCount: 2,
  hrSalary: 100000,
  hiresPerMonthPerHr: 5,
};

const money = (value: number) => `${Math.round(value).toLocaleString('ru-RU')} ₽`;
const number = (value: number) => Math.round(value).toLocaleString('ru-RU');
const percent = (value: number) => `${value.toFixed(1).replace('.', ',')}%`;

function InputField({ label, hint, value, onChange, min = 0, step = 1 }: {
  label: string;
  hint: string;
  value: number;
  onChange: (value: number) => void;
  min?: number;
  step?: number;
}) {
  return (
    <label className="block">
      <span className="block text-sm font-semibold text-slate-800">{label}</span>
      <span className="mt-1 block text-xs leading-5 text-slate-500">{hint}</span>
      <input
        type="number"
        min={min}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-base font-semibold text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-100"
      />
    </label>
  );
}

export function HrLossCalculatorPage() {
  const [input, setInput] = useState(initialInput);
  const [scenario, setScenario] = useState(25);
  const result = useMemo(() => calculateHrLoss(input), [input]);
  const scenarioDepartures = Math.max(0, input.departuresPerYear * (1 - scenario / 100));
  const scenarioResult = useMemo(
    () => calculateHrLoss({ ...input, departuresPerYear: scenarioDepartures }),
    [input, scenarioDepartures],
  );
  const scenarioSaving = Math.max(0, result.totalLoss - scenarioResult.totalLoss);

  const update = (key: keyof HrCalculatorInput) => (value: number) => {
    setInput((current) => ({ ...current, [key]: Math.max(0, value) }));
  };

  const reset = () => setInput(initialInput);

  const rows = [
    ['Затраты HR на подбор', result.recruitmentCost, 'Уволенные × стоимость одного найма'],
    ['Зарплата за период адаптации', result.adaptationSalary, 'Уволенные × зарплата × срок выхода'],
    ['Потерянная выручка', result.lostRevenue, 'Уволенные × выручка × срок выхода / 2'],
  ];

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-indigo-700">
              InCORE · HR Economics
            </div>
            <h1 className="max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
              Сколько денег компания теряет из-за текучести?
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-7 text-slate-600 sm:text-lg">
              Не считаем увольнение просто как «ещё одну вакансию». Показываем стоимость найма, адаптации и недополученной выручки в одной финансовой модели.
            </p>
          </div>
          <button onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-100">
            <RotateCcw size={16} /> Сбросить
          </button>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3">
              <div className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><Users size={20} /></div>
              <div><h2 className="font-bold">Данные компании</h2><p className="text-sm text-slate-500">7 показателей, которые реально влияют на стоимость текучести</p></div>
            </div>
            <div className="grid gap-5 sm:grid-cols-2">
              <InputField label="Средняя зарплата сотрудника" hint="рублей в месяц" value={input.averageSalary} onChange={update('averageSalary')} step={1000} />
              <InputField label="Уволенных за год" hint="человек" value={input.departuresPerYear} onChange={update('departuresPerYear')} />
              <InputField label="Срок выхода на результат" hint="месяцев до полной продуктивности" value={input.rampMonths} onChange={update('rampMonths')} step={0.5} />
              <InputField label="Валовая выручка на сотрудника" hint="рублей в месяц" value={input.revenuePerEmployee} onChange={update('revenuePerEmployee')} step={10000} />
              <InputField label="Количество HR-специалистов" hint="человек" value={input.hrCount} onChange={update('hrCount')} />
              <InputField label="Зарплата HR-специалиста" hint="рублей в месяц" value={input.hrSalary} onChange={update('hrSalary')} step={1000} />
              <InputField label="Наймов в месяц на 1 HR" hint="вакансий" value={input.hiresPerMonthPerHr} onChange={update('hiresPerMonthPerHr')} />
            </div>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300"><CircleDollarSign size={18} /> Реальная стоимость текучести</div>
              <div className="mt-3 text-4xl font-black tracking-tight sm:text-5xl">{money(result.totalLoss)}</div>
              <div className="mt-2 text-sm text-slate-400">в год · {money(result.lossPerDeparture)} на одно увольнение</div>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4"><div className="text-xs text-slate-400">Потери от выручки</div><div className="mt-1 font-bold">{money(result.lostRevenue)}</div></div>
                <div className="rounded-2xl bg-white/10 p-4"><div className="text-xs text-slate-400">Стоимость найма</div><div className="mt-1 font-bold">{money(result.costPerHire)}</div></div>
              </div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <h2 className="font-bold">Из чего складываются потери</h2>
              <div className="mt-5 space-y-4">
                {rows.map(([title, value, formula]) => {
                  const amount = value as number;
                  const share = result.totalLoss ? amount / result.totalLoss * 100 : 0;
                  return (
                    <div key={title as string}>
                      <div className="flex items-end justify-between gap-4"><div><div className="text-sm font-semibold">{title}</div><div className="text-xs text-slate-500">{formula}</div></div><div className="text-sm font-bold">{money(amount)}</div></div>
                      <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${Math.min(100, share)}%` }} /></div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            ['Потери / годовая зарплата', percent(result.lossAsPercentOfSalary)],
            ['Потерянная продуктивность', `${number(result.productivityLossMonths)} мес.`],
            ['Выручка под риском / месяц', money(result.monthlyRevenueAtRisk)],
            ['Годовая мощность HR', `${number(result.hrAnnualCapacity)} наймов`],
          ].map(([label, value]) => <div key={label} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div><div className="mt-2 text-xl font-black">{value}</div></div>)}
        </section>

        <section className="mt-6 rounded-3xl border border-indigo-100 bg-indigo-50 p-6 sm:p-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-xl"><div className="flex items-center gap-2 text-sm font-bold text-indigo-700"><TrendingDown size={18} /> Сценарий сокращения текучести</div><h2 className="mt-2 text-2xl font-black">Если увольнений станет на {scenario}% меньше</h2><p className="mt-2 text-sm leading-6 text-slate-600">Калькулятор пересчитывает ту же финансовую модель, чтобы показать не абстрактный HR-KPI, а деньги, которые остаются в бизнесе.</p></div>
            <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-sm">
              <div className="flex justify-between text-sm font-bold"><span>Снижение текучести</span><span>{scenario}%</span></div>
              <input type="range" min="5" max="60" step="5" value={scenario} onChange={(event) => setScenario(Number(event.target.value))} className="mt-4 w-full accent-indigo-600" />
              <div className="mt-4 flex items-end justify-between"><div><div className="text-xs text-slate-500">Экономия в год</div><div className="text-2xl font-black text-indigo-700">{money(scenarioSaving)}</div></div><div className="text-right text-xs text-slate-500">Останется увольнений<br /><span className="font-bold text-slate-900">{number(scenarioDepartures)}</span></div></div>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center">
            <div><h2 className="text-2xl font-black">Это только верхний слой потерь</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">InCORE связывает роли, навыки, результат работы и деньги. Следующий уровень расчёта показывает, где именно возникает финансовый разрыв и какой результат должен закрыть сотрудник.</p><div className="mt-5 grid gap-2 sm:grid-cols-2"><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={16} className="text-indigo-600" /> стоимость результата</div><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={16} className="text-indigo-600" /> стоимость роли</div><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={16} className="text-indigo-600" /> ROI контракта</div><div className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={16} className="text-indigo-600" /> прогноз финансового эффекта</div></div></div>
            <a href="/#/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">Перейти в InCORE <ArrowRight size={18} /></a>
          </div>
        </section>

        <footer className="py-8 text-center text-xs text-slate-400">InCORE · финансовая модель HR-эффекта</footer>
      </div>
    </main>
  );
}
