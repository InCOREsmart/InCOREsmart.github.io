import { ChangeEvent, useEffect, useMemo, useState } from 'react';
import { BarChart3, Download, FileUp, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkillDefinition } from '../../types/decomposition';

type MarketProfile = {
  id?: string;
  source_type: 'vacancy' | 'resume';
  text: string;
  salary: number | null;
  skills: string[] | null;
  source_name?: string;
  title?: string;
  region?: string;
};

type MarketSkillStat = {
  skill: SkillDefinition;
  vacancies: number;
  resumes: number;
  vacancyShare: number | null;
  resumeShare: number | null;
  skillGap: number | null;
  weightedGap: number | null;
  vacancySalaryMedian: number | null;
  candidateSalaryMedian: number | null;
};

const ROLE_MARKET_MATCHES: Record<string, { skillNames: string[]; patterns: string[] }> = {
  'Продажи корпоративного страхования': { skillNames: ['Корпоративные продажи', 'Страхование', 'Продажи'], patterns: ['корпоративн', 'b2b', 'страхован', 'страховой', 'продаж'] },
  'Удержание клиентов': { skillNames: ['Работа с клиентами', 'Развитие клиентской базы', 'Продление договоров'], patterns: ['удержан', 'продлен', 'пролонгац', 'клиентск', 'развитие клиентской', 'клиентами'] },
  'Кросс-продажи': { skillNames: ['Кросс-продажи'], patterns: ['кросс-продаж', 'cross-sell', 'cross sell', 'crosssell', 'допродаж'] },
  'Выполнение плана продаж': { skillNames: ['План продаж', 'Продажи'], patterns: ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'] },
  'Удержание 90 дней': { skillNames: [], patterns: ['удержание 90', '90 дней', '90-day retention', 'retention 90', 'retention'] },
  'Долгосрочная результативность': { skillNames: ['План продаж'], patterns: ['годовой результат', 'долгосрочн', 'стабильное выполнение', 'годовых целей', 'kpi'] },
};

const GENERIC_SKILL_PATTERNS: Record<string, string[]> = {
  'Корпоративные продажи': ['b2b', 'b2б', 'корпоративн', 'юридическ', 'корпоративных клиентов'],
  'Кросс-продажи': ['кросс-продаж', 'cross-sell', 'cross sell', 'crosssell', 'допродаж'],
  'Продление договоров': ['продлен', 'пролонгац'],
  'Телефонные продажи': ['телефонн', 'телемаркетинг', 'холодных звон', 'cold call'],
  'Переговоры': ['переговор', 'деловые встречи'],
  'Продажи': ['продаж', 'продавать', 'активные продажи'],
  'Страхование': ['страхован', 'страховой', 'страховых продукт'],
  'Работа с клиентами': ['работа с клиент', 'клиентск', 'клиентами', 'клиентскую баз', 'консультирование клиентов'],
  'План продаж': ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'],
  'CRM': ['crm', 'битрикс', 'amocrm', 'salesforce'],
  'Развитие клиентской базы': ['развитие клиентской', 'расширение клиентской', 'привлечение клиентов'],
};

const KNOWN_REGIONS = [
  'Москва', 'Санкт-Петербург', 'Московская область', 'Краснодар', 'Сочи', 'Екатеринбург',
  'Казань', 'Новосибирск', 'Ростов-на-Дону', 'Нижний Новгород', 'Самара', 'Воронеж',
  'Красноярск', 'Пермь', 'Уфа', 'Омск', 'Баку', 'Астана', 'Удалённая работа', 'Удаленная работа',
];

function median(values: number[]) {
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
  return Object.entries(GENERIC_SKILL_PATTERNS)
    .filter(([, patterns]) => patterns.some(pattern => lower.includes(pattern)))
    .map(([name]) => name);
}

function extractTitle(document: Document, text: string, sourceType: 'vacancy' | 'resume') {
  const selectors = sourceType === 'vacancy'
    ? ['h1', '[data-qa*="vacancy-title"]', '[data-qa*="vacancy-name"]', 'meta[property="og:title"]']
    : ['h1', '[data-qa*="resume-title"]', '[data-qa*="resume-name"]', 'meta[property="og:title"]'];
  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const value = element?.getAttribute('content') || element?.textContent || '';
    const title = cleanText(value);
    if (title && !/^(вакансия|резюме)$/i.test(title)) return title.slice(0, 180);
  }
  return text.split('\n').map(cleanText).find(line => line.length >= 4 && line.length <= 180) || (sourceType === 'vacancy' ? 'Вакансия HH' : 'Резюме HH');
}

