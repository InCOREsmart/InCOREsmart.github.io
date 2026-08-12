import { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, Download, FileUp, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type SourceType = 'vacancies' | 'resumes';

type MarketRow = {
  id: string;
  title: string;
  region: string;
  salary: number | null;
  text: string;
  sourceName: string;
};

type SkillStat = {
  skill: string;
  count: number;
  share: number;
  salaryMedian: number | null;
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
  return value === null ? '—' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

function extractSalary(text: string): number | null {
  const normalizedText = text.replace(/\u00a0/g, ' ');
  const ranges = [...normalizedText.matchAll(/([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)\s*(?:[-–—]|до|\/)\s*([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)?/gi)];
  const values: number[] = [];
  for (const match of ranges) {
    const a = Number(match[1].replace(/\s/g, ''));
    const b = Number(match[2].replace(/\s/g, ''));
    if (Number.isFinite(a) && Number.isFinite(b)) values.push((a + b) / 2);
  }
  if (values.length) return Math.round(median(values) ?? values[0]);

  const singles = [...normalizedText.matchAll(/(?:от|до|зарплата|оклад)?\s*([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)/gi)]
    .map(match => Number(match[1].replace(/\s/g, '')))
    .filter(value => Number.isFinite(value))
    .map(value => value < 10000 ? value * 1000 : value)
    .filter(value => value >= 20000 && value <= 1000000);

  return singles.length ? median(singles) : null;
}

function extractRegion(text: string): string {
  const lower = text.toLowerCase();
  return KNOWN_REGIONS.find(region => lower.includes(region.toLowerCase())) ?? 'Не указан';
}

function cleanText(value: string) {
  return value
    .replace(/\u00a0/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function extractTitle(document: Document, text: string, sourceType: SourceType): string {
  const selectors = sourceType === 'vacancies'
    ? ['h1', '[data-qa*="vacancy-title"]', '[data-qa*="vacancy-name"]', 'meta[property="og:title"]']
    : ['h1', '[data-qa*="resume-title"]', '[data-qa*="resume-name"]', 'meta[property="og:title"]'];

  for (const selector of selectors) {
    const element = document.querySelector(selector);
    const value = element?.getAttribute('content') || element?.textContent || '';
    const title = cleanText(value);
    if (title && !/^(вакансия|резюме)$/i.test(title)) return title.slice(0, 180);
  }

  const firstUsefulLine = text.split('\n').map(cleanText).find(line => line.length >= 4 && line.length <= 180);
  return firstUsefulLine || (sourceType === 'vacancies' ? 'Вакансия HH' : 'Резюме HH');
}

function parseHtmlFile(content: string, fileName: string, sourceType: SourceType): MarketRow {
  const document = new DOMParser().parseFromString(content, 'text/html');
  document.querySelectorAll('script, style, noscript, svg').forEach(node => node.remove());
  const text = cleanText(document.body?.innerText || document.documentElement?.textContent || '');
  const title = extractTitle(document, text, sourceType);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title,
    region: extractRegion(text),
    salary: extractSalary(text),
    text,
    sourceName: fileName,
  };
}

function parseTextFile(content: string, fileName: string, sourceType: SourceType): MarketRow {
  const text = cleanText(content);
  const firstLine = text.split('\n').map(cleanText).find(line => line.length >= 4 && line.length <= 180);
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    title: firstLine || (sourceType === 'vacancies' ? 'Вакансия HH' : 'Резюме HH'),
    region: extractRegion(text),
    salary: extractSalary(text),
    text,
    sourceName: fileName,
  };
}

export function HHMarketCollectorPage() {
  const navigate = useNavigate();
  const [sourceType, setSourceType] = useState<SourceType>('vacancies');
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

  const stats = useMemo<SkillStat[]>(() => {
    return SKILL_RULES.map(rule => {
      const matched = rows.filter(row => {
        const lower = row.text.toLowerCase();
        return rule.patterns.some(pattern => lower.includes(pattern));
      });
      if (!matched.length) return null;
      const salaries = matched.map(row => row.salary).filter((value): value is number => value !== null);
      return {
        skill: rule.name,
        count: matched.length,
        share: Math.round((matched.length / rows.length) * 100),
        salaryMedian: salaries.length >= 5 ? median(salaries) : null,
      };
    }).filter(Boolean).sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0)) as SkillStat[];
  }, [rows]);

  const importFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files).filter(file => /\.(html?|txt)$/i.test(file.name) || file.type === 'text/html' || file.type === 'text/plain');
    if (!selected.length) {
      setError('Выбери сохранённые страницы HH в формате HTML или TXT.');
      return;
    }

    const parsed: MarketRow[] = [];
    for (const file of selected) {
      try {
        const content = await file.text();
        parsed.push(file.type === 'text/html' || /\.html?$/i.test(file.name)
          ? parseHtmlFile(content, file.name, sourceType)
          : parseTextFile(content, file.name, sourceType));
      } catch {
        // Skip unreadable files and report them below.
      }
    }

    if (!parsed.length) {
      setError('Не удалось прочитать выбранные файлы.');
      return;
    }

    setRows(prev => [...prev, ...parsed]);
  };

  const handleFileInput = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) void importFiles(event.target.files);
    event.target.value = '';
  };

  const exportCsv = () => {
    const header = ['source', 'title', 'region', 'salary', 'text'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows.map(row => [
      sourceType === 'vacancies' ? 'hh.ru/vacancies' : 'hh.ru/resumes',
      row.title,
      row.region,
      row.salary?.toString() ?? '',
      row.text,
    ])].map(row => row.map(escape).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `incore-hh-${sourceType}-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const clear = () => setRows([]);

  const salaryCount = rows.filter(row => row.salary !== null).length;
  const overallMedian = median(rows.map(row => row.salary).filter((value): value is number => value !== null));
  const topSkill = stats[0] ?? null;
  const topSalarySkill = [...stats].filter(stat => stat.salaryMedian !== null).sort((a, b) => (b.salaryMedian ?? 0) - (a.salaryMedian ?? 0))[0] ?? null;
  const coreSkills = stats.filter(stat => stat.share >= 50).map(stat => stat.skill);
  const additionalSkills = stats.filter(stat => stat.share < 50).map(stat => stat.skill);

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/ceo/roles/decompose')} className="p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]" aria-label="Назад">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[26px] md:text-3xl font-bold text-[#000052]">Рынок навыков</h1>
          <p className="text-sm text-gray-500 mt-1">Анализ рынка для прототипа роли «Страховой агент».</p>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSourceType('vacancies')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${sourceType === 'vacancies' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Вакансии</button>
          <button onClick={() => setSourceType('resumes')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${sourceType === 'resumes' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Резюме</button>
        </div>

        <label
          onDragOver={event => { event.preventDefault(); setDragActive(true); }}
          onDragLeave={() => setDragActive(false)}
          onDrop={event => { event.preventDefault(); setDragActive(false); void importFiles(event.dataTransfer.files); }}
          className={`block border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition ${dragActive ? 'border-[#B8860B] bg-amber-50' : 'border-gray-300 hover:border-[#000052]'}`}
        >
          <FileUp className="w-9 h-9 mx-auto text-[#000052] mb-3" />
          <div className="font-semibold text-[#000052]">Загрузить вакансии HH</div>
          <div className="text-sm text-gray-500 mt-1">HTML / HTM / TXT. Можно выбрать сразу много файлов.</div>
          <input type="file" multiple accept=".html,.htm,.txt,text/html,text/plain" onChange={handleFileInput} className="hidden" />
        </label>

        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

        <div className="flex flex-wrap gap-3">
          <button onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-[#000052] rounded-xl font-semibold disabled:opacity-40"><Download className="w-4 h-4" /> Скачать CSV</button>
          <button onClick={clear} disabled={!rows.length} className="inline-flex items-center gap-2 px-5 py-3 text-red-600 rounded-xl font-semibold disabled:opacity-40"><Trash2 className="w-4 h-4" /> Очистить</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Вакансий в выборке</div><div className="text-3xl font-bold text-[#000052] mt-1">{rows.length}</div></div>
        <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">С указанием зарплаты</div><div className="text-3xl font-bold text-[#000052] mt-1">{salaryCount}</div></div>
        <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Медианная зарплата</div><div className="text-3xl font-bold text-[#000052] mt-1">{formatMoney(overallMedian)}</div></div>
      </div>

      {!!rows.length && !!stats.length && (
        <div className="bg-[#000052] text-white rounded-2xl shadow-sm p-6">
          <div className="text-sm uppercase tracking-wide opacity-70">Что это значит для CEO</div>
          <h2 className="text-xl font-bold mt-1">Рыночный профиль страхового агента</h2>
          <div className="mt-4 space-y-3 text-sm leading-6">
            {topSkill && <p><strong>{topSkill.skill}</strong> встречается в {topSkill.share}% вакансий выборки. Это один из базовых навыков рынка.</p>}
            {coreSkills.length > 0 && <p><strong>Ядро профиля:</strong> {coreSkills.join(', ')}.</p>}
            {additionalSkills.length > 0 && <p><strong>Дополнительные требования:</strong> {additionalSkills.slice(0, 5).join(', ')}. Они встречаются реже и не обязательно должны быть обязательными для роли.</p>}
            {topSalarySkill && <p><strong>Самая высокая медианная зарплата среди навыков:</strong> {topSalarySkill.skill} — {formatMoney(topSalarySkill.salaryMedian)}.</p>}
            <p className="opacity-80">Вывод основан на текущей выборке вакансий. Чем больше вакансий загружено, тем надёжнее рыночная картина.</p>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-1"><BarChart3 className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Какие навыки нужны рынку</h2></div>
        <p className="text-sm text-gray-500 mb-4">Доля показывает, в какой части вакансий встречается требование к навыку.</p>
        {!stats.length ? (
          <div className="text-sm text-gray-400 py-6 text-center">Загрузи вакансии, чтобы увидеть анализ.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="border-b text-left text-gray-500"><th className="py-3 pr-4">Навык</th><th className="py-3 pr-4">Вакансий</th><th className="py-3 pr-4">Доля вакансий</th><th className="py-3">Медианная зарплата</th></tr></thead>
              <tbody>{stats.map(stat => <tr key={stat.skill} className="border-b last:border-0"><td className="py-3 pr-4 font-semibold text-[#000052]">{stat.skill}</td><td className="py-3 pr-4">{stat.count}</td><td className="py-3 pr-4">{stat.share}%</td><td className="py-3">{stat.salaryMedian === null ? 'Недостаточно данных' : formatMoney(stat.salaryMedian)}</td></tr>)}</tbody>
            </table>
          </div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <h2 className="text-lg font-bold text-[#000052] mb-2">Загруженные вакансии</h2>
        <p className="text-sm text-gray-500 mb-4">Используются как исходные данные для расчёта рыночного профиля.</p>
        {!rows.length ? <div className="text-sm text-gray-400">Пока ничего не загружено.</div> : (
          <div className="space-y-2">{rows.slice(-10).reverse().map(row => <div key={row.id} className="border border-gray-100 rounded-xl p-3"><div className="font-semibold text-[#000052]">{row.title}</div><div className="text-xs text-gray-500 mt-1">{row.region} · {formatMoney(row.salary)} · {row.sourceName}</div></div>)}</div>
        )}
      </div>
    </div>
  );
}
