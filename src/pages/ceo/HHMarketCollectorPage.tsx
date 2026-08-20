import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Download, FileUp, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type SourceType = 'vacancies' | 'resumes';
type Country = 'RU' | 'AZ';

type MarketRow = {
  id: string;
  title: string;
  region: string;
  salary: number | null;
  salaryMin: number | null;
  salaryMax: number | null;
  text: string;
  sourceName: string;
  sourceType: SourceType;
  skills: string[];
  country: Country;
  automatic: boolean;
};

type SkillMarketStat = {
  skill: string;
  vacancies: number;
  vacancyShare: number;
  resumes: number;
  resumeShare: number;
  gap: number;
  candidateSalaryMedian: number | null;
};

const SKILL_RULES: Array<{ name: string; patterns: string[] }> = [
  { name: 'Корпоративные продажи', patterns: ['b2b', 'b2б', 'корпоративн', 'юридическ'] },
  { name: 'Кросс-продажи', patterns: ['кросс-продаж', 'cross-sell', 'cross sell', 'crosssell', 'допродаж'] },
  { name: 'Продление договоров', patterns: ['продлен', 'пролонгац'] },
  { name: 'Телефонные продажи', patterns: ['телефонн', 'телемаркетинг', 'холодных звон', 'cold call'] },
  { name: 'Переговоры', patterns: ['переговор', 'деловые встречи'] },
  { name: 'Продажи', patterns: ['продаж', 'продавать', 'активные продажи'] },
  { name: 'Страхование', patterns: ['страхован', 'страховой', 'страховых продукт'] },
  { name: 'Работа с клиентами', patterns: ['работа с клиент', 'клиентск', 'клиентами', 'клиентскую баз'] },
  { name: 'План продаж', patterns: ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'] },
  { name: 'CRM', patterns: ['crm', 'битрикс', 'amocrm', 'salesforce'] },
  { name: 'Развитие клиентской базы', patterns: ['развитие клиентской', 'расширение клиентской', 'привлечение клиентов'] },
];

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function detectSkills(text: string) {
  const lower = text.toLowerCase();
  return SKILL_RULES.filter(rule => rule.patterns.some(pattern => lower.includes(pattern))).map(rule => rule.name);
}

function formatMoney(value: number | null, country: Country) {
  if (value === null) return '—';
  const currency = country === 'AZ' ? '₼' : '₽';
  return `${new Intl.NumberFormat(country === 'AZ' ? 'az-AZ' : 'ru-RU').format(Math.round(value))} ${currency}`;
}

function rowTextFromRaw(raw: unknown) {
  if (!raw || typeof raw !== 'object') return '';
  try {
    return JSON.stringify(raw);
  } catch {
    return '';
  }
}

function mapVacancy(row: any, country: Country): MarketRow {
  const text = cleanText([row.name, row.description, row.employer_name, row.area_name, row.experience, row.employment, row.schedule, rowTextFromRaw(row.raw_data)].filter(Boolean).join('\n'));
  const salaryValues = [row.salary_from, row.salary_to].map(Number).filter(Number.isFinite);
  return {
    id: `vacancy-${row.id}`,
    title: row.name ?? 'Вакансия HH',
    region: row.area_name ?? 'Не указан',
    salary: salaryValues.length ? Math.round(salaryValues.reduce((a: number, b: number) => a + b, 0) / salaryValues.length) : null,
    salaryMin: row.salary_from === null ? null : Number(row.salary_from),
    salaryMax: row.salary_to === null ? null : Number(row.salary_to),
    text,
    sourceName: row.employer_name ?? '',
    sourceType: 'vacancies',
    skills: detectSkills(text),
    country,
    automatic: true,
  };
}

function mapResume(row: any, country: Country): MarketRow {
  const text = cleanText([row.title, row.area_name, row.experience, row.employment, row.schedule, rowTextFromRaw(row.raw)].filter(Boolean).join('\n'));
  return {
    id: `resume-${row.id}`,
    title: row.title ?? 'Резюме HH',
    region: row.area_name ?? 'Не указан',
    salary: row.salary === null ? null : Number(row.salary),
    salaryMin: null,
    salaryMax: null,
    text,
    sourceName: '',
    sourceType: 'resumes',
    skills: detectSkills(text),
    country,
    automatic: true,
  };
}

function mapManual(row: any): MarketRow {
  return {
    id: row.id,
    title: row.title,
    region: row.region ?? 'Не указан',
    salary: row.salary === null ? null : Number(row.salary),
    salaryMin: row.salary_min === null ? null : Number(row.salary_min),
    salaryMax: row.salary_max === null ? null : Number(row.salary_max),
    text: row.text ?? '',
    sourceName: row.source_name ?? '',
    sourceType: row.source_type === 'resume' ? 'resumes' : 'vacancies',
    skills: Array.isArray(row.skills) ? row.skills : detectSkills(row.text ?? ''),
    country: 'RU',
    automatic: false,
  };
}

function matchesSkill(row: MarketRow, rule: { name: string; patterns: string[] }) {
  const lower = row.text.toLowerCase();
  return row.skills.includes(rule.name) || rule.patterns.some(pattern => lower.includes(pattern));
}

export function HHMarketCollectorPage() {
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<'all' | SourceType>('vacancies');
  const [country, setCountry] = useState<Country>('RU');
  const [automaticRows, setAutomaticRows] = useState<MarketRow[]>([]);
  const [manualRows, setManualRows] = useState<MarketRow[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    setError('');
    const [vacancyResult, resumeResult, manualResult] = await Promise.all([
      supabase.from('hh_vacancies').select('*').eq('role_key', 'insurance_agent').eq('country', country).order('published_at', { ascending: false }),
      supabase.from('hh_market_resumes').select('*').eq('role_key', 'insurance_agent').eq('country', country).order('published_at', { ascending: false }),
      supabase.from('market_profiles').select('*').order('created_at', { ascending: false }),
    ]);

    const errors = [vacancyResult.error, resumeResult.error, manualResult.error].filter(Boolean);
    if (errors.length) {
      setError(`Не удалось загрузить данные рынка: ${errors.map(item => item?.message).join('; ')}`);
      setAutomaticRows([]);
    } else {
      setAutomaticRows([
        ...(vacancyResult.data ?? []).map(row => mapVacancy(row, country)),
        ...(resumeResult.data ?? []).map(row => mapResume(row, country)),
      ]);
    }
    setManualRows((manualResult.data ?? []).map(mapManual));
    setLoading(false);
  };

  useEffect(() => { void loadRows(); }, [country]);

  const vacancies = useMemo(() => automaticRows.filter(row => row.sourceType === 'vacancies'), [automaticRows]);
  const resumes = useMemo(() => automaticRows.filter(row => row.sourceType === 'resumes'), [automaticRows]);
  const manualVisibleRows = useMemo(() => manualRows.filter(row => row.sourceType === (viewType === 'resumes' ? 'resumes' : 'vacancies')), [manualRows, viewType]);
  const visibleRows = viewType === 'all' ? [...automaticRows, ...manualRows] : [...automaticRows.filter(row => row.sourceType === viewType), ...manualVisibleRows];

  const marketStats = useMemo<SkillMarketStat[]>(() => SKILL_RULES.map(rule => {
    const vacancyRows = vacancies.filter(row => matchesSkill(row, rule));
    const resumeRows = resumes.filter(row => matchesSkill(row, rule));
    if (!vacancyRows.length && !resumeRows.length) return null;
    const salaries = resumeRows.map(row => row.salary).filter((value): value is number => value !== null);
    const vacancyShare = vacancies.length ? Math.round(vacancyRows.length / vacancies.length * 100) : 0;
    const resumeShare = resumes.length ? Math.round(resumeRows.length / resumes.length * 100) : 0;
    return { skill: rule.name, vacancies: vacancyRows.length, vacancyShare, resumes: resumeRows.length, resumeShare, gap: vacancyShare - resumeShare, candidateSalaryMedian: salaries.length ? median(salaries) : null };
  }).filter(Boolean).sort((a, b) => (b?.gap ?? 0) - (a?.gap ?? 0)) as SkillMarketStat[], [vacancies, resumes]);

  const importFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files).filter(file => /\.(html?|txt)$/i.test(file.name) || file.type === 'text/html' || file.type === 'text/plain');
    if (!selected.length) { setError('Выбери сохранённые страницы HH в формате HTML или TXT.'); return; }
    const sourceType: SourceType = viewType === 'resumes' ? 'resumes' : 'vacancies';
    const parsed: MarketRow[] = [];
    for (const file of selected) {
      const text = cleanText(await file.text());
      parsed.push({ id: `${Date.now()}-${Math.random().toString(36).slice(2)}`, title: text.split('\n')[0]?.slice(0, 180) || (sourceType === 'vacancies' ? 'Вакансия HH' : 'Резюме HH'), region: 'Не указан', salary: null, salaryMin: null, salaryMax: null, text, sourceName: file.name, sourceType, skills: detectSkills(text), country, automatic: false });
    }
    setSaving(true);
    const dbType = sourceType === 'vacancies' ? 'vacancy' : 'resume';
    const { data: existing, error: existingError } = await supabase.from('market_profiles').select('source_name').eq('source_type', dbType).in('source_name', parsed.map(row => row.sourceName));
    if (existingError) { setSaving(false); setError(`Не удалось проверить существующие данные: ${existingError.message}`); return; }
    const existingNames = new Set((existing ?? []).map(row => row.source_name));
    const newRows = parsed.filter(row => !existingNames.has(row.sourceName));
    if (!newRows.length) { setSaving(false); setError('Эти файлы уже загружены в ручную выборку.'); return; }
    const { data, error: insertError } = await supabase.from('market_profiles').insert(newRows.map(row => ({ source_type: dbType, source_name: row.sourceName, title: row.title, region: row.region, salary: row.salary, salary_min: row.salaryMin, salary_max: row.salaryMax, text: row.text, skills: row.skills }))).select('*');
    setSaving(false);
    if (insertError) { setError(`Не удалось сохранить данные: ${insertError.message}`); return; }
    setManualRows(prev => [...(data ?? []).map(mapManual), ...prev]);
  };

  const exportCsv = () => {
    const header = ['source_type', 'country', 'title', 'region', 'salary', 'skills', 'text'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...visibleRows.map(row => [row.sourceType === 'vacancies' ? 'vacancy' : 'resume', row.country, row.title, row.region, row.salary?.toString() ?? '', row.skills.join(', '), row.text])].map(row => row.map(escape).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `incore-hh-market-${country}-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const clearManual = async () => {
    const typeToDelete = viewType === 'resumes' ? 'resume' : 'vacancy';
    setError('');
    const { error: deleteError } = await supabase.from('market_profiles').delete().eq('source_type', typeToDelete);
    if (deleteError) { setError(`Не удалось очистить ручную выборку: ${deleteError.message}`); return; }
    setManualRows(prev => prev.filter(row => row.sourceType !== (typeToDelete === 'vacancy' ? 'vacancies' : 'resumes')));
  };

  const vacancyMedian = median(vacancies.map(row => row.salary).filter((value): value is number => value !== null));
  const resumeMedian = median(resumes.map(row => row.salary).filter((value): value is number => value !== null));
  const chartStats = [...marketStats].sort((a, b) => b.gap - a.gap);
  const scarceCount = chartStats.filter(stat => stat.gap >= 20).length;
  const surplusCount = chartStats.filter(stat => stat.gap <= -20).length;
  const balanceCount = chartStats.length - scarceCount - surplusCount;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/ceo/roles/decompose')} className="p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]" aria-label="Назад"><ArrowLeft className="w-5 h-5" /></button>
        <div><h1 className="text-[26px] md:text-3xl font-bold text-[#000052]">Рынок навыков</h1><p className="text-sm text-gray-500 mt-1">Автоматические данные рынка для роли «Страховой агент».</p></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setCountry('RU')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${country === 'RU' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Россия</button>
          <button onClick={() => setCountry('AZ')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${country === 'AZ' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Азербайджан</button>
          <span className="px-3 py-2 text-xs text-gray-500 self-center">Автоматическая база · insurance_agent</span>
        </div>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setViewType('vacancies')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${viewType === 'vacancies' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Вакансии</button>
          <button onClick={() => setViewType('resumes')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${viewType === 'resumes' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Резюме</button>
        </div>
        <label onDragOver={event => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={event => { event.preventDefault(); setDragActive(false); void importFiles(event.dataTransfer.files); }} className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${dragActive ? 'border-[#B8860B] bg-amber-50' : 'border-gray-300 hover:border-[#000052]'}`}>
          <FileUp className="w-9 h-9 mx-auto text-[#000052] mb-3" /><div className="font-semibold text-[#000052]">Загрузить вручную {viewType === 'resumes' ? 'резюме' : 'вакансии'} HH</div><div className="text-sm text-gray-500 mt-1">HTML / HTM / TXT. Ручные записи не смешиваются со счётчиком автоматической базы.</div><input type="file" multiple accept=".html,.htm,.txt,text/html,text/plain" onChange={event => { if (event.target.files) void importFiles(event.target.files); event.target.value = ''; }} className="hidden" />
        </label>
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
        {saving && <div className="text-sm text-gray-500">Сохраняем данные в InCORE…</div>}
        <div className="flex flex-wrap gap-3">
          <button onClick={exportCsv} disabled={!visibleRows.length || saving} className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-[#000052] rounded-xl font-semibold disabled:opacity-40"><Download className="w-4 h-4" /> Скачать CSV</button>
          <button onClick={() => void clearManual()} disabled={!manualVisibleRows.length || saving} className="inline-flex items-center gap-2 px-5 py-3 text-red-600 rounded-xl font-semibold disabled:opacity-40"><Trash2 className="w-4 h-4" /> Очистить ручную выборку</button>
        </div>
      </div>

      {loading ? <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-500">Загружаем автоматические данные рынка…</div> : <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Вакансий в базе</div><div className="text-3xl font-bold text-[#000052] mt-1">{vacancies.length}</div><div className="text-xs text-gray-400 mt-1">автоматическая выгрузка</div></div>
          <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Резюме в базе</div><div className="text-3xl font-bold text-[#000052] mt-1">{resumes.length}</div><div className="text-xs text-gray-400 mt-1">автоматическая выгрузка</div></div>
          <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Медиана вакансий</div><div className="text-3xl font-bold text-[#000052] mt-1">{formatMoney(vacancyMedian, country)}</div></div>
          <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Медиана ожиданий</div><div className="text-3xl font-bold text-[#000052] mt-1">{formatMoney(resumeMedian, country)}</div></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6 md:p-7">
          <div className="flex items-center gap-3 mb-7"><div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center"><BarChart3 className="w-5 h-5 text-[#B8860B]" /></div><div><h2 className="text-lg font-bold text-[#000052]">Рыночный разрыв</h2><p className="text-xs text-gray-400 mt-0.5">Автоматическая база: спрос в вакансиях и предложение в резюме.</p></div></div>
          {!chartStats.length ? <div className="text-sm text-gray-400 py-10 text-center">В автоматической базе пока недостаточно данных.</div> : <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
              <div className="rounded-xl bg-red-50 p-4"><div className="text-xs text-gray-500">Дефицитных навыков</div><div className="text-2xl font-bold text-red-600 mt-1">{scarceCount}</div><div className="text-xs text-gray-500 mt-1">разрыв ≥ +20 п.п.</div></div>
              <div className="rounded-xl bg-amber-50 p-4"><div className="text-xs text-gray-500">Баланс рынка</div><div className="text-2xl font-bold text-[#B8860B] mt-1">{balanceCount}</div><div className="text-xs text-gray-500 mt-1">разрыв от -19 до +19 п.п.</div></div>
              <div className="rounded-xl bg-blue-50 p-4"><div className="text-xs text-gray-500">Профицитных навыков</div><div className="text-2xl font-bold text-[#46618C] mt-1">{surplusCount}</div><div className="text-xs text-gray-500 mt-1">разрыв ≤ -20 п.п.</div></div>
            </div>
            <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-xs text-gray-400 border-b"><th className="py-3 pr-4">Навык</th><th className="py-3 pr-4">Вакансии</th><th className="py-3 pr-4">Резюме</th><th className="py-3 pr-4">Разрыв</th><th className="py-3">Медиана ожиданий</th></tr></thead><tbody>{chartStats.map(stat => <tr key={stat.skill} className="border-b last:border-0"><td className="py-3 pr-4 font-semibold text-[#000052]">{stat.skill}</td><td className="py-3 pr-4">{stat.vacancies} <span className="text-gray-400">({stat.vacancyShare}%)</span></td><td className="py-3 pr-4">{stat.resumes} <span className="text-gray-400">({stat.resumeShare}%)</span></td><td className={`py-3 pr-4 font-bold ${stat.gap >= 20 ? 'text-red-600' : stat.gap <= -20 ? 'text-[#46618C]' : 'text-[#B8860B]'}`}>{stat.gap > 0 ? '+' : ''}{stat.gap} п.п.</td><td className="py-3">{formatMoney(stat.candidateSalaryMedian, country)}</td></tr>)}</tbody></table></div>
          </>}
        </div>
      </>}
    </div>
  );
}
