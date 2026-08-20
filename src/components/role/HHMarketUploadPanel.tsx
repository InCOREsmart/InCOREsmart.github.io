import { ChangeEvent, useEffect, useState } from 'react';
import { Download, FileUp, RefreshCw, Trash2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

type SourceType = 'vacancy' | 'resume';
type Country = 'RU' | 'AZ';

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

type AutomaticCounts = { vacancies: number; resumes: number };

const ROLE_KEY = 'insurance_agent';
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
};

function cleanText(value: string) {
  return value.replace(/\u00a0/g, ' ').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim();
}

function detectSkills(text: string) {
  const lower = text.toLowerCase();
  return Object.entries(SKILL_PATTERNS).filter(([, patterns]) => patterns.some(pattern => lower.includes(pattern))).map(([name]) => name);
}

function parseFile(content: string, fileName: string, sourceType: SourceType): MarketProfile {
  let text = content;
  let title = '';
  if (/\.html?$/i.test(fileName)) {
    const doc = new DOMParser().parseFromString(content, 'text/html');
    doc.querySelectorAll('script,style,noscript,svg').forEach(node => node.remove());
    text = cleanText(doc.body?.innerText || doc.documentElement?.textContent || '');
    title = cleanText(doc.querySelector('h1')?.textContent || doc.querySelector('meta[property="og:title"]')?.getAttribute('content') || '');
  } else text = cleanText(content);
  if (!title) title = text.split('\n').find(line => line.trim().length >= 4)?.slice(0, 180) || (sourceType === 'vacancy' ? 'Вакансия HH' : 'Резюме HH');
  return { source_type: sourceType, source_name: fileName, title, region: 'Не указан', salary: null, text, skills: detectSkills(text) };
}

