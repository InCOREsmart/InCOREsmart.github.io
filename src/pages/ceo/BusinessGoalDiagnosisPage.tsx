import { FormEvent, useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, CheckCircle2, Save, Target } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';

type Solution = 'develop_team' | 'redeploy' | 'hire' | 'contractor' | 'automate' | 'redesign_process';
type GoalRecord = {
  id: string;
  goal_title: string;
  business_outcome: string;
  metric_name: string;
  baseline_value: number;
  target_value: number;
  unit: string;
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

const initial = {
  goal_title: '',
  business_outcome: '',
  metric_name: '',
  baseline_value: '',
  target_value: '',
  unit: '',
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
          if (active) { setError('Сначала заполните профиль компании.'); setLoading(false); }
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

  const startNew = () => { setRecord(null); setSolution(''); setForm(initial); setError(''); };

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
            <label className="block text-sm font-semibold text-[#000052]">Единица измерения *
              <input required maxLength={40} value={form.unit} onChange={e => setField('unit', e.target.value)} placeholder="₽/месяц, %, заказов в день" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
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
              <input type="number" min="0" step="any" value={form.current_capacity} onChange={e => setField('current_capacity', e.target.value)} placeholder="Например, 80" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
            <label className="block text-sm font-semibold text-[#000052]">Требуемая мощность (за тот же период)
              <input type="number" min="0" step="any" value={form.required_capacity} onChange={e => setField('required_capacity', e.target.value)} placeholder="Например, 120" className="mt-2 w-full rounded-xl border border-gray-200 px-4 py-3 font-normal" />
            </label>
          </div>
          <div className="rounded-xl bg-[#F7F8FC] p-4 text-sm leading-6 text-gray-600">Важное правило: ограничение может быть связано с процессом, спросом, распределением задач, навыками или технологией. Сам факт нехватки людей ещё ничего не доказывает.</div>
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <button type="submit" disabled={saving || !companyId} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#000052] px-5 py-3.5 font-semibold text-white disabled:opacity-50"><Save className="h-4 w-4" />{saving ? 'Сохраняем…' : 'Сохранить цель и перейти к решению'}</button>
        </form>
      ) : (
        <section className="space-y-6 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-8">
          <div className="rounded-xl bg-emerald-50 p-4"><p className="text-sm font-semibold text-emerald-800">Бизнес-цель сохранена</p><h2 className="mt-1 text-xl font-bold text-[#000052]">{record.goal_title}</h2><p className="mt-2 text-sm leading-6 text-gray-700">{record.metric_name}: {record.baseline_value} → {record.target_value} {record.unit}</p><p className="mt-1 text-sm text-gray-600">Ограничение: {record.constraint_description}</p>{record.capacity_gap !== null && <p className="mt-2 text-sm font-semibold text-[#000052]">Расчётный дефицит мощности: {record.capacity_gap} за указанный период. Это индикатор, а не доказательство причины.</p>}</div>
          <div><h2 className="text-lg font-bold text-[#000052]">3. Выберите способ получить мощность</h2><p className="mt-1 text-sm leading-6 text-gray-600">Сравните варианты до создания роли. Выбор фиксирует управленческое решение, а не доказывает его экономическое превосходство.</p></div>
          <div className="grid gap-3 md:grid-cols-2">
            {solutions.map(item => <label key={item.value} className={`flex cursor-pointer gap-3 rounded-xl border p-4 transition ${solution === item.value ? 'border-[#000052] bg-[#000052]/5 ring-1 ring-[#000052]' : 'border-gray-200 hover:border-gray-400'}`}>
              <input type="radio" name="solution" value={item.value} checked={solution === item.value} onChange={() => setSolution(item.value)} className="mt-1" />
              <span><span className="block font-semibold text-[#000052]">{item.label}</span><span className="mt-1 block text-sm leading-5 text-gray-600">{item.detail}</span></span>
            </label>)}
          </div>
          {record.chosen_solution && <p className="text-sm text-emerald-700">Сохранённый вариант: {solutions.find(item => item.value === record.chosen_solution)?.label}.</p>}
          {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>}
          <div className="flex flex-col gap-3 sm:flex-row">
            <button onClick={saveSolution} disabled={!solution || saving} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#000052] px-5 py-3.5 font-semibold text-white disabled:opacity-50">{saving ? 'Сохраняем…' : 'Сохранить решение'} <ArrowRight className="h-4 w-4" /></button>
            {record.chosen_solution === 'hire' && <button onClick={() => navigate('/ceo/roles/decompose', { state: { businessGoalId: record.id } })} className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#B8860B] px-5 py-3.5 font-semibold text-white">Перейти к модели роли <ArrowRight className="h-4 w-4" /></button>}
            <button onClick={startNew} className="rounded-xl border border-gray-200 px-5 py-3.5 font-semibold text-[#000052]">Новая цель</button>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm md:p-6">
        <h2 className="font-bold text-[#000052]">Последние диагностики</h2>
        {recent.length === 0 ? <p className="mt-2 text-sm text-gray-500">Сохранённых целей пока нет.</p> : <ul className="mt-3 divide-y divide-gray-100">{recent.map(item => <li key={item.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-semibold text-[#000052]">{item.goal_title}</p><p className="text-sm text-gray-500">{item.metric_name}: {item.baseline_value} → {item.target_value} {item.unit}</p><p className="text-xs text-gray-500">{item.chosen_solution ? solutions.find(s => s.value === item.chosen_solution)?.label : 'Решение не выбрано'}</p></div><button type="button" onClick={() => { setRecord(item); setSolution(item.chosen_solution ?? ''); setError(''); }} className="self-start rounded-lg border border-gray-200 px-3 py-2 text-sm font-semibold text-[#000052] hover:bg-gray-50">Открыть</button></li>)}</ul>}
      </section>
    </main>
  );
}
