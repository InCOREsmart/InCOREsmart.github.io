import { useMemo, useState } from 'react';
import {
  ArrowRight,
  BarChart3,
  CheckCircle2,
  CircleDollarSign,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  TrendingDown,
  Users,
} from 'lucide-react';
import { calculateHrLoss, type HrCalculatorInput } from '../../features/hrCalculator/hrCalculator';

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

function InputField({ label, hint, value, onChange, min = 0, step = 1 }: { label: string; hint: string; value: number; onChange: (value: number) => void; min?: number; step?: number }) {
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

function Metric({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-2 text-xl font-black tracking-tight text-slate-900">{value}</div>
      {detail && <div className="mt-1 text-xs leading-5 text-slate-500">{detail}</div>}
    </div>
  );
}

function Diagnosis({ result, input }: { result: ReturnType<typeof calculateHrLoss>; input: HrCalculatorInput }) {
  const shares = [
    { name: 'Потерянная выручка', value: result.lostRevenue },
    { name: 'Период адаптации', value: result.adaptationSalary },
    { name: 'Подбор', value: result.recruitmentCost },
  ].sort((a, b) => b.value - a.value);
  const dominant = shares[0];
  const dominantShare = result.totalLoss > 0 ? (dominant.value / result.totalLoss) * 100 : 0;

  let headline = 'Финансовая нагрузка умеренная';
  let advice = 'Сначала проверьте стоимость роли и скорость выхода новых сотрудников на результат.';
  if (dominant.name === 'Потерянная выручка') {
    headline = 'Главный разрыв — скорость выхода на продуктивность';
    advice = `При текущем ramp-периоде ${input.rampMonths} мес. именно недополученная выручка формирует около ${percent(dominantShare)} модели потерь. Сокращение time-to-productivity даст больший эффект, чем механическое снижение стоимости найма.`;
  } else if (dominant.name === 'Период адаптации') {
    headline = 'Главный разрыв — стоимость периода адаптации';
    advice = 'Каждый дополнительный месяц до полной продуктивности напрямую увеличивает стоимость замещения. Имеет смысл пересмотреть onboarding, KPI первых 90 дней и критерии готовности роли.';
  } else {
    headline = 'Главный разрыв — ресурс найма';
    advice = 'Стоимость работы HR на замещение занимает крупнейшую долю модели. Здесь стоит проверить загрузку рекрутеров, конверсию в найм и экономику каждой закрываемой роли.';
  }

  return (
    <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-6 sm:p-8">
      <div className="flex items-center gap-2 text-sm font-bold text-indigo-700"><Sparkles size={18} /> Автоматическая диагностика</div>
      <h2 className="mt-2 text-2xl font-black">{headline}</h2>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-700">{advice}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        {shares.map((item) => (
          <div key={item.name} className="rounded-2xl bg-white p-4">
            <div className="text-xs text-slate-500">{item.name}</div>
            <div className="mt-1 text-lg font-black">{money(item.value)}</div>
            <div className="mt-1 text-xs font-semibold text-indigo-700">{percent(result.totalLoss > 0 ? (item.value / result.totalLoss) * 100 : 0)} потерь</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HrLossCalculatorPage() {
  const [input, setInput] = useState(initialInput);
  const [turnoverScenario, setTurnoverScenario] = useState(25);
  const [rampScenario, setRampScenario] = useState(30);
  const [showFullResult, setShowFullResult] = useState(false);
  const [contact, setContact] = useState({ name: '', email: '' });
  const result = useMemo(() => calculateHrLoss(input), [input]);
  const scenarioInput = useMemo(() => ({
    ...input,
    departuresPerYear: Math.max(0, input.departuresPerYear * (1 - turnoverScenario / 100)),
    rampMonths: Math.max(0, input.rampMonths * (1 - rampScenario / 100)),
  }), [input, turnoverScenario, rampScenario]);
  const scenarioResult = useMemo(() => calculateHrLoss(scenarioInput), [scenarioInput]);
  const scenarioSaving = Math.max(0, result.totalLoss - scenarioResult.totalLoss);
  const update = (key: keyof HrCalculatorInput) => (value: number) => setInput((current) => ({ ...current, [key]: Math.max(0, value) }));

  const lossRows = [
    { title: 'Потерянная выручка', amount: result.lostRevenue, formula: 'Недополученная выручка за период разгона' },
    { title: 'Зарплата периода адаптации', amount: result.adaptationSalary, formula: 'Зарплата до выхода сотрудника на полную продуктивность' },
    { title: 'Затраты HR на подбор', amount: result.recruitmentCost, formula: 'Стоимость работы HR на замещение' },
  ];
  const maxLoss = Math.max(...lossRows.map((row) => row.amount), 1);
  const annualSalaryFund = input.averageSalary * Math.max(0, input.departuresPerYear);
  const exposureRatio = annualSalaryFund > 0 ? result.totalLoss / annualSalaryFund : 0;
  const opportunityRatio = result.totalLoss > 0 ? scenarioSaving / result.totalLoss : 0;

  const handleUnlock = () => {
    if (!contact.email.trim()) return;
    localStorage.setItem('incore_hr_diagnostic_lead', JSON.stringify({
      ...contact,
      input,
      result,
      scenarioResult,
      capturedAt: new Date().toISOString(),
    }));
    setShowFullResult(true);
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 sm:py-10">
        <header className="mb-8 sm:mb-10">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-indigo-700">InCORE · Financial HR Diagnostic</div>
          <div className="grid gap-6 lg:grid-cols-[1.1fr_.9fr] lg:items-end">
            <div>
              <h1 className="max-w-4xl text-4xl font-black tracking-tight sm:text-6xl">Сколько денег ваша компания теряет из-за людей и процессов?</h1>
              <p className="mt-4 max-w-3xl text-base leading-7 text-slate-600 sm:text-lg">За 5 минут получите финансовую оценку потерь от текучести, адаптации и недополученной продуктивности. Без регистрации. Сначала результат, потом контакт.</p>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs sm:gap-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="text-lg font-black">₽</div><div className="mt-1 text-slate-500">Потери</div></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="text-lg font-black">⚠</div><div className="mt-1 text-slate-500">Риски</div></div>
              <div className="rounded-2xl border border-slate-200 bg-white p-3"><div className="text-lg font-black">↑</div><div className="mt-1 text-slate-500">Возможность</div></div>
            </div>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[1fr_1.05fr]">
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-6 flex items-center gap-3"><div className="rounded-xl bg-indigo-50 p-2 text-indigo-700"><Users size={20} /></div><div><h2 className="font-bold">Данные компании</h2><p className="text-sm text-slate-500">7 показателей. Можно начать с приблизительных значений.</p></div></div>
            <div className="grid gap-5 sm:grid-cols-2">
              <InputField label="Средняя зарплата сотрудника" hint="рублей в месяц" value={input.averageSalary} onChange={update('averageSalary')} step={1000} />
              <InputField label="Уволенных за год" hint="человек" value={input.departuresPerYear} onChange={update('departuresPerYear')} />
              <InputField label="Срок выхода на результат" hint="месяцев до полной продуктивности" value={input.rampMonths} onChange={update('rampMonths')} step={0.5} />
              <InputField label="Валовая выручка на сотрудника" hint="рублей в месяц" value={input.revenuePerEmployee} onChange={update('revenuePerEmployee')} step={10000} />
              <InputField label="Количество HR-специалистов" hint="человек" value={input.hrCount} onChange={update('hrCount')} />
              <InputField label="Зарплата HR-специалиста" hint="рублей в месяц" value={input.hrSalary} onChange={update('hrSalary')} step={1000} />
              <InputField label="Наймов в месяц на 1 HR" hint="закрытий вакансий" value={input.hiresPerMonthPerHr} onChange={update('hiresPerMonthPerHr')} />
            </div>
            <button onClick={() => { setInput(initialInput); setTurnoverScenario(25); setRampScenario(30); setShowFullResult(false); }} className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-slate-900"><RotateCcw size={15} /> Сбросить расчёт</button>
          </div>

          <div className="space-y-6">
            <div className="overflow-hidden rounded-3xl bg-slate-950 p-6 text-white shadow-xl sm:p-8">
              <div className="flex items-center gap-2 text-sm font-semibold text-slate-300"><CircleDollarSign size={18} /> Расчётная оценка потерь</div>
              <div className="mt-3 text-4xl font-black tracking-tight sm:text-6xl">≈ {money(result.totalLoss)}</div>
              <div className="mt-2 text-sm text-slate-400">в год · ≈ {money(result.lossPerDeparture)} на одно увольнение</div>
              <div className="mt-7 grid grid-cols-2 gap-3">
                <div className="rounded-2xl bg-white/10 p-4"><div className="text-xs text-slate-400">Доля от базы зарплат</div><div className="mt-1 font-bold">{percent(exposureRatio * 100)}</div></div>
                <div className="rounded-2xl bg-white/10 p-4"><div className="text-xs text-slate-400">Выручка под риском</div><div className="mt-1 font-bold">{money(result.lostRevenue)}</div></div>
              </div>
              <div className="mt-5 text-xs leading-5 text-slate-400">Это модельная оценка на основе введённых данных, а не бухгалтерский факт. Чем точнее исходные данные, тем полезнее диагностика.</div>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="flex items-center justify-between gap-3"><div><h2 className="font-bold">Карта финансового разрыва</h2><p className="mt-1 text-xs text-slate-500">Где именно в модели лежат деньги.</p></div><BarChart3 size={20} className="text-indigo-600" /></div>
              <div className="mt-5 space-y-5">
                {lossRows.map((row) => <div key={row.title}><div className="flex items-end justify-between gap-4"><div><div className="text-sm font-semibold">{row.title}</div><div className="text-xs text-slate-500">{row.formula}</div></div><div className="text-sm font-bold">{money(row.amount)}</div></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-indigo-600" style={{ width: `${(row.amount / maxLoss) * 100}%` }} /></div></div>)}
              </div>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Metric label="Финансовая нагрузка" value={percent(result.lossAsPercentOfSalary)} detail="потери / годовая зарплатная база замен" />
          <Metric label="Потеря продуктивности" value={`${number(result.productivityLossMonths)} мес.`} detail="суммарное время разгона замен" />
          <Metric label="Стоимость 1 увольнения" value={money(result.lossPerDeparture)} />
          <Metric label="HR-мощность" value={`${number(result.hrAnnualCapacity)} наймов`} detail={`${money(result.hrCostPerYear)} фонд HR в год`} />
        </section>

        <section className="mt-6"><Diagnosis result={result} input={input} /></section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8">
          <div className="grid gap-7 lg:grid-cols-[1fr_420px] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-sm font-bold text-indigo-700"><TrendingDown size={18} /> Сценарный симулятор</div>
              <h2 className="mt-2 text-2xl font-black sm:text-3xl">Что произойдёт с деньгами, если изменить два ключевых показателя?</h2>
              <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Симулятор не обещает магического результата. Он показывает экономический эффект именно вашей модели при заданных изменениях.</p>
              <div className="mt-6 grid gap-5 sm:grid-cols-2">
                <label><div className="flex justify-between text-sm font-bold"><span>Снижение текучести</span><span>{turnoverScenario}%</span></div><input type="range" min="0" max="60" step="5" value={turnoverScenario} onChange={(event) => setTurnoverScenario(Number(event.target.value))} className="mt-4 w-full accent-indigo-600" /></label>
                <label><div className="flex justify-between text-sm font-bold"><span>Сокращение time-to-productivity</span><span>{rampScenario}%</span></div><input type="range" min="0" max="60" step="5" value={rampScenario} onChange={(event) => setRampScenario(Number(event.target.value))} className="mt-4 w-full accent-indigo-600" /></label>
              </div>
            </div>
            <div className="rounded-2xl bg-slate-950 p-6 text-white">
              <div className="text-xs font-semibold uppercase tracking-wide text-slate-400">Потенциальный экономический эффект</div>
              <div className="mt-2 text-4xl font-black">+{money(scenarioSaving)}</div>
              <div className="mt-2 text-sm text-slate-400">≈ {percent(opportunityRatio * 100)} текущих потерь</div>
              <div className="mt-5 grid grid-cols-2 gap-3 text-sm"><div className="rounded-xl bg-white/10 p-3"><div className="text-slate-400">Было</div><div className="mt-1 font-bold">{money(result.totalLoss)}</div></div><div className="rounded-xl bg-white/10 p-3"><div className="text-slate-400">Станет</div><div className="mt-1 font-bold">{money(scenarioResult.totalLoss)}</div></div></div>
            </div>
          </div>
        </section>

        {!showFullResult ? (
          <section className="mt-6 overflow-hidden rounded-3xl bg-indigo-600 p-6 text-white shadow-xl sm:p-8">
            <div className="grid gap-7 lg:grid-cols-[1fr_420px] lg:items-center">
              <div><div className="text-sm font-bold text-indigo-100">Ваш предварительный результат готов</div><h2 className="mt-2 text-2xl font-black sm:text-3xl">Получите полный финансовый диагноз компании</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-indigo-50">В полном результате: структура потерь, ключевая причина, сценарий оптимизации и точки максимального экономического эффекта. Контакт запрашивается только после расчёта.</p></div>
              <div className="rounded-2xl bg-white p-5 text-slate-900">
                <label className="block"><span className="text-xs font-bold text-slate-500">Имя</span><input value={contact.name} onChange={(e) => setContact({ ...contact, name: e.target.value })} placeholder="Как к вам обращаться" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500" /></label>
                <label className="mt-3 block"><span className="text-xs font-bold text-slate-500">Email *</span><input type="email" required value={contact.email} onChange={(e) => setContact({ ...contact, email: e.target.value })} placeholder="you@company.ru" className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2.5 outline-none focus:border-indigo-500" /></label>
                <button disabled={!contact.email.trim()} onClick={handleUnlock} className="mt-4 flex w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-3 font-bold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50">Открыть полный диагноз <ArrowRight size={17} /></button>
                <div className="mt-3 text-center text-[11px] leading-4 text-slate-400">Данные используются для сохранения результата на этом устройстве. Перед подключением CRM/почты нужно настроить серверный сбор лидов.</div>
              </div>
            </div>
          </section>
        ) : (
          <section className="mt-6 space-y-6">
            <div className="rounded-3xl border border-emerald-100 bg-emerald-50 p-6 sm:p-8"><div className="flex items-center gap-2 text-sm font-bold text-emerald-700"><CheckCircle2 size={18} /> Полный результат открыт</div><h2 className="mt-2 text-2xl font-black">Ваш потенциальный эффект: +{money(scenarioSaving)} в год</h2><p className="mt-2 max-w-3xl text-sm leading-6 text-slate-700">Следующий рациональный шаг — найти, какой именно показатель способен дать этот эффект, и связать его с конкретной ролью, результатом и экономикой исполнения.</p></div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><Metric label="Стоимость адаптации" value={money(result.adaptationSalary)} detail="зарплата за период выхода" /><Metric label="Прямые затраты на подбор" value={money(result.recruitmentCost)} detail="ресурс HR на замещение" /><Metric label="Разрыв выручки" value={money(result.replacementRevenueGap)} detail="теоретическая выручка за ramp-период" /><Metric label="Потери / сотрудника" value={money(result.turnoverCostPerEmployee)} /><Metric label="Затраты на HR / год" value={money(result.hrCostPerYear)} /><Metric label="Потенциал сценария" value={`+${money(scenarioSaving)}`} /></div>
          </section>
        )}

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm sm:p-8"><div className="grid gap-6 lg:grid-cols-[1fr_auto] lg:items-center"><div><div className="flex items-center gap-2 text-sm font-bold text-slate-700"><ShieldAlert size={18} /> От HR-метрик к деньгам</div><h2 className="mt-2 text-2xl font-black">InCORE связывает роль, результат и финансовый эффект</h2><p className="mt-2 max-w-2xl leading-7 text-slate-600">Калькулятор показывает проблему. InCORE нужен, чтобы управлять её исполнением: кто отвечает за результат, какой навык нужен, какое событие произошло, какой контракт создан и какой финансовый эффект получен.</p><div className="mt-5 grid gap-2 sm:grid-cols-2">{['Стоимость результата', 'Стоимость роли', 'ROI контракта', 'Прогноз финансового эффекта'].map((item) => <div key={item} className="flex items-center gap-2 text-sm font-semibold"><CheckCircle2 size={16} className="text-indigo-600" /> {item}</div>)}</div></div><a href="/#/register" className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-4 font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700">Перейти в InCORE <ArrowRight size={18} /></a></div></section>
        <footer className="py-8 text-center text-xs text-slate-400">InCORE · Financial HR Diagnostic · Модельная оценка, а не бухгалтерский расчёт</footer>
      </div>
    </main>
  );
}
