import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Download, FileUp, Trash2, TrendingUp } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

type SourceType = 'vacancies' | 'resumes';
type DbSourceType = 'vacancy' | 'resume';

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
  { name: 'Корпоративные продажи', patterns: ['b2b', 'b2б', 'корпоративн', 'юридическ', 'корпоративных клиентов'] },
  { name: 'Кросс-продажи', patterns: ['кросс-продаж', 'cross-sell', 'cross sell', 'crosssell', 'допродаж'] },
  { name: 'Продление договоров', patterns: ['продлен', 'пролонгац'] },
  { name: 'Телефонные продажи', patterns: ['телефонн', 'телемаркетинг', 'холодных звон', 'cold call'] },
  { name: 'Переговоры', patterns: ['переговор', 'деловые встречи'] },
  { name: 'Продажи', patterns: ['продаж', 'продавать', 'активные продажи'] },
  { name: 'Страхование', patterns: ['страхован', 'страховой', 'страховых продукт'] },
  { name: 'Работа с клиентами', patterns: ['работа с клиент', 'клиентск', 'клиентами', 'клиентскую баз', 'консультирование клиентов'] },
  { name: 'План продаж', patterns: ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'] },
  { name: 'CRM', patterns: ['crm', 'битрикс', 'amocrm', 'salesforce'] },
  { name: 'Развитие клиентской базы', patterns: ['развитие клиентской', 'расширение клиентской', 'привлечение клиентов'] },
];