export function HHMarketUploadPanel() {
  const [sourceType, setSourceType] = useState<SourceType>('vacancy');
  const [country, setCountry] = useState<Country>('RU');
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [counts, setCounts] = useState<AutomaticCounts>({ vacancies: 0, resumes: 0 });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploadProgress, setUploadProgress] = useState<{ current: number; total: number } | null>(null);

  const load = async () => {
    setLoading(true);
    setError('');
    const [vacancyCount, resumeCount, manualResult] = await Promise.all([
      supabase.from('hh_vacancies').select('id', { count: 'exact', head: true }).eq('role_key', ROLE_KEY).eq('country', country),
      supabase.from('hh_market_resumes').select('id', { count: 'exact', head: true }).eq('role_key', ROLE_KEY).eq('country', country),
      supabase.from('market_profiles').select('id, source_type, text, salary, skills, source_name, title, region').order('created_at', { ascending: false }),
    ]);
    const errors = [vacancyCount.error, resumeCount.error, manualResult.error].filter(Boolean);
    if (errors.length) setError(`Не удалось загрузить данные рынка: ${errors.map(item => item?.message).join('; ')}`);
    setCounts({ vacancies: vacancyCount.count ?? 0, resumes: resumeCount.count ?? 0 });
    setProfiles((manualResult.data ?? []) as MarketProfile[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, [country]);

  const importFiles = async (files: FileList | File[]) => {
    setError('');
    const selected = Array.from(files).filter(file => /\.(html?|txt)$/i.test(file.name) || file.type === 'text/html' || file.type === 'text/plain').slice(0, 50);
    if (!selected.length) { setError('Поддерживаются HTML, HTM и TXT.'); return; }
    setSaving(true);
    setUploadProgress({ current: 0, total: selected.length });
    let uploaded = 0;
    let skipped = 0;
    try {
      const parsed: MarketProfile[] = [];
      for (let i = 0; i < selected.length; i += 1) {
        parsed.push(parseFile(await selected[i].text(), selected[i].name, sourceType));
        setUploadProgress({ current: i + 1, total: selected.length });
      }
      for (let i = 0; i < parsed.length; i += 10) {
        const batch = parsed.slice(i, i + 10);
        const names = batch.map(row => row.source_name).filter(Boolean) as string[];
        const { data: existing, error: existingError } = await supabase.from('market_profiles').select('source_name').eq('source_type', sourceType).in('source_name', names);
        if (existingError) { skipped += batch.length; continue; }
        const existingNames = new Set((existing ?? []).map(row => row.source_name));
        const newRows = batch.filter(row => !existingNames.has(row.source_name));
        skipped += batch.length - newRows.length;
        if (!newRows.length) continue;
        const { data, error: insertError } = await supabase.from('market_profiles').insert(newRows).select('id, source_type, text, salary, skills, source_name, title, region');
        if (!insertError) { uploaded += data?.length ?? 0; setProfiles(prev => [...((data ?? []) as MarketProfile[]), ...prev]); }
        else skipped += newRows.length;
      }
      setError(`Загружено вручную: ${uploaded}. Уже были в базе или не сохранены: ${skipped}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Не удалось обработать файлы.');
    } finally {
      setSaving(false);
      setUploadProgress(null);
    }
  };

  const onFile = (event: ChangeEvent<HTMLInputElement>) => { if (event.target.files) void importFiles(event.target.files); event.target.value = ''; };

  const clearManual = async (type: SourceType) => {
    setError('');
    const { error: deleteError } = await supabase.from('market_profiles').delete().eq('source_type', type);
    if (deleteError) { setError(deleteError.message); return; }
    setProfiles(prev => prev.filter(row => row.source_type !== type));
  };

  const exportCsv = () => {
    const rows = [['source_type', 'title', 'region', 'salary', 'skills', 'text'], ...profiles.map(row => [row.source_type, row.title ?? '', row.region ?? '', row.salary?.toString() ?? '', (row.skills ?? []).join(', '), row.text])];
    const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const csv = rows.map(row => row.map(escape).join(';')).join('\n');
    const url = URL.createObjectURL(new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a'); link.href = url; link.download = `incore-hh-manual-${new Date().toISOString().slice(0, 10)}.csv`; link.click(); URL.revokeObjectURL(url);
  };

  const manualVacancies = profiles.filter(row => row.source_type === 'vacancy').length;
  const manualResumes = profiles.filter(row => row.source_type === 'resume').length;
  const currentManual = profiles.filter(row => row.source_type === sourceType);

  return <div className="bg-white rounded-xl border border-[#000052]/10 overflow-hidden">
    <div className="p-6 border-b border-[#000052]/10">
      <div className="flex items-start justify-between gap-4">
        <div><h2 className="text-xl font-bold text-[#000052]">Данные рынка труда</h2><p className="text-sm text-[#000052]/60 mt-1">Автоматическая база HH и отдельная ручная выборка для анализа Skill Gap.</p></div>
        <button onClick={() => void load()} className="p-2 rounded-lg hover:bg-[#000052]/5 text-[#000052]" title="Обновить"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /></button>
      </div>

      <div className="flex flex-wrap gap-2 mt-5">
        {(['RU', 'AZ'] as Country[]).map(code => <button key={code} onClick={() => setCountry(code)} className={`px-4 py-2 rounded-lg text-sm font-semibold ${country === code ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>{code === 'RU' ? 'Россия' : 'Азербайджан'}</button>)}
      </div>

      <div className="grid grid-cols-2 gap-3 mt-4">
        <div className="rounded-xl bg-[#000052]/5 p-4"><div className="text-xs text-[#000052]/60">Вакансий в автоматической базе</div><div className="text-3xl font-bold text-[#000052] mt-1">{loading ? '…' : counts.vacancies.toLocaleString()}</div><div className="text-xs text-[#000052]/60 mt-1">{country === 'AZ' ? 'Азербайджан' : 'Россия'} · HH</div></div>
        <div className="rounded-xl bg-[#000052]/5 p-4"><div className="text-xs text-[#000052]/60">Резюме в автоматической базе</div><div className="text-3xl font-bold text-[#000052] mt-1">{loading ? '…' : counts.resumes.toLocaleString()}</div><div className="text-xs text-[#000052]/60 mt-1">{country === 'AZ' ? 'Азербайджан' : 'Россия'} · HH</div></div>
      </div>

      <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#000052]/70"><span className="px-3 py-1.5 rounded-full bg-green-50 text-green-700">Автоматически: {counts.vacancies.toLocaleString()} вакансий + {counts.resumes.toLocaleString()} резюме</span><span className="px-3 py-1.5 rounded-full bg-gray-100">Ручная выборка: {manualVacancies} + {manualResumes}</span></div>

      <div className="flex flex-wrap gap-2 mt-5"><button onClick={() => setSourceType('vacancy')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${sourceType === 'vacancy' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Ручные вакансии</button><button onClick={() => setSourceType('resume')} className={`px-4 py-2 rounded-lg text-sm font-semibold ${sourceType === 'resume' ? 'bg-[#000052] text-white' : 'bg-gray-100 text-[#000052]'}`}>Ручные резюме</button></div>
      <label className="mt-4 block border-2 border-dashed border-gray-200 rounded-2xl p-5 text-center cursor-pointer hover:border-[#B8860B]/50"><FileUp className="w-6 h-6 mx-auto text-[#B8860B]" /><div className="mt-2 font-semibold text-[#000052]">Загрузить вручную</div><div className="text-xs text-gray-400 mt-1">До 50 файлов за один раз · HTML / HTM / TXT</div><input type="file" multiple accept=".html,.htm,.txt,text/html,text/plain" onChange={onFile} className="hidden" /></label>
      {uploadProgress && <div className="mt-4 text-xs text-[#000052]/60">Обработано {uploadProgress.current} / {uploadProgress.total}</div>}
      <div className="flex flex-wrap gap-3 mt-3"><button onClick={exportCsv} disabled={!profiles.length} className="inline-flex items-center gap-2 px-4 py-2.5 border border-gray-200 text-[#000052] rounded-xl font-semibold text-sm disabled:opacity-40"><Download className="w-4 h-4" />Скачать CSV</button><button onClick={() => void clearManual('vacancy')} disabled={!manualVacancies || saving} className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 rounded-xl font-semibold text-sm disabled:opacity-40"><Trash2 className="w-4 h-4" />Очистить ручные вакансии</button><button onClick={() => void clearManual('resume')} disabled={!manualResumes || saving} className="inline-flex items-center gap-2 px-4 py-2.5 text-red-600 rounded-xl font-semibold text-sm disabled:opacity-40"><Trash2 className="w-4 h-4" />Очистить ручные резюме</button></div>
      {saving && <div className="text-sm text-gray-500 mt-3">Обрабатываем файлы…</div>}
      {error && <div className={`mt-3 p-3 rounded-xl text-sm ${error.startsWith('Загружено') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>{error}</div>}
    </div>
    <div className="border-t border-[#000052]/10 p-5"><div className="text-sm font-semibold text-[#000052]">Ручная выборка · {sourceType === 'vacancy' ? 'вакансии' : 'резюме'}</div><div className="text-xs text-[#000052]/60 mt-1">{currentManual.length} записей. Автоматическая база выше считается отдельно и не смешивается с ручными файлами.</div></div>
  </div>;
}
