import { ChangeEvent, useEffect, useState } from 'react';
import { Download, FileUp, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type SourceType = 'vacancy' | 'resume';

type MarketProfile = {
  id?: string;
  source_type: SourceType;
  text: string;
  salary: number | null;
  skills: string[] | null;
  source_name?: string;
  title?: string;
  region?: string;
};

const SKILL_PATTERNS: Record<string, string[]> = {
  'Корпоративные продажи': ['b2b', 'b2б', 'корпоративн', 'юридическ'],
  'Кросс-продажи': ['кросс-продаж', 'cross-sell', 'cross sell', 'crosssell', 'допродаж'],
  'Продление договоров': ['продлен', 'пролонгац'],
  'Телефонные продажи': ['телефонн', 'телемаркетинг', 'холодных звон', 'cold call'],
  'Переговоры': ['переговор', 'деловые встречи'],
  'Продажи': ['продаж', 'продавать', 'активные продажи'],
  'Страхование': ['страхован', 'страховой'],
  'Работа с клиентами': ['работа с клиент', 'клиентск', 'клиентами', 'клиентскую баз'],
  'План продаж': ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'],
  'CRM': ['crm', 'битрикс', 'amocrm', 'salesforce'],
  'Развитие клиентской базы': ['развитие клиентской', 'расширение клиентской', 'привлечение клиентов'],
};

const REGIONS = ['Москва', 'Санкт-Петербург', 'Московская область', 'Краснодар', 'Сочи', 'Екатеринбург', 'Казань', 'Новосибирск', 'Ростов-на-Дону', 'Баку', 'Астана', 'Удалённая работа', 'Удаленная работа'];
const IMPORT_BATCH_SIZE = 10;

function cleanText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function median(values: number[]) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const m = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[m] : Math.round((sorted[m - 1] + sorted[m]) / 2);
}

