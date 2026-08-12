import { useMemo, useState } from 'react';
import { ArrowLeft, BarChart3, ClipboardPaste, Download, Trash2, Upload } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

type MarketRow = {
  id: string;
  title: string;
  region: string;
  salary: number | null;
  text: string;
};

type SkillStat = {
  skill: string;
  count: number;
  share: number;
  salaryMedian: number | null;
};

const SKILL_RULES: Array<{ name: string; patterns: string[] }> = [
  { name: 'Продажи', patterns: ['продаж', 'продавать', 'активные продажи'] },
  { name: 'Корпоративные продажи', patterns: ['b2b', 'корпоративн', 'юридическ', 'корпоративных клиентов'] },
  { name: 'Страхование', patterns: ['страхован', 'страховой', 'страховых продукт'] },
  { name: 'Работа с клиентами', patterns: ['работа с клиент', 'клиентск', 'клиентами', 'клиентскую баз'] },
  { name: 'Переговоры', patterns: ['переговор', 'деловые встречи'] },
  { name: 'Кросс-продажи', patterns: ['кросс-продаж', 'cross-sell', 'cross sell', 'допродаж', 'дополнительн'] },
  { name: 'Продление договоров', patterns: ['продлен', 'пролонгац', 'пролонгация'] },
  { name: 'План продаж', patterns: ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'] },
  { name: 'Холодные продажи', patterns: ['холодн', 'холодных звон', 'cold call'] },
  { name: 'CRM', patterns: ['crm', 'битрикс', 'amocrm', 'salesforce'] },
  { name: 'Телефонные продажи', patterns: ['телефонн', 'звонк', 'телемаркетинг'] },
  { name: 'Развитие клиентской базы', patterns: ['развитие клиентской', 'расширение клиентской', 'привлечение клиентов'] },
];

function extractSalary(text: string): number | null {
  const matches = [...text.matchAll(/(?:от|до)?\s*([0-9][0-9\s]{2,7})\s*(?:₽|руб|руб\.?|тыс\.?\s*руб)/gi)]
    .map(m => Number(m[1].replace(/\s/g, '')))
    .filter(n => Number.isFinite(n));
  if (!matches.length) return null;
  const normalized = matches.map(n => n < 10000 ? n * 1000 : n);
  return Math.round(normalized.reduce((a, b) => a + b, 0) / normalized.length);
}

function extractRegion(text: string): string {
  const known = ['Москва', 'Санкт-Петербург', 'Московская область', 'Краснодар', 'Сочи', 'Екатеринбург', 'Казань', 'Новосибирск', 'Ростов-на-Дону', 'Астана', 'Баку', 'Удалённая работа', 'Удаленная работа'];
  const found = known.find(item => text.toLowerCase().includes(item.toLowerCase()));
  return found ?? 'Не указан';
}

function parsePastedText(raw: string): MarketRow[] {
  const cleaned = raw.replace(/\r/g, '').trim();
  if (!cleaned) return [];

  const blocks = cleaned.split(/\n\s*\n+/).map(x => x.trim()).filter(Boolean);
  return blocks.map((text, index) => {
    const lines = text.split('\n').map(x => x.trim()).filter(Boolean);
    const title = lines[0]?.replace(/^(вакансия|резюме)\s*[:№-]?\s*/i, '').trim() || `Запись ${index + 1}`;
    return {
      id: `${Date.now()}-${index}`,
      title: title.slice(0, 180),
      region: extractRegion(text),
      salary: extractSalary(text),
      text,
    };
  });
}

function median(values: number[]): number | null {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : Math.round((sorted[middle - 1] + sorted[middle]) / 2);
}

function formatMoney(value: number | null) {
  return value === null ? '—' : `${new Intl.NumberFormat('ru-RU').format(value)} ₽`;
}

export function HHMarketCollectorPage() {
  const navigate = useNavigate();
  const [sourceType, setSourceType] = useState<'vacancies' | 'resumes'>('vacancies');
  const [raw, setRaw] = useState('');
  const [rows, setRows] = useState<MarketRow[]>([]);
  const [error, setError] = useState('');

  const stats = useMemo<SkillStat[]>(() => {
    if (!rows.length) return [];
    return SKILL_RULES.map(rule => {
      const matched = rows.filter(row => rule.patterns.some(pattern => row.text.toLowerCase().includes(pattern)));
      if (!matched.length) return null;
      return {
        skill: rule.name,
        count: matched.length,
        share: Math.round((matched.length / rows.length) * 100),
        salaryMedian: median(matched.map(row => row.salary).filter((x): x is number => x !== null)),
      };
    }).filter(Boolean).sort((a, b) => (b?.count ?? 0) - (a?.count ?? 0)) as SkillStat[];
  }, [rows]);

  const importText = () => {
    setError('');
    const parsed = parsePastedText(raw);
    if (!parsed.length) {
      setError('Не удалось найти записи. Вставьте текст вакансий или резюме, разделяя записи пустой строкой.');
      return;
    }
    setRows(prev => [...prev, ...parsed]);
    setRaw('');
  };

  const clear = () => setRows([]);

  const exportCsv = () => {
    const header = ['source', 'title', 'region', 'salary', 'text'];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = [header, ...rows.map(row => [sourceType === 'vacancies' ? 'hh.ru/vacancies' : 'hh.ru/resumes', row.title, row.region, row.salary?.toString() ?? '', row.text])]
      .map(row => row.map(escape).join(';')).join('\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `incore-hh-${sourceType}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-4 md:p-8 space-y-6 max-w-7xl mx-auto">
      <div className="flex items-start gap-3">
        <button onClick={() => navigate('/ceo/roles/decompose')} className="p-2 rounded-xl hover:bg-[#000052]/5 text-[#000052]" aria-label="Назад">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-[26px] md:text-3xl font-bold text-[#000052]">HH Market Collector</h1>
          <p className="text-sm text-gray-500 mt-1">Прототип анализа рынка навыков для роли «Страховой агент».</p>
        </div>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-900">
        <b>Как работает прототип:</b> данные из HH не запрашиваются автоматически. Ты копируешь доступный текст из HH и вставляешь его сюда. Обработка происходит в браузере. Это временный сборщик до официальной интеграции через API.
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6 space-y-5">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setSourceType('vacancies')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${sourceType === 'vacancies' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Вакансии</button>
          <button onClick={() => setSourceType('resumes')} className={`px-4 py-2 rounded-xl text-sm font-semibold ${sourceType === 'resumes' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Резюме</button>
        </div>

        <div>
          <label className="block text-sm font-semibold text-[#000052] mb-2">Вставь скопированный текст HH</label>
          <textarea value={raw} onChange={e => setRaw(e.target.value)} rows={10} placeholder={sourceType === 'vacancies' ? 'Например: Страховой агент\nМосква\nот 100 000 ₽\nПродажи, работа с клиентами, страхование...' : 'Например: Страховой агент\nМосква\nЖелаемая зарплата 150 000 ₽\nПродажи, страхование, B2B...'} className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm text-[#000052] resize-y focus:outline-none focus:ring-2 focus:ring-[#B8860B]/20" />
        </div>

        {error && <div className="p-3 rounded-xl bg-red-50 text-red-700 text-sm">{error}</div>}

        <div className="flex flex-wrap gap-3">
          <button onClick={importText} disabled={!raw.trim()} className="inline-flex items-center gap-2 px-5 py-3 bg-[#000052] text-white rounded-xl font-semibold disabled:opacity-40"><ClipboardPaste className="w-4 h-4" /> Обработать текст</button>
          <button onClick={exportCsv} disabled={!rows.length} className="inline-flex items-center gap-2 px-5 py-3 border border-gray-200 text-[#000052] rounded-xl font-semibold disabled:opacity-40"><Download className="w-4 h-4" /> Скачать CSV</button>
          <button onClick={clear} disabled={!rows.length} className="inline-flex items-center gap-2 px-5 py-3 text-red-600 rounded-xl font-semibold disabled:opacity-40"><Trash2 className="w-4 h-4" /> Очистить</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Загружено записей</div><div className="text-3xl font-bold text-[#000052] mt-1">{rows.length}</div></div>
        <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">С зарплатой</div><div className="text-3xl font-bold text-[#000052] mt-1">{rows.filter(r => r.salary !== null).length}</div></div>
        <div className="bg-white rounded-2xl shadow-sm p-5"><div className="text-sm text-gray-500">Медианная зарплата</div><div className="text-3xl font-bold text-[#000052] mt-1">{formatMoney(median(rows.map(r => r.salary).filter((x): x is number => x !== null)))}</div></div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Навыки в выборке</h2></div>
        {!stats.length ? <div className="text-sm text-gray-400 py-6 text-center">После импорта здесь появится анализ навыков.</div> : (
          <div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="text-left text-gray-400 border-b"><th className="py-3 pr-4">Навык</th><th className="py-3 pr-4">Записей</th><th className="py-3 pr-4">Доля</th><th className="py-3">Медианная зарплата</th></tr></thead><tbody>{stats.map(stat => <tr key={stat.skill} className="border-b last:border-0"><td className="py-3 pr-4 font-semibold text-[#000052]">{stat.skill}</td><td className="py-3 pr-4">{stat.count}</td><td className="py-3 pr-4">{stat.share}%</td><td className="py-3">{formatMoney(stat.salaryMedian)}</td></tr>)}</tbody></table></div>
        )}
      </div>

      <div className="bg-white rounded-2xl shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4"><Upload className="w-5 h-5 text-[#B8860B]" /><h2 className="text-lg font-bold text-[#000052]">Последние записи</h2></div>
        {!rows.length ? <div className="text-sm text-gray-400">Пока ничего не загружено.</div> : <div className="space-y-2">{rows.slice(-10).reverse().map(row => <div key={row.id} className="p-3 rounded-xl bg-gray-50 flex items-center justify-between gap-4"><div className="min-w-0"><div className="font-semibold text-[#000052] truncate">{row.title}</div><div className="text-xs text-gray-500 mt-1">{row.region} · {formatMoney(row.salary)}</div></div><span className="text-xs text-gray-400">{sourceType === 'vacancies' ? 'Вакансия' : 'Резюме'}</span></div>)}</div>}
      </div>
    </div>
  );
}
