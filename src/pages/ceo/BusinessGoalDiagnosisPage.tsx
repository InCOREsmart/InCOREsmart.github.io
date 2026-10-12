import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Save, Target, Calculator, CircleDollarSign } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Solution = 'develop_team' | 'redeploy' | 'hire' | 'contractor' | 'automate' | 'redesign_process';
type Alternative = {
  id?: string;
  goal_id: string;
  company_id: string;
  user_id: string;
  solution_key: Solution;
  one_time_cost: number;
  monthly_cost: number;
  expected_monthly_value: number;
  confidence_pct: number;
  time_to_effect_months: number;
  comparison_horizon_months: number;
  risk_reserve: number;
  expected_benefit?: number;
  total_cost?: number;
  net_value?: number;
  roi_pct?: number | null;
  notes: string;
};

type AlternativeDraft = { one_time_cost: string; monthly_cost: string; expected_monthly_value: string; confidence_pct: string; time_to_effect_months: string; comparison_horizon_months: string; risk_reserve: string; notes: string };

type GoalRecord = {
  id: string;
  goal_title: string;
  business_outcome: string;
  metric_name: string;
  baseline_value: number;
  target_value: number;
  unit: string;
  financial_unit: string;
  target_date: string | null;
  process_description: string;
  constraint_description: string;
  current_capacity: number | null;
  required_capacity: number | null;
  capacity_gap: number | null;
  chosen_solution: Solution | null;
  status: string;
  created_at: string;
};

const solutions: Array<{ value: Solution; label: string; detail: string }> = [
  { value: 'develop_team', label: 'Развить навыки команды', detail: 'Мощность есть, но не хватает подтверждённых навыков.' },
  { value: 'redeploy', label: 'Перераспределить работу', detail: 'Нужный ресурс может быть внутри компании.' },
  { value: 'hire', label: 'Нанять извне', detail: 'Внутренние варианты не закрывают подтверждённый дефицит.' },
  { value: 'contractor', label: 'Подключить подрядчика', detail: 'Нужен ограниченный объём работы или экспертиза.' },
  { value: 'automate', label: 'Автоматизировать', detail: 'Повторяемая работа может быть снята технологией.' },
  { value: 'redesign_process', label: 'Изменить процесс', detail: 'Ограничение вызвано способом организации работы.' },
];

const blankAlternative = (): AlternativeDraft => ({ one_time_cost: '', monthly_cost: '', expected_monthly_value: '', confidence_pct: '', time_to_effect_months: '', comparison_horizon_months: '', risk_reserve: '', notes: '' });
const initialAlternatives = (): Record<Solution, AlternativeDraft> => ({ develop_team: blankAlternative(), redeploy: blankAlternative(), hire: blankAlternative(), contractor: blankAlternative(), automate: blankAlternative(), redesign_process: blankAlternative() });

const initial = {
  goal_title: '',
  business_outcome: '',
  metric_name: '',
  baseline_value: '',
  target_value: '',
  unit: '',
  financial_unit: '₽',
  target_date: '',
  process_description: '',
  constraint_description: '',
  current_capacity: '',
  required_capacity: '',
};

export function BusinessGoalDiagnosisPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [companyId, setCompanyId] = useState('');
  const [form, setForm] = useState(initial);
  const [record, setRecord] = useState<GoalRecord | null>(null);
  const [solution, setSolution] = useState<Solution | ''>('');
  const [alternatives, setAlternatives] = useState<Record<Solution, AlternativeDraft>>(initialAlternatives);
  const [savedAlternatives, setSavedAlternatives] = useState<Alternative[]>([]);
  const [comparisonLoading, setComparisonLoading] = useState(false);
  const [recent, setRecent] = useState<GoalRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = async () => {
      if (!user) { setLoading(false); return; }
      try {
        const { data: company, error: companyError } = await supabase
          .from('companies').select('id').eq('user_id', user.id).maybeSingle();
        if (companyError) throw companyError;
        if (!company) {
          if (active) navigate('/ceo/onboarding', { replace: true });
          return;
        }
        if (!active) return;
        setCompanyId(company.id);
        const { data, error: goalsError } = await supabase
          .from('business_goal_diagnostics').select('*').eq('company_id', company.id)
          .order('created_at', { ascending: false }).limit(10);
        if (goalsError) throw goalsError;
        if (active) setRecent((data ?? []) as GoalRecord[]);
      } catch (e) {
        if (active) setError(e instanceof Error ? e.message : 'Не удалось загрузить цели.');
      } finally {
        if (active) setLoading(false);
      }
    };
    void load();
    return () => { active = false; };
  }, [user]);

  const setField = (key: keyof typeof initial, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const setAlternativeField = (key: Solution, field: keyof AlternativeDraft, value: string) => { setAlternatives(prev => ({ ...prev, [key]: { ...prev[key], [field]: value } })); setSavedAlternatives(prev => prev.filter(item => item.solution_key !== key)); setSolution(''); };

  const loadAlternatives = async (goalId: string) => {
    const { data, error: alternativesError } = await supabase.from('business_goal_alternatives').select('*').eq('goal_id', goalId).order('net_value', { ascending: false });
    if (alternativesError) throw alternativesError;
    const rows = (data ?? []) as Alternative[];
    setSavedAlternatives(rows);
    const next = initialAlternatives();
    for (const row of rows) next[row.solution_key] = { one_time_cost: String(row.one_time_cost), monthly_cost: String(row.monthly_cost), expected_monthly_value: String(row.expected_monthly_value), confidence_pct: String(row.confidence_pct), time_to_effect_months: String(row.time_to_effect_months), comparison_horizon_months: String(row.comparison_horizon_months), risk_reserve: String(row.risk_reserve), notes: row.notes ?? '' };
    setAlternatives(next);
  };

  const saveGoal = async (event: FormEvent) => {
    event.preventDefault();
    if (!user || !companyId) return;
    setError('');
    setSaving(true);
    const baseline = Number(form.baseline_value);
    const target = Number(form.target_value);
    const current = form.current_capacity === '' ? null : Number(form.current_capacity);
    const required = form.required_capacity === '' ? null : Number(form.required_capacity);
    if (!Number.isFinite(baseline) || !Number.isFinite(target) || baseline < 0 || target < 0) {
      setError('Текущий и целевой показатели должны быть числами не меньше нуля.');
      setSaving(false);
      return;
    }
    if (current === null || required === null) {
      setError('Укажите текущую и требуемую мощность за один и тот же период, чтобы проверить дефицит.');
      setSaving(false);
      return;
    }
    if ((current !== null && (!Number.isFinite(current) || current < 0)) ||
        (required !== null && (!Number.isFinite(required) || required < 0))) {
      setError('Значения мощности должны быть числами не меньше нуля.');
      setSaving(false);
      return;
    }
    try {
      const payload = {
        company_id: companyId,
        user_id: user.id,
        goal_title: form.goal_title.trim(),
        business_outcome: form.business_outcome.trim(),
        metric_name: form.metric_name.trim(),
        baseline_value: baseline,
        target_value: target,
        unit: form.unit.trim(),
        financial_unit: form.financial_unit,
        target_date: form.target_date || null,
        process_description: form.process_description.trim(),
        constraint_description: form.constraint_description.trim(),
        current_capacity: current,
        required_capacity: required,
        status: 'diagnosing',
      };
      const { data, error: insertError } = await supabase.from('business_goal_diagnostics').insert(payload).select('*').single();
      if (insertError) throw insertError;
      const saved = data as GoalRecord;
      setRecord(saved);
      setRecent(prev => [saved, ...prev.filter(item => item.id !== saved.id)].slice(0, 10));
      setSavedAlternatives([]);
      setAlternatives(initialAlternatives());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить бизнес-цель.');
    } finally {
      setSaving(false);
    }
  };

  const saveSolution = async () => {
    if (!record || !solution || !companyId) return;
    setSaving(true);
    setError('');
    try {
      if (solution === 'hire' && (record.capacity_gap === null || record.capacity_gap <= 0)) { setError('Внешний найм доступен только при измеренном положительном дефиците мощности. Уточните текущую и требуемую мощность.'); setSaving(false); return; }
      if (savedAlternatives.length !== solutions.length) { setError('Сначала сохраните расчёт для всех шести альтернатив. Иначе это не сравнение, а гадание с таблицей.'); setSaving(false); return; }
      const status = solution === 'hire' ? 'ready_for_role' : 'solution_selected';
      const { data, error: updateError } = await supabase.from('business_goal_diagnostics')
        .update({ chosen_solution: solution, status })
        .eq('id', record.id).eq('company_id', companyId).select('*').single();
      if (updateError) throw updateError;
      const updated = data as GoalRecord;
      setRecord(updated);
      setRecent(prev => prev.map(item => item.id === updated.id ? updated : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Не удалось сохранить выбранный способ.');
    } finally {
      setSaving(false);
    }
  };

  const saveComparison = async () => {
    if (!record || !companyId || !user) return;
    setComparisonLoading(true); setError('');
    try {
      const rows = solutions.map(item => {
        const draft = alternatives[item.value];
        const requiredFields: Array<keyof AlternativeDraft> = ['one_time_cost','monthly_cost','expected_monthly_value','confidence_pct','time_to_effect_months','comparison_horizon_months','risk_reserve'];
        for (const field of requiredFields) if (draft[field].trim() === '' || !Number.isFinite(Number(draft[field]))) throw new Error('Заполните числовые поля во всех шести вариантах.');
        const oneTime = Number(draft.one_time_cost), monthly = Number(draft.monthly_cost), expected = Number(draft.expected_monthly_value), confidence = Number(draft.confidence_pct), delay = Number(draft.time_to_effect_months), horizon = Number(draft.comparison_horizon_months), reserve = Number(draft.risk_reserve);
        if (oneTime < 0 || monthly < 0 || confidence < 0 || confidence > 100 || delay < 0 || delay > 60 || !Number.isInteger(delay) || horizon < 1 || horizon > 60 || !Number.isInteger(horizon) || reserve < 0) throw new Error('Проверьте стоимость, вероятность 0–100%, срок эффекта 0–60 месяцев, горизонт 1–60 месяцев и резерв риска.');
        return { goal_id: record.id, company_id: companyId, user_id: user.id, solution_key: item.value, one_time_cost: oneTime, monthly_cost: monthly, expected_monthly_value: expected, confidence_pct: confidence, time_to_effect_months: delay, comparison_horizon_months: horizon, risk_reserve: reserve, notes: draft.notes.trim() };
      });
      if (new Set(rows.map(row => row.comparison_horizon_months)).size !== 1) throw new Error('У всех вариантов должен быть одинаковый горизонт расчёта.');
      const { error: upsertError } = await supabase.from('business_goal_alternatives').upsert(rows, { onConflict: 'goal_id,solution_key' });
      if (upsertError) throw upsertError;
      const { error: statusError } = await supabase.from('business_goal_diagnostics').update({ status: 'comparing' }).eq('id', record.id).eq('company_id', companyId);
      if (statusError) throw statusError;
      setRecord(prev => prev && prev.id === record.id ? { ...prev, chosen_solution: null, status: 'comparing' } : prev);
      setRecent(prev => prev.map(item => item.id === record.id ? { ...item, chosen_solution: null, status: 'comparing' } : item));
      setSolution('');
      await loadAlternatives(record.id);
    } catch (e) { setError(e instanceof Error ? e.message : 'Не удалось сохранить сравнение.'); } finally { setComparisonLoading(false); }
  };

  const startNew = () => { setRecord(null); setSolution(''); setForm(initial); setAlternatives(initialAlternatives()); setSavedAlternatives([]); setError(''); };

  if (loading) return <div className="mx-auto max-w-4xl p-8 text-sm text-gray-500">Загружаем рабочее пространство…</div>;

  return (
    <main className="mx-auto max-w-5xl space-y-6 p-4 md:p-8">
      <div className="flex items-start gap-3">
        <Link to="/ceo" aria-label="Назад в кабинет" className="rounded-xl p-2 text-[#000052] hover:bg-[#000052]/5"><ArrowLeft className="h-5 w-5" /></Link>
        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-[#B8860B]">InCORE · Диагностика мощности</p>
          <h1 className="mt-1 text-2xl font-bold text-[#000052] md:text-3xl">Начните с бизнес-цели</h1>
          <p className="mt-2 max-w-3xl leading-7 text-gray-600">Сначала фиксируем результат, процесс и ограничение. Роль и человек появляются только после подтверждения дефицита производительной мощности.</p>
        </div>
      </div>

      {!record ? (
        <form onSubmit={saveGoal} className="space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-8">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4"><Target className="h-6 w-6 text-[#B8860B]" /><div><h2 className="font-bold text-[#000052]">1. Бизнес-результат</h2><p className="text-sm text-gray-500">Не название должности. Какое изменение нужно бизнесу?</p></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[#000052]">Краткое название цели *
              <input required maxLength={240} value={form.goal_title} onChange={e => setField('goal_title', e.target.value)} placeholder="Например, увеличить повторные продажи" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Показатель результата *
              <input required maxLength={120} value={form.metric_name} onChange={e => setField('metric_name', e.target.value)} placeholder="Выручка, маржа, скорость обработки" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052] md:col-span-2">Какой экономический или операционный эффект нужен? *
              <textarea required rows={3} maxLength={4000} value={form.business_outcome} onChange={e => setField('business_outcome', e.target.value)} placeholder="Что должно измениться и почему это важно для бизнеса" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Текущее значение *
              <input required type="number" min="0" step="any" value={form.baseline_value} onChange={e => setField('baseline_value', e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Целевое значение *
              <input required type="number" min="0" step="any" value={form.target_value} onChange={e => setField('target_value', e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Единица измерения показателя *
              <input required maxLength={40} value={form.unit} onChange={e => setField('unit', e.target.value)} placeholder="%, заказов в день, ₽/месяц" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Валюта экономического расчёта *
              <select required value={form.financial_unit} onChange={e => setField('financial_unit', e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal">
                <option value="₽">Российский рубль (₽)</option><option value="₸">Казахстанский тенге (₸)</option><option value="₼">Азербайджанский манат (₼)</option><option value="€">Евро (€)</option><option value="$">Доллар США ($)</option>
              </select>
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Срок достижения цели
              <input type="date" value={form.target_date} onChange={e => setField('target_date', e.target.value)} className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
          </div>

          <div className="flex items-center gap-3 border-b border-gray-100 pb-4 pt-2"><CheckCircle2 className="h-6 w-6 text-[#B8860B]" /><div><h2 className="font-bold text-[#000052]">2. Процесс и ограничение</h2><p className="text-sm text-gray-500">Фиксируем гипотезу, не объявляя её доказанным фактом.</p></div></div>
          <div className="grid gap-4 md:grid-cols-2">
            <label className="block text-sm font-semibold text-[#000052] md:col-span-2">Как устроен процесс, который создаёт этот результат? *
              <textarea required rows={3} maxLength={5000} value={form.process_description} onChange={e => setField('process_description', e.target.value)} placeholder="Основные шаги, входящий поток, кто и что делает" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052] md:col-span-2">Где процесс ограничен и чем это подтверждается? *
              <textarea required rows={3} maxLength={5000} value={form.constraint_description} onChange={e => setField('constraint_description', e.target.value)} placeholder="Например, заявки ждут обработки 3 дня; подтвердите цифрами или наблюдениями" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Текущая мощность (число за период)
              <input type="number" min="0" step="any" value={form.current_capacity} onChange={e => setField('current_capacity', e.target.value)} placeholder="Например, 80" required className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Требуемая мощность (за тот же период)
              <input type="number" min="0" step="any" value={form.required_capacity} onChange={e => setField('required_capacity', e.target.value)} placeholder="Например, 120" required className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
          </div>
          <div className="rounded-xl bg-[#F7F8FC] p-4 text-sm leading-6 text-gray-600">Важное правило: ограничение может быть связано с процессом, спросом, распределением задач, навыками или технологией. Сам факт нехватки людей ещё ничего не доказывает.</div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving || !companyId} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#000052] px-5 py-3.5 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Сохраняем…' : 'Сохранить цель и перейти к решению'}</button>
        </form>
      ) : (
        <section className="space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-8">
          <div className="rounded-xl bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-800">Бизнес-цель сохранена</p><h2 className="mt-1 text-xl font-bold text-[#000052]">{record.goal_title}</h2><p className="mt-2 text-sm leading-6 text-gray-700">{record.metric_name}: {record.baseline_value} → {record.target_value} {record.unit}</p><p className="mt-1 text-sm text-gray-600">Ограничение: {record.constraint_description}</p>{record.capacity_gap !== null && <p className="mt-2 text-sm font-semibold text-[#000052]">Расчётный дефицит мощности: {record.capacity_gap} за указанный период. Это индикатор, а не доказательство причины.</p>}</div>
          <div className="rounded-xl border border-gray-200 p-4 md:p-5">
            <div className="flex items-start gap-3"><Calculator className="mt-1 h-6 w-6 text-[#B8860B]" /><div><h2 className="font-bold text-[#000052]">3. Сравните экономику шести вариантов</h2><p className="mt-1 text-sm leading-6 text-gray-600">Для каждого варианта оцените разовые затраты, ежемесячную стоимость, ожидаемый ежемесячный эффект, вероятность достижения, задержку до эффекта и резерв риска. Используйте один горизонт расчёта и одну валюту. Это оценка по вашим предположениям, а не обещание результата.</p></div></div>
            <div className="mt-4 grid gap-4">
              {solutions.map(item => { const draft = alternatives[item.value]; const saved = savedAlternatives.find(row => row.solution_key === item.value); return <div key={item.value} className="rounded-xl border border-gray-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="font-semibold text-[#000052]">{item.label}</h3><p className="text-sm text-gray-500">{item.detail}</p></div>{saved && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">Расчёт сохранён</span>}</div>
                <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  {[['one_time_cost','Разовые затраты'],['monthly_cost','Затраты в месяц'],['expected_monthly_value','Эффект в месяц'],['confidence_pct','Вероятность эффекта, %'],['time_to_effect_months','Месяцев до эффекта'],['comparison_horizon_months','Горизонт, месяцев'],['risk_reserve','Резерв риска']].map(([field,label]) => <label key={field} className="text-xs font-semibold text-gray-600">{label}<input type="number" min={field==='expected_monthly_value' ? undefined : 0} max={field==='confidence_pct' ? 100 : field==='time_to_effect_months' ? 60 : field==='comparison_horizon_months' ? 60 : undefined} step="any" required value={draft[field as keyof AlternativeDraft]} onChange={e => setAlternativeField(item.value, field as keyof AlternativeDraft, e.target.value)} className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-[#000052]" /></label>)}
                  <label className="text-xs font-semibold text-gray-600 sm:col-span-2">Основание оценки / допущения<textarea rows={2} maxLength={3000} value={draft.notes} onChange={e => setAlternativeField(item.value,'notes',e.target.value)} placeholder="Источники данных, ограничения и риски" className="mt-1 w-full rounded-lg border border-gray-200 px-3 py-2 text-sm font-normal text-[#000052]" /></label>
                </div>
                {saved && <div className="mt-3 grid gap-2 rounded-lg bg-[#F7F8FC] p-3 text-sm sm:grid-cols-3"><p>Ожидаемая выгода: <strong>{Number(saved.expected_benefit ?? 0).toLocaleString('ru-RU')} {record.financial_unit}</strong></p><p>Общие затраты: <strong>{Number(saved.total_cost ?? 0).toLocaleString('ru-RU')} {record.financial_unit}</strong></p><p>Чистый эффект: <strong>{Number(saved.net_value ?? 0).toLocaleString('ru-RU')} {record.financial_unit}</strong></p><p>ROI: <strong>{saved.roi_pct == null ? 'не рассчитывается при нулевых затратах' : `${Number(saved.roi_pct).toFixed(1)}%`}</strong></p></div>}
              </div>; })}
            </div>
            <button type="button" onClick={saveComparison} disabled={comparisonLoading || !record} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl border border-[#000052] px-5 py-3 font-semibold text-[#000052] disabled:opacity-50"><CircleDollarSign className="h-4 w-4" />{comparisonLoading ? 'Сохраняем расчёты…' : 'Сохранить и пересчитать все варианты'}</button>
            {savedAlternatives.length === solutions.length && <div className="mt-4 rounded-xl bg-emerald-50 p-4 text-sm leading-6 text-emerald-900"><strong>Сравнение рассчитано.</strong> Чистый эффект учитывает вероятность достижения результата и задержку до его появления, затем вычитает затраты и резерв риска. Рейтинг не заменяет управленческую оценку качества исходных данных.</div>}
          </div>
          <div><h2 className="text-lg font-bold text-[#000052]">4. Выберите способ получить мощность</h2><p className="mt-1 text-sm leading-6 text-gray-600">Выбор доступен после сохранения расчёта всех шести вариантов. InCORE не выбирает победителя автоматически: стоимость не отменяет ограничений процесса, качества доказательств и риска исполнения.</p></div>
          <div className="grid gap-3 md:grid-cols-2">
            {solutions.map(item => <label key={item.value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${solution === item.value ? 'border-[#000052] bg-[#000052]/5 ring-1 ring-[#000052]' : 'border-gray-200 hover:border-gray-400'}`}>
              <input type="radio" name="solution" value={item.value} checked={solution === item.value} onChange={() => setSolution(item.value)} className="mt-1" />
              <span><span className="block font-semibold text-[#000052]">{item.label}</span><span className="mt-1 block text-sm leading-5 text-gray-600">{item.detail}</span></span>
            </label>)}
          </div>
          {record.chosen_solution && <p className="text-sm text-emerald-700">Сохранённый вариант: {solutions.find(item => item.value === record.chosen_solution)?.label}.</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={saveSolution} disabled={!solution || saving || savedAlternatives.length !== solutions.length} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#000052] px-5 py-3.5 font-semibold text-white disabled:opacity-50">{saving ? 'Сохраняем…' : 'Сохранить решение'} <ArrowRight className="h-4 w-4" /></button>
            {record.chosen_solution === 'hire' && <button onClick={() => navigate(`/ceo/roles/decompose?businessGoalId=${encodeURIComponent(record.id)}`)} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B8860B] px-5 py-3.5 font-semibold text-white">Перейти к модели роли <ArrowRight className="h-4 w-4" /></button>}
            <button onClick={startNew} className="rounded-xl border border-gray-200 px-5 py-3.5 font-semibold text-[#000052]">Новая цель</button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="font-bold text-[#000052]">Последние диагностики</h2>
        {recent.length === 0 ? <p className="mt-2 text-sm text-gray-500">Сохранённых целей пока нет.</p> : <ul className="mt-3 divide-y divide-gray-100">{recent.map(item => <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#000052]">{item.goal_title}</p><p className="text-sm text-gray-500">{item.metric_name}: {item.baseline_value} → {item.target_value} {item.unit}</p><p className="text-xs text-gray-500">{item.chosen_solution ? solutions.find(s => s.value === item.chosen_solution)?.label : 'Решение не выбрано'}</p></div><button type="button" onClick={() => { setRecord(item); setSolution(item.chosen_solution ?? ''); setSavedAlternatives([]); setAlternatives(initialAlternatives()); setError(''); void loadAlternatives(item.id).catch(e => setError(e instanceof Error ? e.message : 'Не удалось загрузить сравнение вариантов.')); }} className="self-start rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-[#000052] hover:bg-gray-50">Открыть</button></li>)}</ul>}
      </section>
    </main>
  );
}