function parseFile(content: string, fileName: string, sourceType: 'vacancy' | 'resume'): MarketProfile & { source_name: string; title: string; region: string; skills: string[] } {
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
    source_type: sourceType,
    source_name: fileName,
    title: title || (sourceType === 'vacancy' ? 'Вакансия HH' : 'Резюме HH'),
    region: extractRegion(text),
    salary: extractSalary(text),
    text,
    skills: detectSkills(text),
  };
}

function matches(profile: MarketProfile, mapping: { skillNames: string[]; patterns: string[] }) {
  const text = (profile.text ?? '').toLowerCase();
  const skillNames = Array.isArray(profile.skills) ? profile.skills : [];
  return mapping.skillNames.some(name => skillNames.includes(name)) || mapping.patterns.some(pattern => text.includes(pattern));
}

function gapLabel(gap: number | null) {
  if (gap === null) return { label: 'Нет данных', className: 'bg-gray-100 text-gray-500' };
  if (gap >= 20) return { label: 'Дефицит', className: 'bg-red-50 text-red-700' };
  if (gap <= -20) return { label: 'Профицит', className: 'bg-blue-50 text-blue-700' };
  return { label: 'Баланс', className: 'bg-amber-50 text-amber-700' };
}

export function RoleMarketAnalysis({ skills }: { skills: SkillDefinition[] }) {
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [uploadType, setUploadType] = useState<'vacancy' | 'resume'>('vacancy');

  const loadMarket = async () => {
    setLoading(true);
    setError('');
    const { data, error: queryError } = await supabase.from('market_profiles').select('id, source_type, text, salary, skills, source_name, title, region').order('created_at', { ascending: false });
    if (queryError) {
      setError(`Не удалось загрузить рынок HH: ${queryError.message}`);
      setProfiles([]);
    } else {
      setProfiles((data ?? []) as MarketProfile[]);
    }
    setLoading(false);
  };

  useEffect(() => { void loadMarket(); }, []);

  const importFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files).filter(file => /\.(html?|txt)$/i.test(file.name) || file.type === 'text/html' || file.type === 'text/plain');
    if (!selected.length) {
      setError('Поддерживаются HTML, HTM и TXT. Один файл = одна запись.');
      return;
    }

    const parsed: Array<MarketProfile & { source_name: string; title: string; region: string; skills: string[] }> = [];
    for (const file of selected) {
      try {
        parsed.push(parseFile(await file.text(), file.name, uploadType));
      } catch {
        // Пропускаем нечитаемые файлы.
      }
    }
    if (!parsed.length) {
      setError('Не удалось прочитать выбранные файлы.');
      return;
    }

    setSaving(true);
    const { data: existing, error: existingError } = await supabase
      .from('market_profiles')
      .select('source_name')
      .eq('source_type', uploadType)
      .in('source_name', parsed.map(row => row.source_name));

    if (existingError) {
      setSaving(false);
      setError(`Не удалось проверить существующие данные: ${existingError.message}`);
      return;
    }

    const existingNames = new Set((existing ?? []).map(row => row.source_name));
    const newRows = parsed.filter(row => !existingNames.has(row.source_name));
    if (!newRows.length) {
      setSaving(false);
      setError('Эти файлы уже загружены в выборку.');
      return;
    }

    const { data, error: insertError } = await supabase.from('market_profiles').insert(newRows.map(row => ({
      source_type: row.source_type,
      source_name: row.source_name,
      title: row.title,
      region: row.region,
      salary: row.salary,
      text: row.text,
      skills: row.skills,
    }))).select('id, source_type, text, salary, skills, source_name, title, region');

    setSaving(false);
    if (insertError) {
      setError(`Не удалось сохранить данные: ${insertError.message}`);
      return;
    }
    setProfiles(prev => [...((data ?? []) as MarketProfile[]), ...prev]);
  };

  const handleFileInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void importFiles(event.target.files);
    event.target.value = '';
  };

  const exportCsv = () => {
    const header = ['source_type', 'title', 'region', 'salary', 'skills', 'text'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = profiles.map(row => [
      row.source_type,
      row.title ?? '',
      row.region ?? '',
      row.salary?.toString() ?? '',
      (row.skills ?? []).join(', '),
      row.text,
    ]);
    const csv = [header, ...rows].map(row => row.map(escape).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incore-hh-market-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clearType = async (type: 'vacancy' | 'resume') => {
    setError('');
    const { error: deleteError } = await supabase.from('market_profiles').delete().eq('source_type', type);
    if (deleteError) {
      setError(`Не удалось очистить данные: ${deleteError.message}`);
      return;
    }
    setProfiles(prev => prev.filter(row => row.source_type !== type));
  };

  const stats = useMemo<MarketSkillStat[]>(() => {
    const vacancies = profiles.filter(profile => profile.source_type === 'vacancy');
    const resumes = profiles.filter(profile => profile.source_type === 'resume');
    return skills.map(skill => {
      const mapping = ROLE_MARKET_MATCHES[skill.name] ?? { skillNames: [skill.name], patterns: [skill.name.toLowerCase()] };
      const matchingVacancies = vacancies.filter(profile => matches(profile, mapping));
      const matchingResumes = resumes.filter(profile => matches(profile, mapping));
      const vacancyShare = vacancies.length ? matchingVacancies.length / vacancies.length * 100 : null;
      const resumeShare = resumes.length ? matchingResumes.length / resumes.length * 100 : null;
      const skillGap = vacancyShare !== null && resumeShare !== null ? vacancyShare - resumeShare : null;
      const vacancySalaries = matchingVacancies.map(row => row.salary).filter((value): value is number => value !== null);
      const candidateSalaries = matchingResumes.map(row => row.salary).filter((value): value is number => value !== null);
      return {
        skill,
        vacancies: matchingVacancies.length,
        resumes: matchingResumes.length,
        vacancyShare,
        resumeShare,
        skillGap,
        weightedGap: skillGap === null ? null : skillGap * skill.weight,
        vacancySalaryMedian: median(vacancySalaries),
        candidateSalaryMedian: median(candidateSalaries),
      };
    });
  }, [profiles, skills]);

  const chartStats = useMemo(() => [...stats].sort((a, b) => (b.skillGap ?? -Infinity) - (a.skillGap ?? -Infinity)), [stats]);
  const maxGap = Math.max(20, ...chartStats.map(stat => Math.abs(stat.skillGap ?? 0)));
  const critical = stats.filter(stat => (stat.skillGap ?? -Infinity) >= 20).sort((a, b) => (b.weightedGap ?? 0) - (a.weightedGap ?? 0));
  const surplus = stats.filter(stat => (stat.skillGap ?? Infinity) <= -20).sort((a, b) => (a.skillGap ?? 0) - (b.skillGap ?? 0));
  const noData = stats.filter(stat => stat.skillGap === null);
  const balanceCount = stats.filter(stat => stat.skillGap !== null && stat.skillGap > -20 && stat.skillGap < 20).length;

  return (
    <section className="bg-white rounded-2xl shadow-sm overflow-hidden">
      <div className="p-5 md:p-6 border-b border-gray-100">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center flex-shrink-0"><BarChart3 className="w-5 h-5 text-[#B8860B]" /></div>
            <div><h3 className="font-bold text-[#000052] text-lg">Карта рынка навыков</h3><p className="text-sm text-gray-500 mt-1">Реальные вручную загруженные данные HH сопоставляются с требованиями этой роли.</p></div>
          </div>
          <button onClick={() => void loadMarket()} className="inline-flex items-center justify-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-[#000052] text-sm font-semibold"><RefreshCw className="w-4 h-4" /> Обновить</button>
        </div>
        <div className="mt-4 p-3 rounded-xl bg-blue-50 text-blue-800 text-xs leading-relaxed"><b>Как считается Skill Gap:</b> доля вакансий с навыком минус доля резюме с навыком. Положительное значение означает относительный дефицит предложения, отрицательное — относительный профицит. Это рыночный индикатор, а не абсолютное количество недостающих специалистов.</div>
      </div>

      <div className="p-5 md:p-6 border-b border-gray-100">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h4 className="font-bold text-[#000052]">Данные HH</h4>
            <p className="text-xs text-gray-400 mt-1">Вакансии и резюме загружаются вручную. API HH не используется.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => setUploadType('vacancy')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${uploadType === 'vacancy' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Вакансии</button>
            <button onClick={() => setUploadType('resume')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${uploadType === 'resume' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Резюме</button>
          </div>
        </div>
        <label className="mt-4 block border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center cursor-pointer hover:border-[#B8860B]/50 transition-colors">
          <FileUp className="w-6 h-6 mx-auto text-[#B8860B]" />
          <div className="mt-2 font-semibold text-[#000052]">Загрузить {uploadType === 'vacancy' ? 'вакансии' : 'резюме'} HH</div>
          <div className="text-xs text-gray-400 mt-1">HTML / HTM / TXT. Один файл = одна запись.</div>
          <input type="file" multiple accept=".html,.htm,.txt,text/html,text/plain" onChange={handleFileInput} className="hidden" />
        </label>
        <div className="flex flex-wrap gap-3 mt-3">
          <button onClick={exportCsv} disabled={!profiles.length || saving} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-[#000052] rounded-xl font-semibold text-sm disabled:opacity-40"><Download className="w-4 h-4" /> Скачать CSV</button>
          <button onClick={() => void clearType('vacancy')} disabled={!profiles.some(row => row.source_type === 'vacancy') || saving} className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 rounded-xl font-semibold text-sm disabled:opacity-40"><Trash2 className="w-4 h-4" /> Очистить вакансии</button>
          <button onClick={() => void clearType('resume')} disabled={!profiles.some(row => row.source_type === 'resume') || saving} className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 rounded-xl font-semibold text-sm disabled:opacity-40"><Trash2 className="w-4 h-4" /> Очистить резюме</button>
        </div>
        {saving && <div className="text-sm text-gray-500 mt-3">Сохраняем данные в InCORE…</div>}
        {error && <div className="mt-3 p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}
      </div>

      {loading ? <div className="p-10 text-center text-sm text-gray-400">Загружаем данные HH…</div> : !profiles.length ? (
        <div className="p-8 text-center"><div className="text-sm font-semibold text-[#000052]">Данных HH пока нет</div><div className="text-sm text-gray-500 mt-1">Загрузите реальные вакансии и резюме, чтобы InCORE рассчитал Skill Gap.</div></div>
      ) : (
        <div className="p-5 md:p-6">
          <div className="grid grid-cols-3 gap-3 mb-7">
            <div className="p-4 rounded-xl bg-red-50"><div className="text-xs text-red-500 uppercase">Дефицитных навыков</div><div className="text-2xl font-bold text-red-700 mt-1">{critical.length}</div></div>
            <div className="p-4 rounded-xl bg-amber-50"><div className="text-xs text-amber-600 uppercase">Баланс рынка</div><div className="text-2xl font-bold text-[#B8860B] mt-1">{balanceCount}</div></div>
            <div className="p-4 rounded-xl bg-blue-50"><div className="text-xs text-blue-500 uppercase">Профицитных навыков</div><div className="text-2xl font-bold text-blue-700 mt-1">{surplus.length}</div></div>
          </div>

          <div className="flex items-end justify-between gap-3 mb-3"><div><h4 className="font-bold text-[#000052]">Рыночный разрыв Skill Gap</h4><p className="text-xs text-gray-400 mt-1">Процентные пункты. 0 = относительный баланс спроса и предложения.</p></div><div className="hidden md:flex gap-3 text-xs text-gray-500"><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-red-500" /> дефицит</span><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#B8860B]" /> баланс</span><span className="inline-flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-sm bg-[#46618C]" /> профицит</span></div></div>

          <div className="overflow-x-auto pb-3"><div className="min-w-[760px]"><div className="relative h-[320px] border-b border-gray-200">
            <div className="absolute inset-x-0 top-1/2 border-t border-dashed border-gray-300" />
            <div className="absolute left-0 top-1/2 -translate-y-1/2 text-[10px] text-gray-400 bg-white pr-1">0</div>
            <div className="absolute left-0 top-2 text-[10px] text-gray-400">+{Math.round(maxGap)} п.п.</div>
            <div className="absolute left-0 bottom-2 text-[10px] text-gray-400">-{Math.round(maxGap)} п.п.</div>
            <div className="absolute inset-0 pl-8 pr-2 grid grid-cols-6 gap-3">
              {chartStats.map(stat => {
                const gap = stat.skillGap ?? 0;
                const positive = gap >= 0;
                const height = Math.min(44, Math.abs(gap) / maxGap * 44);
                const color = stat.skillGap === null ? 'bg-gray-300' : gap >= 20 ? 'bg-red-500' : gap <= -20 ? 'bg-[#46618C]' : 'bg-[#B8860B]';
                return <div key={stat.skill.name} className="relative flex flex-col items-center h-full">
                  <div className="absolute inset-x-0 top-0 h-1/2 flex items-end justify-center pb-1">{positive && <div className={`${color} w-12 max-w-full rounded-t-lg`} style={{ height: `${height * 2.8}px` }} title={`${stat.skill.name}: ${stat.skillGap === null ? 'нет данных' : `${gap.toFixed(1)} п.п.`}`} />}</div>
                  <div className="absolute inset-x-0 top-1/2 h-1/2 flex items-start justify-center pt-1">{!positive && <div className={`${color} w-12 max-w-full rounded-b-lg`} style={{ height: `${height * 2.8}px` }} title={`${stat.skill.name}: ${stat.skillGap === null ? 'нет данных' : `${gap.toFixed(1)} п.п.`}`} />}</div>
                  <div className="absolute top-1/2 mt-3 left-0 right-0 text-center text-[11px] font-semibold text-[#000052] leading-tight px-1">{stat.skill.name}</div>
                </div>;
              })}
            </div>
          </div></div></div>

          <div className="mt-8 overflow-x-auto"><table className="w-full min-w-[950px]"><thead><tr className="bg-gray-50 text-xs text-gray-500 uppercase"><th className="text-left p-3">Навык</th><th className="text-left p-3">Вес роли</th><th className="text-left p-3">Вакансии</th><th className="text-left p-3">Резюме</th><th className="text-left p-3">Skill Gap</th><th className="text-left p-3">Зарплата HH</th><th className="text-left p-3">Статус</th></tr></thead><tbody className="divide-y divide-gray-100">
            {chartStats.map(stat => { const status = gapLabel(stat.skillGap); return <tr key={`market-${stat.skill.name}`} className="align-top"><td className="p-3"><div className="font-semibold text-[#000052]">{stat.skill.name}</div></td><td className="p-3 font-semibold text-[#B8860B]">{Math.round(stat.skill.weight * 100)}%</td><td className="p-3 text-sm text-gray-600">{stat.vacancies} <span className="text-xs text-gray-400">({stat.vacancyShare === null ? '—' : `${stat.vacancyShare.toFixed(1)}%`})</span></td><td className="p-3 text-sm text-gray-600">{stat.resumes} <span className="text-xs text-gray-400">({stat.resumeShare === null ? '—' : `${stat.resumeShare.toFixed(1)}%`})</span></td><td className="p-3 font-bold text-[#000052]">{stat.skillGap === null ? '—' : `${stat.skillGap > 0 ? '+' : ''}${stat.skillGap.toFixed(1)} п.п.`}</td><td className="p-3 text-sm text-gray-600">{formatMoney(stat.vacancySalaryMedian)}</td><td className="p-3"><span className={`inline-flex px-2.5 py-1 rounded-lg text-xs font-semibold ${status.className}`}>{status.label}</span></td></tr>; })}
          </tbody></table></div>

          {critical.length > 0 && <div className="mt-5 p-4 rounded-xl bg-red-50 border border-red-100"><div className="font-semibold text-red-800">Рекомендации</div><div className="text-sm text-red-700 mt-1">Дефицитные навыки с большим весом роли становятся приоритетом найма: их стоит отдельно проверять на входе и закладывать в план обучения. В первую очередь: {critical.slice(0, 3).map(item => item.skill.name).join(', ')}.</div></div>}
          {noData.length > 0 && <div className="mt-4 p-4 rounded-xl bg-amber-50 border border-amber-100"><div className="font-semibold text-amber-800">Где рынок пока не измерен</div><div className="text-sm text-amber-700 mt-1">Для {noData.map(item => item.skill.name).join(', ')} недостаточно вакансий и/или резюме, чтобы считать Skill Gap. Это не нулевой дефицит, а отсутствие измерения.</div></div>}
        </div>
      )}
    </section>
  );
}