function salary(text: string) {
  const values: number[] = [];
  const normalized = text.replace(/\u00a0/g, ' ');
  for (const m of normalized.matchAll(/([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)?\s*[-–—]\s*([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)/gi)) {
    const a = Number(m[1].replace(/\s/g, ''));
    const b = Number(m[2].replace(/\s/g, ''));
    const aa = a < 10000 ? a * 1000 : a;
    const bb = b < 10000 ? b * 1000 : b;
    if (aa >= 20000 && bb <= 1000000) values.push((aa + bb) / 2);
  }
  if (values.length) return Math.round(median(values)!);
  for (const m of normalized.matchAll(/(?:от|до|зарплата|оклад)?\s*([0-9][0-9\s]{2,8})\s*(?:₽|руб(?:\.?|лей)?|тыс\.?\s*руб)/gi)) {
    const v = Number(m[1].replace(/\s/g, ''));
    const n = v < 10000 ? v * 1000 : v;
    if (n >= 20000 && n <= 1000000) values.push(n);
  }
  return median(values);
}

function skills(text: string) {
  const lower = text.toLowerCase();
  return Object.entries(SKILL_PATTERNS)
    .filter(([, patterns]) => patterns.some(pattern => lower.includes(pattern)))
    .map(([name]) => name);
}

function parse(content: string, fileName: string, sourceType: SourceType): MarketProfile {
  let text = content;
  let title = '';
  if (/\.html?$/i.test(fileName)) {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('script,style,noscript,svg').forEach(node => node.remove());
    text = cleanText(doc.body?.innerText || doc.documentElement?.textContent || '');
    title = cleanText(doc.querySelector('h1')?.textContent || doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '');
  } else {
    text = cleanText(content);
  }
  if (!title) title = text.split('\n').map(cleanText).find(line => line.length >= 4 && line.length <= 180) || (sourceType === 'vacancy' ? 'Вакансия HH' : 'Резюме HH');
  const lower = text.toLowerCase();
  return { source_type: sourceType, source_name: fileName, title, region: REGIONS.find(region => lower.includes(region.toLowerCase())) || 'Не указан', salary: salary(text), text, skills: skills(text) };
}

export function HHMarketUploadPanel() {
  const [sourceType, setSourceType] = useState<SourceType>('vacancy');
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error: loadError } = await supabase.from('market_profiles').select('id, source_type, text, salary, skills, source_name, title, region').order('created_at', { ascending: false });
    if (loadError) setError(loadError.message);
    else setProfiles((data ?? []) as MarketProfile[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const importFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files).filter(file => /\.(html?|txt)$/i.test(file.name) || file.type === 'text/html' || file.type === 'text/plain').slice(0, 50);
    if (!selected.length) { setError('Поддерживаются HTML, HTM и TXT.'); return; }
    if (selected.length === 50 && Array.from(files).length > 50) setError('Можно загрузить максимум 50 файлов за один раз.');

    setSaving(true);
    setUploadProgress({ current: 0, total: selected.length });
    let uploaded = 0;
    let skipped = 0;
    let failed = 0;

    try {
      const parsed: MarketProfile[] = [];
      for (let i = 0; i < selected.length; i += 1) {
        try { parsed.push(parse(await selected[i].text(), selected[i].name, sourceType)); }
        catch { failed += 1; }
        setUploadProgress({ current: i + 1, total: selected.length });
      }

      if (!parsed.length) { setError('Не удалось прочитать выбранные файлы.'); return; }

      const inserted: MarketProfile[] = [];
      for (let i = 0; i < parsed.length; i += IMPORT_BATCH_SIZE) {
        const parsedBatch = parsed.slice(i, i + IMPORT_BATCH_SIZE);
        const names = [...new Set(parsedBatch.map(row => row.source_name).filter(Boolean))];

        const { data: existing, error: existingError } = await supabase
          .from('market_profiles')
          .select('source_name')
          .eq('source_type', sourceType)
          .in('source_name', names);

        if (existingError) {
          failed += parsedBatch.length;
          continue;
        }

        const existingNames = new Set((existing ?? []).map(row => row.source_name));
        const newRows = parsedBatch.filter(row => !existingNames.has(row.source_name));
        skipped += parsedBatch.length - newRows.length;

        if (!newRows.length) continue;

        const { data, error: insertError } = await supabase
          .from('market_profiles')
          .insert(newRows)
          .select('id, source_type, text, salary, skills, source_name, title, region');

        if (insertError) {
          failed += newRows.length;
          continue;
        }

        inserted.push(...((data ?? []) as MarketProfile[]));
        uploaded += newRows.length;
      }

      if (inserted.length) setProfiles(prev => [...inserted, ...prev]);
      if (failed) setError(`Загружено ${uploaded} из ${selected.length}. Пропущено: ${skipped}. Ошибок: ${failed}.`);
      else setError(`Загружено: ${uploaded}. Уже были в базе: ${skipped}.`);
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) void importFiles(event.target.files); event.target.value = ''; };
  const removeProfile = async (id: string) => { setError(''); setDeletingId(id); const { error: deleteError } = await supabase.from('market_profiles').delete().eq('id', id); setDeletingId(null); if (deleteError) { setError(deleteError.message); return; } setProfiles(prev => prev.filter(row => row.id !== id)); };
  const clear = async (type: SourceType) => { setError(''); const { error: deleteError } = await supabase.from('market_profiles').delete().eq('source_type', type); if (deleteError) { setError(deleteError.message); return; } setProfiles(prev => prev.filter(row => row.source_type !== type)); };
  const exportCsv = () => { const rows = [['source_type', 'title', 'region', 'salary', 'skills', 'text'], ...profiles.map(row => [row.source_type, row.title ?? '', row.region ?? '', row.salary?.toString() ?? '', (row.skills ?? []).join(', '), row.text])]; const escape = (v: string) => `"${v.replace(/"/g, '""')}"`; const csv = rows.map(row => row.map(escape).join(';')).join('\n'); const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })); const link = document.createElement('a'); link.href = url; link.download = `incore-hh-market-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url); };

  const vacancies = profiles.filter(row => row.source_type === 'vacancy').length;
  const resumes = profiles.filter(row => row.source_type === 'resume').length;
  const visibleProfiles = profiles.filter(row => row.source_type === sourceType);

  return <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
    <div className="p-6 border-b border-[#000052]/10">
      <div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-[#000052]">Данные рынка труда</h2><p className="text-sm text-[#000052]/60 mt-1">Загрузка и обновление базы вакансий и резюме для анализа Skill Gap.</p></div><button onClick={() => void load()} className="p-2 rounded-lg hover:bg-[#000052]/5 text-[#000052]" title="Обновить"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button></div>
      <div className="flex flex-wrap gap-2 mt-5"><button onClick={() => setSourceType('vacancy')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${sourceType === 'vacancy' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Вакансии HH</button><button onClick={() => setSourceType('resume')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${sourceType === 'resume' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Резюме HH</button></div>
      <label className="mt-4 block border-2 border-dashed border-gray-200 rounded-2xl p-6 text-center cursor-pointer hover:border-[#B8860B]/50"><FileUp className="w-6 h-6 mx-auto text-[#B8860B]" /><div className="mt-2 font-semibold text-[#000052]">Загрузить {sourceType === 'vacancy' ? 'вакансии' : 'резюме'} HH</div><div className="text-xs text-gray-400 mt-1">До 50 файлов за один раз · HTML / HTM / TXT</div><input type="file" multiple accept=".html,.htm,.txt,text/html,text/plain" onChange={onFile} className="hidden" /></label>
      {uploadProgress && <div className="mt-4"><div className="flex justify-between text-xs text-[#000052]/60 mb-1"><span>Загрузка файлов</span><span>{uploadProgress.current} / {uploadProgress.total}</span></div><div className="h-2 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-[#000052] transition-all" style={{ width: `${Math.round((uploadProgress.current / uploadProgress.total) * 100)}%` }} /></div></div>}
      <div className="flex flex-wrap gap-3 mt-3"><button onClick={exportCsv} disabled={!profiles.length} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-[#000052] rounded-xl font-semibold text-sm disabled:opacity-40"><Download className="w-4 h-4" />Скачать CSV</button><button onClick={() => void clear('vacancy')} disabled={!vacancies || saving} className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 rounded-xl font-semibold text-sm disabled:opacity-40"><Trash2 className="w-4 h-4" />Очистить вакансии</button><button onClick={() => void clear('resume')} disabled={!resumes || saving} className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 rounded-xl font-semibold text-sm disabled:opacity-40"><Trash2 className="w-4 h-4" />Очистить резюме</button></div>
      {saving && <div className="text-sm text-gray-500 mt-3">Обрабатываем файлы…</div>}{error && <div className={`mt-3 p-3 rounded-xl text-sm ${error.startsWith('Загружено') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{error}</div>}
    </div>
    <div className="grid grid-cols-2 border-t border-[#000052]/10"><div className="p-4"><div className="text-xs text-[#000052]/60">Вакансий в базе</div><div className="text-2xl font-bold text-[#000052] mt-1">{vacancies}</div></div><div className="p-4 border-l border-[#000052]/10"><div className="text-xs text-[#000052]/60">Резюме в базе</div><div className="text-2xl font-bold text-[#000052] mt-1">{resumes}</div></div></div>
    <div className="border-t border-[#000052]/10 p-6"><div className="flex items-center justify-between gap-3 mb-4"><h3 className="font-bold text-[#000052]">{sourceType === 'vacancy' ? 'Загруженные вакансии' : 'Загруженные резюме'}</h3><span className="text-xs text-[#000052]/50">{visibleProfiles.length} в текущем разделе</span></div>{visibleProfiles.length === 0 ? <div className="text-sm text-gray-400 py-4">В этом разделе пока нет загруженных данных.</div> : <div className="space-y-2">{visibleProfiles.map(profile => <div key={profile.id} className="flex items-center justify-between gap-4 p-3 rounded-xl border border-gray-100 hover:bg-gray-50"><div className="min-w-0"><div className="font-semibold text-sm text-[#000052] truncate">{profile.title || profile.source_name || 'Без названия'}</div><div className="text-xs text-gray-500 truncate mt-1">{profile.source_name || 'Файл без имени'}</div></div><button onClick={() => profile.id && void removeProfile(profile.id)} disabled={!profile.id || deletingId === profile.id || saving} className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-red-600 hover:bg-red-50 text-xs font-semibold disabled:opacity-50" title="Удалить только эту запись"><Trash2 className="w-4 h-4" />{deletingId === profile.id ? 'Удаляем…' : 'Удалить'}</button></div>)}</div>}</div>
  </div>;
}
