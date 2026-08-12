import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Download,
  FileUp,
  Trash2,
  TrendingDown,
  TrendingUp,
  Minus,
  Target,
  DollarSign,
  Users,
  Briefcase,
  Award,
  Zap,
  MapPin,
} from 'lucide-react';
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

const REGION_SHORT: Record<string, string> = {
  Москва: 'МСК', 'Санкт-Петербург': 'СПб', 'Московская область': 'МО', Краснодар: 'КРД',
  Сочи: 'Сочи', Екатеринбург: 'ЕКТ', Казань: 'КЗН', Новосибирск: 'НСК',
  'Ростов-на-Дону': 'РнД', 'Нижний Новгород': 'НН', Самара: 'СМР', Воронеж: 'ВРН',
  Красноярск: 'КРЯ', Пермь: 'ПРМ', Уфа: 'Уфа', Омск: 'ОМСК', Баку: 'Баку',
  Астана: 'АСТ', 'Удалённая работа': 'Remote', 'Удаленная работа': 'Remote',
};

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function formatMoney(value: number | null) {
  return value === null ? '—' : `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`;
}

function formatMoneyShort(value: number | null) {
  if (value === null) return '—';
  if (Math.abs(value) >= 1000) return `${Math.round(value / 1000)}k ₽`;
  return `${Math.round(value)} ₽`;
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
    region: extractRegion(text),
    salary: extractSalary(text),
    salaryMin: null,
    salaryMax: null,
    text,
    sourceName: fileName,
    sourceType,
    skills: detectSkills(text),
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
  const [viewType, setViewType] = useState<'all' | SourceType>('all');
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
      setError(`Не удалось загрузить сохранённую выборку: ${loadError.message}`);
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

  const marketStats = useMemo<SkillMarketStat[]>(() => SKILL_RULES
    .map(rule => {
      const vacancyRows = vacancies.filter(row => matchesSkill(row, rule));
      const resumeRows = resumes.filter(row => matchesSkill(row, rule));
      if (!vacancyRows.length && !resumeRows.length) return null;

      const salaries = resumeRows
        .map(row => row.salary)
        .filter((value): value is number => value !== null);
      const vacancyShare = vacancies.length ? Math.round((vacancyRows.length / vacancies.length) * 100) : 0;
      const resumeShare = resumes.length ? Math.round((resumeRows.length / resumes.length) * 100) : 0;

      return {
        skill: rule.name,
        vacancies: vacancyRows.length,
        vacancyShare,
        resumes: resumeRows.length,
        resumeShare,
        gap: vacancyShare - resumeShare,
        candidateSalaryMedian: salaries.length ? median(salaries) : null,
      };
    })
    .filter(Boolean)
    .sort((a, b) => (b?.gap ?? 0) - (a?.gap ?? 0)) as SkillMarketStat[], [vacancies, resumes]);

  const chartStats = useMemo(
    () => [...marketStats].sort((a, b) => b.vacancyShare - a.vacancyShare).slice(0, 8),
    [marketStats],
  );

  const regionStats = useMemo(() => {
    const map = new Map<string, { vacancies: number; resumes: number; total: number }>();
    allRows.forEach(row => {
      if (row.region === 'Не указан') return;
      const current = map.get(row.region) ?? { vacancies: 0, resumes: 0, total: 0 };
      if (row.sourceType === 'vacancies') current.vacancies += 1;
      else current.resumes += 1;
      current.total += 1;
      map.set(row.region, current);
    });
    return Array.from(map.entries())
      .map(([region, stats]) => ({ region, ...stats }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 12);
  }, [allRows]);

  const vacancyMedian = median(vacancies.map(row => row.salary).filter((value): value is number => value !== null));
  const resumeMedian = median(resumes.map(row => row.salary).filter((value): value is number => value !== null));
  const medianDiff = vacancyMedian !== null && resumeMedian !== null ? vacancyMedian - resumeMedian : null;

  const scarceSkills = marketStats.filter(stat => stat.gap >= 20).slice(0, 5);
  const highDemand = marketStats.filter(stat => stat.vacancyShare >= 50).slice(0, 5);
  const topSalarySkill = [...marketStats]
    .filter(stat => stat.candidateSalaryMedian !== null)
    .sort((a, b) => (b.candidateSalaryMedian ?? 0) - (a.candidateSalaryMedian ?? 0))[0] ?? null;

  const bubbleStats = useMemo(
    () => [...marketStats]
      .filter(stat => stat.candidateSalaryMedian !== null && stat.vacancies > 0)
      .sort((a, b) => b.vacancies - a.vacancies)
      .slice(0, 10),
    [marketStats],
  );

  const importFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files).filter(
      file => /\.(html?|txt)$/i.test(file.name) || file.type === 'text/html' || file.type === 'text/plain',
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
        // Некорректный файл просто не попадает в выборку.
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
      setError('Эти файлы уже входят в выборку.');
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
      setError('Очистка всей выборки отключена. Выбери отдельно вакансии или резюме.');
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

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <button
          onClick={() => navigate('/ceo/roles/decompose')}
          className="p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052] transition-colors"
          aria-label="Назад"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[26px] md:text-3xl font-bold text-[#000052] tracking-tight">Рынок навыков</h1>
          <p className="text-sm text-gray-400 mt-1">Аналитика спроса, предложения и стоимости навыков для роли «Страховой агент».</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap gap-2">
            {(['all', 'vacancies', 'resumes'] as const).map(value => (
              <button
                key={value}
                onClick={() => setViewType(value)}
                className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  viewType === value
                    ? 'bg-[#000052] text-white shadow-[0_4px_16px_rgba(0,0,82,0.25)]'
                    : 'bg-[#000052]/5 text-[#000052] hover:bg-[#000052]/10'
                }`}
              >
                {value === 'all' ? 'Рынок' : value === 'vacancies' ? 'Вакансии' : 'Резюме'}
              </button>
            ))}
          </div>
          <div className="text-xs text-gray-400">Данные используются для расчёта инфографики</div>
        </div>

        <label
          onDragOver={event => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={event => { event.preventDefault(); setDragActive(false); void importFiles(event.dataTransfer.files); }}
          className={`block border-2 border-dashed rounded-2xl p-7 text-center cursor-pointer transition-all ${
            dragActive
              ? 'border-[#B8860B] bg-[#B8860B]/5'
              : 'border-gray-300 hover:border-[#000052] hover:bg-[#000052]/[0.02]'
          }`}
        >
          <div className="w-14 h-14 mx-auto rounded-[14px] bg-[#000052]/5 flex items-center justify-center mb-3">
            <FileUp className="w-7 h-7 text-[#000052]" />
          </div>
          <div className="font-semibold text-[#000052]">Загрузить {viewType === 'resumes' ? 'резюме' : 'вакансии'} HH</div>
          <div className="text-sm text-gray-400 mt-1">HTML / HTM / TXT. После загрузки здесь показывается аналитика, а не список файлов.</div>
          <input type="file" multiple accept=".html,.htm,.txt,text/html,text/plain" onChange={handleFileInput} className="hidden" />
        </label>

        {error && (
          <div className="p-3.5 rounded-xl bg-red-50 text-red-600 text-sm flex items-start gap-2">
            <Trash2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}
        {saving && <div className="text-sm text-gray-500">Сохраняем данные в InCORE…</div>}

        <div className="flex flex-wrap gap-3">
          <button
            onClick={exportCsv}
            disabled={!visibleRows.length || saving}
            className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-[#000052] rounded-xl font-semibold hover:border-[#000052] hover:bg-[#000052]/5 disabled:opacity-40 transition-all"
          >
            <Download className="w-4 h-4" /> Скачать CSV
          </button>
          {viewType !== 'all' && (
            <button
              onClick={() => void clear()}
              disabled={!visibleRows.length || saving}
              className="inline-flex items-center gap-2 px-5 py-3 text-red-600 rounded-xl font-semibold hover:bg-red-50 disabled:opacity-40 transition-all"
            >
              <Trash2 className="w-4 h-4" /> Очистить выборку
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl shadow-sm p-8 text-center text-sm text-gray-500">Загружаем рыночные данные…</div>
      ) : !allRows.length ? (
        <div className="bg-white rounded-2xl shadow-sm p-12 text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#000052]/5 flex items-center justify-center">
            <FileUp className="w-8 h-8 text-[#000052]/40" />
          </div>
          <p className="text-lg font-semibold text-[#000052] mb-2">Загрузите первые данные</p>
          <p className="text-sm text-gray-400">После загрузки вакансий и резюме InCORE автоматически построит рыночную инфографику.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard icon={Briefcase} label="Вакансий" value={vacancies.length} box="bg-[#000052]/5 text-[#000052]" valueColor="text-[#000052]" />
            <KpiCard icon={Users} label="Резюме" value={resumes.length} box="bg-[#B8860B]/10 text-[#B8860B]" valueColor="text-[#000052]" />
            <KpiCard icon={DollarSign} label="Медиана вакансий" value={formatMoney(vacancyMedian)} box="bg-[#000052]/5 text-[#000052]" valueColor="text-[#000052]" />
            <KpiCard
              icon={TrendingUp}
              label="Медиана ожиданий"
              value={formatMoney(resumeMedian)}
              trend={medianDiff ?? undefined}
              trendLabel={medianDiff === null ? undefined : medianDiff > 0 ? 'ожидания ниже рынка' : medianDiff < 0 ? 'ожидания выше рынка' : 'рыночный уровень'}
              box="bg-emerald-50 text-emerald-600"
              valueColor="text-[#B8860B]"
            />
          </div>

          {chartStats.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center">
                  <BarChart3 className="w-5 h-5 text-[#B8860B]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#000052]">Спрос vs предложение</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Доля вакансий и резюме, в которых встречается каждый навык</p>
                </div>
              </div>

              <div className="space-y-5">
                {chartStats.map(stat => (
                  <SkillBar key={stat.skill} stat={stat} />
                ))}
              </div>

              <div className="flex flex-wrap gap-5 mt-6 pt-4 border-t border-gray-100 text-xs text-gray-500">
                <span className="inline-flex items-center gap-2"><span className="w-3 h-2 rounded-full bg-[#46618C]" />Спрос</span>
                <span className="inline-flex items-center gap-2"><span className="w-3 h-2 rounded-full bg-[#D4A017]" />Предложение</span>
                <span>Красный показатель = дефицит навыка</span>
              </div>
            </div>
          )}

          {bubbleStats.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-[12px] bg-[#000052]/5 flex items-center justify-center">
                  <Zap className="w-5 h-5 text-[#000052]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#000052]">Карта стоимости навыков</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Размер точки показывает объём спроса, вертикаль — медиану ожиданий, цвет — дефицит</p>
                </div>
              </div>
              <SkillBubbleChart data={bubbleStats} />
            </div>
          )}

          {regionStats.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[12px] bg-[#000052]/5 flex items-center justify-center">
                  <MapPin className="w-5 h-5 text-[#000052]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#000052]">География рынка</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Где сосредоточена текущая выборка</p>
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                {regionStats.map(region => {
                  const maxTotal = Math.max(...regionStats.map(item => item.total), 1);
                  const intensity = region.total / maxTotal;
                  return (
                    <div
                      key={region.region}
                      className="p-3 rounded-xl"
                      style={{ background: `rgba(0, 0, 82, ${0.06 + intensity * 0.4})`, color: intensity > 0.55 ? '#ffffff' : '#000052' }}
                    >
                      <div className="text-xs font-semibold opacity-80">{REGION_SHORT[region.region] ?? region.region}</div>
                      <div className="text-xl font-bold tabular-nums mt-1">{region.total}</div>
                      <div className="text-[10px] opacity-70 mt-0.5">{region.vacancies} В · {region.resumes} Р</div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {marketStats.length > 0 && (
            <div className="bg-white rounded-2xl shadow-sm p-5 md:p-6">
              <div className="flex items-center gap-3 mb-5">
                <div className="w-10 h-10 rounded-[12px] bg-[#B8860B]/10 flex items-center justify-center">
                  <Award className="w-5 h-5 text-[#B8860B]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#000052]">Рыночные сигналы</h2>
                  <p className="text-xs text-gray-400 mt-0.5">Что эти данные означают для CEO</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <InsightCard
                  icon={Zap}
                  title="Дефицитные навыки"
                  value={scarceSkills.length ? scarceSkills.map(stat => stat.skill).join(', ') : 'Не выявлены'}
                  description="Спрос минимум на 20 п.п. выше предложения"
                  bg="bg-red-50"
                  accent="text-red-600"
                />
                <InsightCard
                  icon={Target}
                  title="Ядро спроса"
                  value={highDemand.length ? highDemand.map(stat => stat.skill).join(', ') : 'Пока не выделено'}
                  description="Навыки встречаются минимум в 50% вакансий"
                  bg="bg-[#000052]/5"
                  accent="text-[#000052]"
                />
                <InsightCard
                  icon={DollarSign}
                  title="Самая высокая стоимость"
                  value={topSalarySkill?.skill ?? 'Недостаточно данных'}
                  description={topSalarySkill ? formatMoney(topSalarySkill.candidateSalaryMedian) : 'Нужны резюме с зарплатой'}
                  bg="bg-[#B8860B]/10"
                  accent="text-[#B8860B]"
                />
              </div>

              <div className="mt-5 p-4 rounded-xl bg-[#F4F5F7] text-sm text-gray-700">
                <b>Как читать график:</b> положительный разрыв означает дефицит навыка на рынке, отрицательный — относительный профицит кандидатов. Это данные для принятия решений по профилю роли, обучению и компенсации, а не просто список загруженных файлов.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  trend,
  trendLabel,
  box,
  valueColor,
}: {
  icon: any;
  label: string;
  value: string | number;
  trend?: number;
  trendLabel?: string;
  box: string;
  valueColor: string;
}) {
  const TrendIcon = trend && trend > 0 ? TrendingUp : trend && trend < 0 ? TrendingDown : Minus;
  const trendColor = trend && trend > 0 ? 'text-red-600' : trend && trend < 0 ? 'text-emerald-600' : 'text-gray-400';

  return (
    <div className="bg-white p-5 rounded-2xl shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,82,0.12)]">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-500 leading-tight">{label}</h3>
        <div className={`w-10 h-10 rounded-[12px] flex items-center justify-center flex-shrink-0 ${box}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className={`text-[26px] font-bold tracking-tight ${valueColor} ${typeof value === 'string' && value.length > 10 ? 'text-xl' : ''}`}>{value}</p>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 mt-2 text-xs ${trendColor}`}>
          <TrendIcon className="w-3.5 h-3.5" />
          <span>{trend > 0 ? '+' : ''}{formatMoneyShort(trend)}</span>
          {trendLabel && <span className="text-gray-400">· {trendLabel}</span>}
        </div>
      )}
    </div>
  );
}

function SkillBar({ stat }: { stat: SkillMarketStat }) {
  const gapColor = stat.gap >= 20 ? 'text-red-600' : stat.gap <= -20 ? 'text-[#46618C]' : 'text-gray-500';

  return (
    <div>
      <div className="flex items-center justify-between gap-4 mb-2">
        <span className="text-sm font-semibold text-[#000052]">{stat.skill}</span>
        <span className={`text-xs font-bold tabular-nums ${gapColor}`}>
          {stat.gap > 0 ? '+' : ''}{stat.gap} п.п.
        </span>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <span className="w-20 text-xs text-gray-500">Вакансии</span>
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#1E3A5F] to-[#46618C] transition-all duration-700" style={{ width: `${stat.vacancyShare}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-bold text-[#000052] tabular-nums">{stat.vacancyShare}%</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="w-20 text-xs text-gray-500">Резюме</span>
          <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full rounded-full bg-gradient-to-r from-[#8A6508] to-[#D4A017] transition-all duration-700" style={{ width: `${stat.resumeShare}%` }} />
          </div>
          <span className="w-10 text-right text-xs font-bold text-[#B8860B] tabular-nums">{stat.resumeShare}%</span>
        </div>
      </div>
    </div>
  );
}

function SkillBubbleChart({ data }: { data: SkillMarketStat[] }) {
  const width = 900;
  const height = 430;
  const left = 80;
  const right = 35;
  const top = 35;
  const bottom = 60;
  const plotWidth = width - left - right;
  const plotHeight = height - top - bottom;
  const maxSalary = Math.max(...data.map(item => item.candidateSalaryMedian ?? 0), 1);
  const maxVacancies = Math.max(...data.map(item => item.vacancies), 1);
  const maxGap = Math.max(...data.map(item => Math.abs(item.gap)), 1);

  return (
    <div className="overflow-x-auto mt-5">
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} className="min-w-[720px]" preserveAspectRatio="xMidYMid meet">
        {[0.25, 0.5, 0.75, 1].map(scale => {
          const y = top + plotHeight * (1 - scale);
          const salary = Math.round((maxSalary * scale) / 1000);
          return (
            <g key={scale}>
              <line x1={left} y1={y} x2={width - right} y2={y} stroke="#E2E8F0" strokeWidth="1" />
              <text x={left - 10} y={y + 4} textAnchor="end" className="fill-gray-400 text-[10px]">{salary}k</text>
            </g>
          );
        })}

        <line x1={left} y1={top + plotHeight} x2={width - right} y2={top + plotHeight} stroke="#CBD5E1" strokeWidth="1" />
        <line x1={left + plotWidth / 2} y1={top} x2={left + plotWidth / 2} y2={top + plotHeight} stroke="#CBD5E1" strokeDasharray="5 5" />

        <text x={left + plotWidth / 2} y={height - 20} textAnchor="middle" className="fill-gray-400 text-[11px]">баланс спроса и предложения</text>
        <text x={left + 4} y={height - 38} textAnchor="start" className="fill-[#46618C] text-[10px]">профицит</text>
        <text x={width - right - 4} y={height - 38} textAnchor="end" className="fill-red-500 text-[10px]">дефицит</text>
        <text x={left - 50} y={top + plotHeight / 2} textAnchor="middle" className="fill-gray-400 text-[10px]" transform={`rotate(-90 ${left - 50} ${top + plotHeight / 2})`}>медиана ожиданий, ₽</text>

        {data.map(stat => {
          const x = left + plotWidth / 2 + (stat.gap / maxGap) * (plotWidth / 2 - 45);
          const y = top + plotHeight - ((stat.candidateSalaryMedian ?? 0) / maxSalary) * plotHeight;
          const radius = 10 + (stat.vacancies / maxVacancies) * 22;
          const color = stat.gap >= 20 ? '#DC2626' : stat.gap <= -20 ? '#46618C' : '#B8860B';
          const label = stat.skill.length > 18 ? `${stat.skill.slice(0, 17)}…` : stat.skill;

          return (
            <g key={stat.skill}>
              <circle cx={x} cy={y} r={radius} fill={color} fillOpacity="0.16" stroke={color} strokeWidth="2" />
              <text x={x} y={y - radius - 7} textAnchor="middle" className="fill-[#000052] text-[10px] font-semibold">{label}</text>
              <text x={x} y={y + 4} textAnchor="middle" className="fill-[#000052] text-[10px] font-bold">{stat.vacancies}</text>
            </g>
          );
        })}
      </svg>

      <div className="flex flex-wrap gap-5 mt-2 text-xs text-gray-500">
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-red-600/20 border-2 border-red-600" />Дефицит</span>
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#B8860B]/20 border-2 border-[#B8860B]" />Баланс</span>
        <span className="inline-flex items-center gap-2"><span className="w-3 h-3 rounded-full bg-[#46618C]/20 border-2 border-[#46618C]" />Профицит</span>
        <span>Размер круга = объём вакансий</span>
      </div>
    </div>
  );
}

function InsightCard({
  icon: Icon,
  title,
  value,
  description,
  bg,
  accent,
}: {
  icon: any;
  title: string;
  value: string;
  description: string;
  bg: string;
  accent: string;
}) {
  return (
    <div className={`p-5 rounded-2xl ${bg}`}>
      <div className={`w-10 h-10 rounded-[12px] bg-white flex items-center justify-center mb-3 ${accent}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="text-xs text-gray-500">{title}</div>
      <div className="font-bold text-[#000052] mt-1 text-sm leading-snug">{value}</div>
      <div className="text-xs text-gray-500 mt-1">{description}</div>
    </div>
  );
}
