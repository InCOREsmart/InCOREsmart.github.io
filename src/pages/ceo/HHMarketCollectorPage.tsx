import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Download, FileUp, Trash2 } from 'lucide-react';
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
  };
}

function matchesSkill(row: MarketRow, rule: { name: string; patterns: string[] }) {
  const lower = row.text.toLowerCase();
  return row.skills.includes(rule.name) || rule.patterns.some(pattern => lower.includes(pattern));
}

export function HHMarketCollectorPage() {
  const navigate = useNavigate();
  const [viewType, setViewType] = useState<'all' | SourceType>('vacancies');
  const [allRows, setAllRows] = useState<MarketRow[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const loadRows = async () => {
    setLoading(true);
    setError('');
    const { data, error: loadError } = await supabase
      .from('market_profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (loadError) {
      setError(`Не удалось загрузить сохранённые данные: ${loadError.message}`);
      setAllRows([]);
    } else {
      setAllRows((data ?? []).map(mapDbRow));
    }
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

    const salaries = resumeRows
      .map(row => row.salary)
      .filter((value): value is number => value !== null);

    const vacancyShare = vacancies.length ? Math.round(vacancyRows.length / vacancies.length * 100) : 0;
    const resumeShare = resumes.length ? Math.round(resumeRows.length / resumes.length * 100) : 0;

    return {
      skill: rule.name,
      vacancies: vacancyRows.length,
      vacancyShare,
      resumes: resumeRows.length,
      resumeShare,
      gap: vacancyShare - resumeShare,
      candidateSalaryMedian: salaries.length ? median(salaries) : null,
    };
  }).filter(Boolean).sort((a, b) => (b?.gap ?? 0) - (a?.gap ?? 0)) as SkillMarketStat[], [vacancies, resumes]);

  const importFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files).filter(file =>
      /\.(html?|txt)$/i.test(file.name) || file.type === 'text/html' || file.type === 'text/plain'
    );

    if (!selected.length) {
      setError('Выбери сохранённые страницы HH в формате HTML или TXT.');
      return;
    }

    const sourceType: SourceType = viewType === 'resumes' ? 'resumes' : 'vacancies';
    const parsed: MarketRow[] = [];

    for (const file of selected) {
      try {
        parsed.push(parseFile(await file.text(), file.name, sourceType));
      } catch {
        // Skip unreadable files.
      }
    }

    if (!parsed.length) {
      setError('Не удалось прочитать выбранные файлы.');
      return;
    }

    setSaving(true);
    const dbType: DbSourceType = sourceType === 'vacancies' ? 'vacancy' : 'resume';
    const { data: existing, error: existingError } = await supabase
      .from('market_profiles')
      .select('source_name')
      .eq('source_type', dbType)
      .in('source_name', parsed.map(row => row.sourceName));

    if (existingError) {
      setSaving(false);
      setError(`Не удалось проверить существующие данные: ${existingError.message}`);
      return;
    }

    const existingNames = new Set((existing ?? []).map(row => row.source_name));
    const newRows = parsed.filter(row => !existingNames.has(row.sourceName));

    if (!newRows.length) {
      setSaving(false);
      setError('Эти файлы уже загружены в выборку.');
      return;
    }

    const payload = newRows.map(row => ({
      source_type: dbType,
      source_name: row.sourceName,
      title: row.title,
      region: row.region,
      salary: row.salary,
      salary_min: row.salaryMin,
      salary_max: row.salaryMax,
      text: row.text,
      skills: row.skills,
    }));

    const { data, error: insertError } = await supabase
      .from('market_profiles')
      .insert(payload)
      .select('*');

    setSaving(false);

    if (insertError) {
      setError(`Не удалось сохранить данные: ${insertError.message}`);
      return;
    }

    setAllRows(prev => [...(data ?? []).map(mapDbRow), ...prev]);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void importFiles(event.target.files);
    event.target.value = '';
  };

  const exportCsv = () => {
    const header = ['source_type', 'title', 'region', 'salary', 'skills', 'text'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [
      header,
      ...visibleRows.map(row => [
        row.sourceType === 'vacancies' ? 'vacancy' : 'resume',
        row.title,
        row.region,
        row.salary?.toString() ?? '',
        row.skills.join(', '),
        row.text,
      ]),
    ].map(row => row.map(escape).join(';')).join('\n');

    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incore-hh-market-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clear = async () => {
    const typeToDelete = viewType === 'resumes' ? 'resume' : viewType === 'vacancies' ? 'vacancy' : null;
    if (!typeToDelete) {
      setError('Для безопасности очистка выполняется отдельно для вакансий или резюме.');
      return;
    }

    setError('');
    const { error: deleteError } = await supabase
      .from('market_profiles')
      .delete()
      .eq('source_type', typeToDelete);

    if (deleteError) {
      setError(`Не удалось очистить данные: ${deleteError.message}`);
      return;
    }

    setAllRows(prev => prev.filter(row => row.sourceType !== (typeToDelete === 'vacancy' ? 'vacancies' : 'resumes')));
  };

  const vacancyMedian = median(vacancies.map(row => row.salary).filter((value): value is number => value !== null));
  const resumeMedian = median(resumes.map(row => row.salary).filter((value): value is number => value !== null));

  const chartStats = [...marketStats].sort((a, b) => b.gap - a.gap);
  const maxAbsGap = Math.max(...chartStats.map(stat => Math.abs(stat.gap)), 10);
  const maxSalary = Math.max(...chartStats.map(stat => stat.candidateSalaryMedian ?? 0), 0);
  const scarceCount = chartStats.filter(stat => stat.gap >= 20).length;
  const surplusCount = chartStats.filter(stat => stat.gap <= -20).length;
  const balanceCount = chartStats.length - scarceCount - surplusCount;
  const highDemand = chartStats.filter(stat => stat.vacancyShare >= 50);
  const topSalarySkill = [...chartStats]
    .filter(stat => stat.candidateSalaryMedian !== null)
    .sort((a, b) => (b.candidateSalaryMedian ?? 0) - (a.candidateSalaryMedian ?? 0))[0] ?? null;

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/ceo/roles/decompose')}
          className="p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[26px] md:text-3xl font-bold text-[#000052]">Рынок навыков</h1>
          <p className="text-sm text-gray-500 mt-1">Спрос и предложение для роли «Страховой агент».</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setViewType('vacancies')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${viewType === 'vacancies' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Вакансии</button>
          <button onClick={() => setViewType('resumes')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${viewType === 'resumes' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Резюме</button>
        </div>

        <label
          onDragOver={event => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={event => { event.preventDefault(); setDragActive(false); void importFiles(event.dataTransfer.files); }}
          className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${dragActive ? 'border-[#B8860B] bg-amber-50' : 'border-gray-300 hover:border-[#000052]'}`}
        >
          <FileUp className="w-9 h-9 mx-auto text-[#000052] mb-3" />
          <div className="font-semibold text-[#000052]">Загрузить {viewType === 'resumes' ? 'резюме' : 'вакансии'} HH</div>
          <div className="text-sm text-gray-500 mt-1">HTML / HTM / TXT. Один файл = одна запись.</div>
          <input type="file" multiple accept=".html,.htm,.txt,text/html,text/plain" onChange={handleFileInput} className="hidden" />
        </label>

        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
        {saving && <div className="text-sm text-gray-500">Сохраняем данные в InCORE…</div>}

        <div className="flex flex-wrap gap-3">
          <button onClick={exportCsv} disabled={!visibleRows.length || saving} className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-[#000052] rounded-xl font-semibold disabled:opacity-40">
            <Download className="w-4 h-4" /> Скачать CSV
          </button>
          {viewType !== 'all' && (
            <button onClick={() => void clear()} disabled={!visibleRows.length || saving} className="inline-flex items-center gap-2 px-5 py-3 text-red-600 rounded-xl font-semibold disabled:opacity-40">
              <Trash2 className="w-4 h-4" /> Очистить выборку
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-500">Загружаем сохранённую выборку…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Вакансий</div><div className="text-3xl font-bold text-[#000052] mt-1">{vacancies.length}</div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Резюме</div><div className="text-3xl font-bold text-[#000052] mt-1">{resumes.length}</div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Медиана вакансий</div><div className="text-3xl font-bold text-[#000052] mt-1">{formatMoney(vacancyMedian)}</div></div>
            <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Медиана ожиданий</div><div className="text-3xl font-bold text-[#000052] mt-1">{formatMoney(resumeMedian)}</div></div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm p-6 md:p-7">
            <div className="flex items-start justify-between gap-4 mb-7">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0">
                  <BarChart3 className="w-5 h-5 text-[#B8860B]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#000052]">Рыночный разрыв</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Карта рынка навыков: дефицит, баланс, профицит и стоимость</p>
                </div>
              </div>
              {chartStats.length > 0 && (
                <div className="hidden lg:flex items-center gap-4 text-xs text-gray-500">
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-red-500" /> Дефицит</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#B8860B]" /> Баланс</span>
                  <span className="inline-flex items-center gap-1.5"><span className="w-3 h-3 rounded-sm bg-[#46618C]" /> Профицит</span>
                </div>
              )}
            </div>

            {!chartStats.length ? (
              <div className="text-sm text-gray-400 py-10 text-center">Загрузи вакансии и резюме, чтобы увидеть инфографику.</div>
            ) : (
              <>
                <div className="overflow-x-auto pb-8">
                  <div className="min-w-[980px]">
                    <div className="grid grid-cols-[64px_1fr] gap-3">
                      <div className="relative h-[470px] text-[10px] text-gray-400">
                        <span className="absolute top-0 right-0">+{maxAbsGap} п.п.</span>
                        <span className="absolute top-1/2 -translate-y-1/2 right-0">0</span>
                        <span className="absolute bottom-0 right-0">-{maxAbsGap} п.п.</span>
                      </div>

                      <div className="relative h-[470px]">
                        <div className="absolute left-0 right-0 top-1/2 border-t-2 border-[#000052]/20 z-10" />
                        <div className="absolute left-0 right-0 top-1/4 border-t border-dashed border-gray-100" />
                        <div className="absolute left-0 right-0 top-3/4 border-t border-dashed border-gray-100" />

                        <div className="absolute inset-0 flex items-stretch gap-3">
                          {chartStats.map(stat => {
                            const isDeficit = stat.gap >= 20;
                            const isSurplus = stat.gap <= -20;
                            const isBalance = !isDeficit && !isSurplus;
                            const color = isDeficit ? '#dc2626' : isSurplus ? '#46618C' : '#B8860B';
                            const barHeight = Math.max((Math.abs(stat.gap) / maxAbsGap) * 205, stat.gap === 0 ? 3 : 8);
                            const salaryLabel = stat.candidateSalaryMedian !== null ? formatMoney(stat.candidateSalaryMedian) : '—';

                            return (
                              <div key={stat.skill} className="relative flex-1 min-w-[70px] group">
                                <div
                                  className="absolute left-1/2 -translate-x-1/2 w-[72%] rounded-lg transition-all duration-500 group-hover:opacity-80"
                                  style={stat.gap >= 0
                                    ? { bottom: '50%', height: `${barHeight}px`, background: color }
                                    : { top: '50%', height: `${barHeight}px`, background: color, borderRadius: '8px' }}
                                >
                                  <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-white text-[11px] font-bold">
                                    {stat.gap > 0 ? '+' : ''}{stat.gap}
                                  </div>
                                </div>

                                <div
                                  className="absolute left-1/2 -translate-x-1/2 z-20 whitespace-nowrap text-xs font-bold"
                                  style={stat.gap >= 0
                                    ? { bottom: `calc(50% + ${barHeight + 8}px)`, color }
                                    : { top: `calc(50% + ${barHeight + 8}px)`, color }}
                                >
                                  {stat.gap > 0 ? '+' : ''}{stat.gap} п.п.
                                </div>

                                <div className="absolute left-1/2 -translate-x-1/2 top-[calc(50%+8px)] hidden group-hover:block z-30 w-56 pointer-events-none">
                                  <div className="bg-[#000052] text-white rounded-xl p-3 shadow-xl text-xs">
                                    <div className="font-bold mb-2">{stat.skill}</div>
                                    <div className="flex justify-between mb-1"><span className="text-white/65">Спрос</span><b>{stat.vacancyShare}%</b></div>
                                    <div className="flex justify-between mb-1"><span className="text-white/65">Предложение</span><b>{stat.resumeShare}%</b></div>
                                    <div className="flex justify-between mb-1"><span className="text-white/65">Разрыв</span><b>{stat.gap > 0 ? '+' : ''}{stat.gap} п.п.</b></div>
                                    <div className="flex justify-between pt-2 mt-2 border-t border-white/10"><span className="text-white/65">Медиана ожиданий</span><b>{salaryLabel}</b></div>
                                  </div>
                                </div>

                                <div className="absolute left-0 right-0 top-[calc(100%+12px)] text-center px-1">
                                  <div className="text-[11px] font-semibold leading-tight text-[#000052] min-h-[30px]">{stat.skill}</div>
                                  <div className="mt-1 text-[10px] text-gray-400">Спрос {stat.vacancyShare}%</div>
                                  <div className="text-[10px] text-gray-400">Предложение {stat.resumeShare}%</div>
                                  <div className="text-[10px] font-semibold mt-1" style={{ color }}>
                                    {isDeficit ? 'Дефицит' : isSurplus ? 'Профицит' : 'Баланс'}
                                  </div>
                                  {stat.candidateSalaryMedian !== null && (
                                    <div className="text-[10px] text-[#000052] mt-0.5">{formatMoney(stat.candidateSalaryMedian)}</div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-2">
                  <div className="rounded-xl bg-red-50 p-4">
                    <div className="text-xs text-gray-500">Дефицитных навыков</div>
                    <div className="text-2xl font-bold text-red-600 mt-1">{scarceCount}</div>
                    <div className="text-xs text-gray-500 mt-1">разрыв ≥ +20 п.п.</div>
                  </div>
                  <div className="rounded-xl bg-amber-50 p-4">
                    <div className="text-xs text-gray-500">Баланс рынка</div>
                    <div className="text-2xl font-bold text-[#B8860B] mt-1">{balanceCount}</div>
                    <div className="text-xs text-gray-500 mt-1">разрыв от -19 до +19 п.п.</div>
                  </div>
                  <div className="rounded-xl bg-blue-50 p-4">
                    <div className="text-xs text-gray-500">Профицитных навыков</div>
                    <div className="text-2xl font-bold text-[#46618C] mt-1">{surplusCount}</div>
                    <div className="text-xs text-gray-500 mt-1">разрыв ≤ -20 п.п.</div>
                  </div>
                </div>

                <div className="mt-4 p-4 rounded-xl bg-[#F4F5F7] grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <div className="text-xs text-gray-500">Ядро спроса</div>
                    <div className="font-semibold text-[#000052] mt-1">{highDemand.length ? highDemand.map(stat => stat.skill).join(', ') : 'Не выделено'}</div>
                    <div className="text-xs text-gray-400 mt-1">Навык нужен минимум в 50% вакансий</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Самая высокая стоимость</div>
                    <div className="font-semibold text-[#000052] mt-1">{topSalarySkill?.skill ?? 'Недостаточно данных'}</div>
                    <div className="text-xs text-gray-400 mt-1">{topSalarySkill ? formatMoney(topSalarySkill.candidateSalaryMedian) : 'Нужны резюме с зарплатой'}</div>
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">Максимальный дефицит</div>
                    <div className="font-semibold text-red-600 mt-1">{chartStats[0]?.skill ?? 'Недостаточно данных'}</div>
                    <div className="text-xs text-gray-400 mt-1">{chartStats[0] ? `+${chartStats[0].gap} п.п. спроса` : '—'}</div>
                  </div>
                </div>

                <div className="mt-4 text-xs text-gray-500 flex flex-wrap gap-x-6 gap-y-2">
                  <span>Высота столбца = величина рыночного разрыва</span>
                  <span>Выше нулевой линии = дефицит</span>
                  <span>Ниже нулевой линии = профицит</span>
                  <span>Наведение = полный анализ навыка</span>
                </div>
              </>
            )}
          </div>
        </>
      )}
    </div>
  );
}