const KNOWN_REGIONS = [
  'Москва', 'Санкт-Петербург', 'Московская область', 'Краснодар', 'Сочи', 'Екатеринбург',
  'Казань', 'Новосибирск', 'Ростов-на-Дону', 'Нижний Новгород', 'Самара', 'Воронеж',
  'Красноярск', 'Пермь', 'Уфа', 'Омск', 'Баку', 'Астана', 'Удалённая работа', 'Удаленная работа',
];

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function formatMoney(value: number | null) {
  return value === null ? '—' : `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function cleanText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function extractSalary(text: string): number | null {
  const normalized = text.replace(/\u00a0/g, ' ');
  const values: number[] = [];
  for (const match of normalized.matchAll(/([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)?\s*[-–—]\s*([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)/gi)) {
    const a = Number(match[1].replace(/\s/g, ''));
    const b = Number(match[2].replace(/\s/g, ''));
    const aa = a < 10000 ? a * 1000 : a;
    const bb = b < 10000 ? b * 1000 : b;
    if (Number.isFinite(aa) && Number.isFinite(bb) && aa >= 20000 && bb <= 1000000) values.push((aa + bb) / 2);
  }
  if (values.length) return Math.round(median(values) ?? values[0]);
  for (const match of normalized.matchAll(/(?:от|до|зарплата|оклад)?\s*([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)/gi)) {
    const value = Number(match[1].replace(/\s/g, ''));
    const normalizedValue = value < 10000 ? value * 1000 : value;
    if (Number.isFinite(normalizedValue) && normalizedValue >= 20000 && normalizedValue <= 1000000) values.push(normalizedValue);
  }
  return values.length ? median(values) : null;
}

function extractRegion(text: string) {
  const lower = text.toLowerCase();
  return KNOWN_REGIONS.find(region => lower.includes(region.toLowerCase())) ?? 'Не указан';
}

function detectSkills(text: string) {
  const lower = text.toLowerCase();
  return SKILL_RULES.filter(rule => rule.patterns.some(pattern => lower.includes(pattern))).map(rule => rule.name);
}

function extractTitle(document: Document, text: string, sourceType: SourceType) {
  const selectors = sourceType === 'vacancies'
    ? ['h1', '[data-qa*="vacancy-title"]', '[data-qa*="vacancy-name"]', 'meta[property="og:title"]']
    : ['h1', '[data-qa*="resume-title"]', '[data-qa*="resume-name"]', 'meta[property="og:title"]'];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const value = element?.getAttribute('content') || element?.textContent || '';
    const title = cleanText(value);
    if (title && !/^(вакансия|резюме)$/i.test(title)) return title.slice(0, 180);
  }
  const firstLine = text.split('\n').map(cleanText).find(line => line.length >= 4 && line.length <= 180);
  return firstLine || (sourceType === 'vacancies' ? 'Вакансия HH' : 'Резюме HH');
}

function parseFile(content: string, fileName: string, sourceType: SourceType): MarketRow {
  let text = content;
  let title = '';
  if (/\.html?$/i.test(fileName)) {
    const document = new DOMParser().parseFromString(content, 'text/html');
    document.querySelectorAll('script, style, noscript, svg').forEach(node => node.remove());
    text = cleanText(document.body?.innerText || document.documentElement?.textContent || '');
    title = extractTitle(document, text, sourceType);
  } else {
    text = cleanText(content);
    title = text.split('\n').map(cleanText).find(line => line.length >= 4 && line.length <= 180) || '';
  }
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: title || (sourceType === 'vacancies' ? 'Вакансия HH' : 'Резюме HH'),
    region: extractRegion(text), salary: extractSalary(text), salaryMin: null, salaryMax: null,
    text, sourceName: fileName, sourceType, skills: detectSkills(text),
  };
}

function mapDbRow(row: any): MarketRow {
  return {
    id: row.id, title: row.title, region: row.region ?? 'Не указан',
    salary: row.salary === null ? null : Number(row.salary),
    salaryMin: row.salary_min === null ? null : Number(row.salary_min),
    salaryMax: row.salary_max === null ? null : Number(row.salary_max),
    text: row.text ?? '', sourceName: row.source_name ?? '',
    sourceType: row.source_type === 'resume' ? 'resumes' : 'vacancies',
    skills: Array.isArray(row.skills) ? row.skills : detectSkills(row.text ?? ''),
  };
}

function matchesSkill(row: MarketRow, rule: { name: string; patterns: string[] }) {
  const lower = row.text.toLowerCase();
  return row.skills.includes(rule.name) || rule.patterns.some(pattern => lower.includes(pattern));
}

export function HHMarketCollectorPage() {
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<'all' | SourceType>('all');
  const [allRows, setAllRows] = useState<MarketRow[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRows = async () => {
    setLoading(true); setError('');
    const { data, error: loadError } = await supabase.from('market_profiles').select('*').order('created_at', { ascending: false });
    if (loadError) { setError(`Не удалось загрузить сохранённые данные: ${loadError.message}`); setAllRows([]); }
    else setAllRows((data ?? []).map(mapDbRow));
    setLoading(false);
  };

  useEffect(() => { void loadRows(); }, []);

  const vacancies = useMemo(() => allRows.filter(row => row.sourceType === 'vacancies'), [allRows]);
  const resumes = useMemo(() => allRows.filter(row => row.sourceType === 'resumes'), [allRows]);
  const visibleRows = viewType === 'all' ? allRows : allRows.filter(row => row.sourceType === viewType);

  const marketStats = useMemo<SkillMarketStat[]>(() => SKILL_RULES.map(rule => {
    const vacancyRows = vacancies.filter(row => matchesSkill(row, rule));
    const resumeRows = resumes.filter(row => matchesSkill(row, rule));
    if (!vacancyRows.length && !resumeRows.length) return null;
    const salaries = resumeRows.map(row => row.salary).filter((value): value is number => value !== null);
    const vacancyShare = vacancies.length ? Math.round(vacancyRows.length / vacancies.length * 100) : 0;
    const resumeShare = resumes.length ? Math.round(resumeRows.length / resumes.length * 100) : 0;
    return { skill: rule.name, vacancies: vacancyRows.length, vacancyShare, resumes: resumeRows.length, resumeShare, gap: vacancyShare - resumeShare, candidateSalaryMedian: salaries.length ? median(salaries) : null };
  }).filter(Boolean).sort((a, b) => (b?.gap ?? 0) - (a?.gap ?? 0)) as SkillMarketStat[], [vacancies, resumes]);

  const highDemand = marketStats.filter(stat => stat.vacancyShare >= 50);
  const scarceSkills = marketStats.filter(stat => stat.gap >= 20).slice(0, 5);
  const topSalarySkill = [...marketStats].filter(stat => stat.candidateSalaryMedian !== null).sort((a, b) => (b.candidateSalaryMedian ?? 0) - (a.candidateSalaryMedian ?? 0))[0] ?? null;
  const chartStats = [...marketStats].sort((a, b) => b.vacancyShare - a.vacancyShare).slice(0, 8);

  const importFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files).filter(file => /\.(html?|txt)$/i.test(file.name) || file.type === 'text/html' || file.type === 'text/plain');
    if (!selected.length) { setError('Выбери сохранённые страницы HH в формате HTML или TXT.'); return; }
    const sourceType: SourceType = viewType === 'resumes' ? 'resumes' : 'vacancies';
    const parsed: MarketRow[] = [];
    for (const file of selected) { try { parsed.push(parseFile(await file.text(), file.name, sourceType)); } catch { /* skip */ } }
    if (!parsed.length) { setError('Не удалось прочитать выбранные файлы.'); return; }

    setSaving(true);
    const dbType: DbSourceType = sourceType === 'vacancies' ? 'vacancy' : 'resume';
    const { data: existing, error: existingError } = await supabase.from('market_profiles').select('source_name').eq('source_type', dbType).in('source_name', parsed.map(row => row.sourceName));
    if (existingError) { setSaving(false); setError(`Не удалось проверить существующие данные: ${existingError.message}`); return; }
    const existingNames = new Set((existing ?? []).map(row => row.source_name));
    const newRows = parsed.filter(row => !existingNames.has(row.sourceName));
    if (!newRows.length) { setSaving(false); setError('Эти файлы уже загружены в выборку.'); return; }

    const payload = newRows.map(row => ({ source_type: dbType, source_name: row.sourceName, title: row.title, region: row.region, salary: row.salary, salary_min: row.salaryMin, salary_max: row.salaryMax, text: row.text, skills: row.skills }));
    const { data, error: insertError } = await supabase.from('market_profiles').insert(payload).select('*');
    setSaving(false);
    if (insertError) { setError(`Не удалось сохранить данные: ${insertError.message}`); return; }
    setAllRows(prev => [...(data ?? []).map(mapDbRow), ...prev]);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => { if (event.target.files) void importFiles(event.target.files); event.target.value = ''; };

  const exportCsv = () => {
    const header = ['source_type', 'title', 'region', 'salary', 'skills', 'text'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...visibleRows.map(row => [row.sourceType === 'vacancies' ? 'vacancy' : 'resume', row.title, row.region, row.salary?.toString() ?? '', row.skills.join(', '), row.text])].map(row => row.map(escape).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob); const link = document.createElement('a'); link.href = url; link.download = `incore-hh-market-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const clear = async () => {
    const typeToDelete = viewType === 'resumes' ? 'resume' : viewType === 'vacancies' ? 'vacancy' : null;
    if (!typeToDelete) { setError('Для безопасности очистка выполняется отдельно для вакансий или резюме.'); return; }
    setError('');
    const { error: deleteError } = await supabase.from('market_profiles').delete().eq('source_type', typeToDelete);
    if (deleteError) { setError(`Не удалось очистить данные: ${deleteError.message}`); return; }
    setAllRows(prev => prev.filter(row => row.sourceType !== (typeToDelete === 'vacancy' ? 'vacancies' : 'resumes')));
  };

  const vacancyMedian = median(vacancies.map(row => row.salary).filter((value): value is number => value !== null));
  const resumeMedian = median(resumes.map(row => row.salary).filter((value): value is number => value !== null));

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/ceo/roles/decompose')} className="p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]" aria-label="Назад"><ArrowLeft className="w-5 h-5" /></button>
        <div><h1 className="text-[26px] md:text-3xl font-bold text-[#000052]">Рынок навыков</h1><p className="text-sm text-gray-500 mt-1">Спрос и предложение для роли «Страховой агент».</p></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setViewType('all')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${viewType === 'all' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Рынок</button>
          <button onClick={() => setViewType('vacancies')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${viewType === 'vacancies' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Вакансии</button>
          <button onClick={() => setViewType('resumes')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${viewType === 'resumes' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Резюме</button>
        </div>
        <label onDragOver={event => { event.preventDefault(); setDragActive(true); }} onDragLeave={() => setDragActive(false)} onDrop={event => { event.preventDefault(); setDragActive(false); void importFiles(event.dataTransfer.files); }} className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${dragActive ? 'border-[#B8860B] bg-amber-50' : 'border-gray-300 hover:border-[#000052]'}`}>
          <FileUp className="w-9 h-9 mx-auto text-[#000052] mb-3" /><div className="font-semibold text-[#000052]">Загрузить {viewType === 'resumes' ? 'резюме' : 'вакансии'} HH</div><div className="text-sm text-gray-500 mt-1">HTML / HTM / TXT. Один файл = одна запись.</div><input type="file" multiple accept=".html,.htm,.txt,text/html,text/plain" onChange={handleFileInput} className="hidden" />
        </label>
        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}{saving && <div className="text-sm text-gray-500">Сохраняем данные в InCORE…</div>}
        <div className="flex flex-wrap gap-3"><button onClick={exportCsv} disabled={!visibleRows.length || saving} className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-[#000052] rounded-xl font-semibold disabled:opacity-40"><Download className="w-4 h-4" /> Скачать CSV</button>{viewType !== 'all' && <button onClick={() => void clear()} disabled={!visibleRows.length || saving} className="inline-flex items-center gap-2 px-5 py-3 text-red-600 rounded-xl font-semibold disabled:opacity-40"><Trash2 className="w-4 h-4" /> Очистить выборку</button>}</div>
      </div>

      {loading ? <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-500">Загружаем сохранённую выборку…</div> : <>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Вакансий</div><div className="text-3xl font-bold text-[#000052] mt-1">{vacancies.length}</div></div>
          <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Резюме</div><div className="text-3xl font-bold text-[#000052] mt-1">{resumes.length}</div></div>
          <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Медиана вакансий</div><div className="text-3xl font-bold text-[#000052] mt-1">{formatMoney(vacancyMedian)}</div></div>
          <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Медиана ожиданий</div><div className="text-3xl font-bold text-[#000052] mt-1">{formatMoney(resumeMedian)}</div></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6">
          <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Карта рынка навыков</h2></div>
          <p className="text-sm text-gray-500 mb-6">Сравнение того, как часто навык требуется в вакансиях и как часто он указан в резюме.</p>
          {!chartStats.length ? <div className="text-sm text-gray-400 py-6 text-center">Загрузи вакансии и резюме, чтобы увидеть инфографику.</div> : <div className="space-y-5">
            {chartStats.map(stat => <div key={stat.skill}>
              <div className="flex items-center justify-between gap-4 mb-2"><span className="text-sm font-semibold text-[#000052]">{stat.skill}</span><span className={`text-xs font-bold ${stat.gap >= 20 ? 'text-red-600' : stat.gap <= -20 ? 'text-blue-600' : 'text-gray-500'}`}>{stat.gap > 0 ? '+' : ''}{stat.gap} п.п.</span></div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-3"><span className="w-20 text-xs text-gray-500">Вакансии</span><div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#000052] rounded-full" style={{ width: `${stat.vacancyShare}%` }} /></div><span className="w-10 text-right text-xs font-semibold">{stat.vacancyShare}%</span></div>
                <div className="flex items-center gap-3"><span className="w-20 text-xs text-gray-500">Резюме</span><div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#B8860B] rounded-full" style={{ width: `${stat.resumeShare}%` }} /></div><span className="w-10 text-right text-xs font-semibold">{stat.resumeShare}%</span></div>
              </div>
            </div>)}
          </div>}
          <div className="flex flex-wrap gap-5 mt-6 pt-4 border-t text-xs text-gray-500"><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#000052]" /> Спрос</span><span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#B8860B]" /> Предложение</span><span>Красный разрыв = дефицит навыка</span></div>
        </div>

        <div className="bg-white rounded-2xl shadow-sm p-6"><div className="flex items-center gap-2 mb-2"><TrendingUp className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Рыночный разрыв</h2></div><p className="text-sm text-gray-500 mb-4">Показывает, где компании ищут навыки чаще, чем кандидаты указывают их в резюме.</p>
          {!marketStats.length ? <div className="text-sm text-gray-400 py-6 text-center">Недостаточно данных.</div> : <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b text-left text-gray-500"><th className="py-3 pr-4">Навык</th><th className="py-3 pr-4">Спрос</th><th className="py-3 pr-4">Предложение</th><th className="py-3 pr-4">Разрыв</th><th className="py-3">Медиана ожиданий</th></tr></thead><tbody>{marketStats.map(stat => <tr key={stat.skill} className="border-b last:border-0"><td className="py-3 pr-4 font-semibold text-[#000052]">{stat.skill}</td><td className="py-3 pr-4">{stat.vacancyShare}%</td><td className="py-3 pr-4">{stat.resumeShare}%</td><td className={`py-3 pr-4 font-bold ${stat.gap >= 20 ? 'text-red-600' : stat.gap <= -20 ? 'text-blue-600' : 'text-gray-600'}`}>{stat.gap > 0 ? '+' : ''}{stat.gap} п.п.</td><td className="py-3">{formatMoney(stat.candidateSalaryMedian)}</td></tr>)}</tbody></table></div>}
        </div>

        {!!marketStats.length && <div className="bg-white rounded-2xl shadow-sm p-6 space-y-4"><h2 className="text-lg font-bold text-[#000052]">Что это значит для CEO</h2><div className="grid grid-cols-1 md:grid-cols-3 gap-4"><div className="rounded-xl bg-red-50 p-4"><div className="text-sm text-gray-500">Дефицитные навыки</div><div className="font-bold text-[#000052] mt-1">{scarceSkills.length ? scarceSkills.map(stat => stat.skill).join(', ') : 'Не выявлены'}</div><div className="text-sm mt-1">Разрыв спроса и предложения от 20 п.п.</div></div><div className="rounded-xl bg-blue-50 p-4"><div className="text-sm text-gray-500">Ядро спроса</div><div className="font-bold text-[#000052] mt-1">{highDemand.length ? highDemand.map(stat => stat.skill).join(', ') : 'Пока не выделено'}</div><div className="text-sm mt-1">Требуются минимум в 50% вакансий.</div></div><div className="rounded-xl bg-amber-50 p-4"><div className="text-sm text-gray-500">Самая высокая стоимость</div><div className="font-bold text-[#000052] mt-1">{topSalarySkill?.skill ?? 'Недостаточно данных'}</div><div className="text-sm mt-1">{topSalarySkill ? formatMoney(topSalarySkill.candidateSalaryMedian) : 'Нужны резюме с зарплатой'}</div></div></div><div className="text-sm text-gray-700 space-y-2"><p><b>Вывод:</b> положительный разрыв означает дефицит навыка на рынке, отрицательный — кандидатов с этим навыком относительно больше.</p><p><b>Для найма:</b> дефицитные навыки стоит учитывать при формировании профиля роли, обучении и оценке привлекательности предложения.</p></div></div>}
      </>}
    </div>
  );
}
