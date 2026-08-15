import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, BarChart3, CheckCircle2, Lightbulb, RefreshCw, Target, TrendingDown, TrendingUp } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { SkillDefinition } from '../../types/decomposition';

type MarketProfile = { source_type: 'vacancy' | 'resume'; text: string; salary: number | null; skills: string[] | null; title?: string; region?: string };
type Stat = { skill: SkillDefinition; vacancies: number; resumes: number; vacancyShare: number | null; resumeShare: number | null; gap: number | null; vacancySalaryMedian: number | null };
type Connection = { from: string; to: string; verb: string; strength: number; kind: 'related' | 'enhances' | 'requires' };

const MATCHES: Record<string, { names: string[]; patterns: string[] }> = {
  'Продажи корпоративного страхования': { names: ['Корпоративные продажи', 'Страхование', 'Продажи'], patterns: ['корпоративн', 'b2b', 'страхован', 'страховой', 'продаж'] },
  'Удержание клиентов': { names: ['Работа с клиентами', 'Развитие клиентской базы', 'Продление договоров'], patterns: ['удержан', 'продлен', 'пролонгац', 'клиентск'] },
  'Кросс-продажи': { names: ['Кросс-продажи'], patterns: ['кросс-продаж', 'cross-sell', 'cross sell', 'допродаж'] },
  'Выполнение плана продаж': { names: ['План продаж', 'Продажи'], patterns: ['план продаж', 'выполнения плана', 'выполнение плана', 'kpi'] },
  'Удержание 90 дней': { names: [], patterns: ['удержание 90', '90 дней', 'retention'] },
  'Долгосрочная результативность': { names: ['План продаж'], patterns: ['годовой результат', 'долгосрочн', 'годовых целей', 'kpi'] },
};

const CONNECTIONS: Connection[] = [
  { from: 'Продажи корпоративного страхования', to: 'Удержание клиентов', verb: 'связано с', strength: 68, kind: 'related' },
  { from: 'Продажи корпоративного страхования', to: 'Кросс-продажи', verb: 'связано с', strength: 62, kind: 'related' },
  { from: 'Продажи корпоративного страхования', to: 'Выполнение плана продаж', verb: 'усиливает', strength: 55, kind: 'enhances' },
  { from: 'Удержание 90 дней', to: 'Продажи корпоративного страхования', verb: 'требует', strength: 80, kind: 'requires' },
  { from: 'Долгосрочная результативность', to: 'Удержание 90 дней', verb: 'требует', strength: 70, kind: 'requires' },
  { from: 'Долгосрочная результативность', to: 'Выполнение плана продаж', verb: 'требует', strength: 65, kind: 'requires' },
];

function median(values: number[]) { if (!values.length) return null; const sorted = [...values].sort((a, b) => a - b); const m = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[m] : Math.round((sorted[m - 1] + sorted[m]) / 2); }
function money(value: number | null) { return value === null ? '—' : `${new Intl.NumberFormat('ru-RU').format(Math.round(value))} ₽`; }
function matches(profile: MarketProfile, mapping: { names: string[]; patterns: string[] }) { const text = (profile.text || '').toLowerCase(); const skills = Array.isArray(profile.skills) ? profile.skills : []; return mapping.names.some(name => skills.includes(name)) || mapping.patterns.some(pattern => text.includes(pattern)); }
function recommendation(stat: Stat, rank: number) {
  const gap = stat.gap ?? 0;
  const weight = stat.skill.weight * 100;
  const intensity = gap >= 20 && weight >= 20 ? 'Критический' : gap >= 20 ? 'Высокий' : gap > 0 ? 'Средний' : 'Низкий';
  let action = 'Закрепить навык в профиле роли и регулярно проверять его наличие у кандидатов.';
  if (gap >= 20) action = stat.resumes === 0 ? 'Проверять навык уже на первом этапе отбора и добавить практический кейс: рынок требует его, а подтверждённых кандидатов пока нет.' : 'Проверять навык через реальные кейсы и вопросы о результатах, а не только по ключевым словам в резюме.';
  else if (gap > 0) action = 'Оставить навык в фокусе отбора, но не завышать порог: дефицит умеренный.';
  else if (gap <= -20) action = 'Не делать навык главным фильтром: предложение кандидатов выше спроса. Использовать его как дополнительный критерий.';
  else if (gap < 0) action = 'Навык доступен на рынке в достаточном количестве. Использовать его как дополнительный критерий при равных кандидатах.';
  return { intensity, action, rank, weight };
}

export function RoleMarketAnalysis({ skills }: { skills: SkillDefinition[] }) {
  const [profiles, setProfiles] = useState<MarketProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = async () => {
    setLoading(true); setError('');
    const { data, error: queryError } = await supabase.from('market_profiles').select('source_type, text, salary, skills, title, region').order('created_at', { ascending: false });
    if (queryError) { setError(`Не удалось загрузить данные рынка: ${queryError.message}`); setProfiles([]); }
    else setProfiles((data ?? []) as MarketProfile[]);
    setLoading(false);
  };

  useEffect(() => { void load(); }, []);

  const stats = useMemo<Stat[]>(() => {
    const vacancies = profiles.filter(p => p.source_type === 'vacancy');
    const resumes = profiles.filter(p => p.source_type === 'resume');
    return skills.map(skill => {
      const mapping = MATCHES[skill.name] ?? { names: [skill.name], patterns: [skill.name.toLowerCase()] };
      const mv = vacancies.filter(p => matches(p, mapping));
      const mr = resumes.filter(p => matches(p, mapping));
      const vacancyShare = vacancies.length ? mv.length / vacancies.length * 100 : null;
      const resumeShare = resumes.length ? mr.length / resumes.length * 100 : null;
      const gap = vacancyShare !== null && resumeShare !== null ? vacancyShare - resumeShare : null;
      const salaries = mv.map(p => p.salary).filter((v): v is number => v !== null);
      return { skill, vacancies: mv.length, resumes: mr.length, vacancyShare, resumeShare, gap, vacancySalaryMedian: median(salaries) };
    });
  }, [profiles, skills]);

  const ordered = useMemo(() => [...stats].sort((a, b) => (b.gap ?? -Infinity) - (a.gap ?? -Infinity)), [stats]);
  const critical = ordered.filter(s => (s.gap ?? -Infinity) >= 20);
  const surplus = ordered.filter(s => (s.gap ?? Infinity) <= -20);
  const balance = ordered.filter(s => s.gap !== null && s.gap > -20 && s.gap < 20);
  const recommendations = useMemo(() => critical.map((stat, index) => ({ stat, ...recommendation(stat, index + 1) })).sort((a, b) => b.stat.gap! - a.stat.gap!), [critical]);
  const topOpportunity = useMemo(() => [...stats].filter(s => s.gap !== null && s.gap > 0).sort((a, b) => ((b.gap ?? 0) * b.skill.weight) - ((a.gap ?? 0) * a.skill.weight))[0], [stats]);
  const visibleSkillNames = useMemo(() => new Set(skills.map(skill => skill.name)), [skills]);
  const connections = useMemo(() => CONNECTIONS.filter(connection => visibleSkillNames.has(connection.from) && visibleSkillNames.has(connection.to)), [visibleSkillNames]);
  const marketSummary = useMemo(() => {
    if (!profiles.length) return '';
    if (critical.length) return `Рынок показывает дефицит ${critical.length === 1 ? 'одного навыка' : `${critical.length} навыков`}. В первую очередь усиливаем точность поиска и проверки кандидатов по навыкам с максимальным разрывом и весом роли.`;
    if (surplus.length) return 'Критического дефицита нет. Рынок кандидатов в целом покрывает требования роли, поэтому можно повышать точность отбора по наиболее важным для результата навыкам.';
    return 'Рынок и предложение кандидатов находятся в относительном балансе. Основной резерв улучшения сейчас не в расширении поиска, а в качестве оценки кандидатов.';
  }, [profiles.length, critical.length, surplus.length]);

  return <section className="role-market-analysis bg-white rounded-2xl shadow-sm overflow-hidden">
    <div className="p-5 md:p-6 border-b border-gray-100">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0"><div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center shrink-0"><BarChart3 className="w-5 h-5 text-[#B8860B]" /></div><div className="min-w-0"><h3 className="font-bold text-[#000052] text-lg break-words">Карта рынка навыков</h3><p className="text-sm text-gray-500 mt-1 break-words">Рыночные данные сопоставлены с требованиями этой роли.</p></div></div>
        <button onClick={() => void load()} className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 text-[#000052] text-sm font-semibold shrink-0"><RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />Обновить</button>
      </div>
    </div>

    {loading ? <div className="p-10 text-center text-sm text-gray-400">Загружаем данные рынка…</div> : error ? <div className="p-5 text-sm text-red-700 bg-red-50">{error}</div> : !profiles.length ? <div className="p-8 text-center text-sm text-gray-500">Данные рынка пока не загружены.</div> : <div className="p-4 md:p-6">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-7">
        <div className="p-4 rounded-xl bg-red-50"><div className="text-xs text-red-500 uppercase">Дефицитных навыков</div><div className="text-2xl font-bold text-red-700 mt-1">{critical.length}</div></div>
        <div className="p-4 rounded-xl bg-amber-50"><div className="text-xs text-amber-600 uppercase">Баланс рынка</div><div className="text-2xl font-bold text-[#B8860B] mt-1">{balance.length}</div></div>
        <div className="p-4 rounded-xl bg-blue-50"><div className="text-xs text-blue-500 uppercase">Профицитных навыков</div><div className="text-2xl font-bold text-blue-700 mt-1">{surplus.length}</div></div>
      </div>

      <div className="mb-4"><h4 className="font-bold text-[#000052]">Рыночный разрыв Skill Gap</h4><p className="text-xs text-gray-400 mt-1">Положительное значение = дефицит навыка на рынке. Отрицательное = профицит.</p></div>

      <div className="space-y-3">
        {ordered.map(stat => {
          const gap = stat.gap;
          const width = Math.min(100, Math.abs(gap ?? 0));
          const bar = gap === null ? 'bg-gray-300' : gap >= 20 ? 'bg-red-500' : gap <= -20 ? 'bg-[#46618C]' : 'bg-[#B8860B]';
          return <div key={stat.skill.name} className="rounded-xl border border-gray-100 bg-white p-3 sm:p-4">
            <div className="flex items-start justify-between gap-3"><div className="font-semibold text-[#000052] min-w-0 break-words">{stat.skill.name}</div><div className={`shrink-0 text-sm font-bold ${gap !== null && gap >= 20 ? 'text-red-600' : gap !== null && gap <= -20 ? 'text-blue-700' : 'text-[#000052]'}`}>{gap === null ? '—' : `${gap > 0 ? '+' : ''}${gap.toFixed(1)} п.п.`}</div></div>
            <div className="mt-3 h-2.5 bg-gray-100 rounded-full overflow-hidden"><div className={`${bar} h-full rounded-full`} style={{ width: `${width}%` }} /></div>
            <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs text-gray-500"><span>Вес роли <strong className="text-[#000052]">{Math.round(stat.skill.weight * 100)}%</strong></span><span>Вакансии <strong className="text-[#000052]">{stat.vacancies} ({stat.vacancyShare === null ? '—' : `${stat.vacancyShare.toFixed(1)}%`})</strong></span><span>Резюме <strong className="text-[#000052]">{stat.resumes} ({stat.resumeShare === null ? '—' : `${stat.resumeShare.toFixed(1)}%`})</strong></span></div>
            <div className="mt-2 text-xs text-gray-500">Медианная зарплата <strong className="text-[#000052]">{money(stat.vacancySalaryMedian)}</strong></div>
          </div>;
        })}
      </div>

      <div className="mt-7 rounded-2xl border border-[#B8860B]/20 bg-gradient-to-br from-[#fffaf0] to-white overflow-hidden">
        <div className="p-5 border-b border-[#B8860B]/10"><div className="flex items-start gap-3"><div className="w-10 h-10 rounded-xl bg-[#B8860B]/10 flex items-center justify-center shrink-0"><Lightbulb className="w-5 h-5 text-[#B8860B]" /></div><div><h4 className="font-bold text-[#000052] text-lg">Что делать по результатам рынка</h4><p className="text-sm text-gray-600 mt-1">Рынок показывает, где найм будет сложнее и где HRD стоит менять подход.</p></div></div></div>
        <div className="p-5 space-y-4">
          <div className="flex items-start gap-3"><Target className="w-5 h-5 text-red-600 mt-0.5 shrink-0" /><div><div className="font-semibold text-[#000052]">Главный приоритет</div><div className="text-sm text-gray-700 mt-1">{recommendations.length ? <>{recommendations[0].stat.skill.name}: <strong>+{recommendations[0].stat.gap!.toFixed(1)} п.п.</strong> дефицита при весе роли <strong>{Math.round(recommendations[0].stat.skill.weight * 100)}%</strong>. Кандидатов с подтверждённым опытом меньше, чем требует рынок. Поэтому расширять воронку вслепую не стоит: сначала нужно точнее проверять качество кандидата.</> : <>Критического дефицита нет. Основной резерв сейчас в точности оценки и в навыках с наибольшим весом для результата роли.</>}</div></div></div>
          {recommendations.length > 0 ? recommendations.slice(0, 3).map(item => <div key={item.stat.skill.name} className="rounded-xl bg-white border border-red-100 p-4"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><div className="flex items-start gap-2"><span className="w-6 h-6 rounded-full bg-red-50 text-red-700 text-xs font-bold flex items-center justify-center shrink-0">{item.rank}</span><span className="font-bold text-[#000052] break-words">{item.stat.skill.name}</span></div><div className="text-xs text-gray-500 mt-2">{item.intensity} приоритет · вес роли {Math.round(item.weight)}% · вакансии {item.stat.vacancyShare?.toFixed(1)}% · резюме {item.stat.resumeShare?.toFixed(1)}%</div></div><span className="text-red-600 font-bold whitespace-nowrap">+{item.stat.gap!.toFixed(1)} п.п.</span></div><div className="mt-3 p-3 rounded-lg bg-red-50/70 text-sm text-red-800"><strong>Что делать HRD:</strong> {item.action}</div>{item.stat.vacancySalaryMedian !== null && <div className="text-xs text-gray-500 mt-2">Медианная зарплата в вакансиях с этим навыком: <strong>{money(item.stat.vacancySalaryMedian)}</strong>.</div>}</div>) : <div className="rounded-xl bg-white border border-green-100 p-4"><div className="flex items-start gap-3"><CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" /><div><div className="font-semibold text-[#000052]">Рынок не показывает критического дефицита</div><div className="text-sm text-gray-600 mt-1">Фокусируйтесь на качестве оценки и на навыках с большим весом роли. Массово расширять требования не требуется.</div></div></div></div>}
          <div className="grid md:grid-cols-2 gap-3"><div className="p-4 rounded-xl bg-white border border-gray-100"><div className="flex items-center gap-2 text-sm font-semibold text-[#000052]"><TrendingUp className="w-4 h-4 text-red-500" />Для найма</div><div className="text-sm text-gray-600 mt-2">{recommendations.length ? `Сначала проверять ${recommendations.slice(0, 2).map(x => x.stat.skill.name).join(' и ')}. На интервью использовать короткие ситуационные кейсы и подтверждение реальных результатов, а не только наличие навыка в резюме.` : 'Использовать веса роли как приоритет при сравнении кандидатов.'}</div></div><div className="p-4 rounded-xl bg-white border border-gray-100"><div className="flex items-center gap-2 text-sm font-semibold text-[#000052]"><TrendingDown className="w-4 h-4 text-blue-600" />Для развития</div><div className="text-sm text-gray-600 mt-2">{topOpportunity ? `Развивать ${topOpportunity.skill.name}: он важен для роли (${Math.round(topOpportunity.skill.weight * 100)}%) и показывает положительный рыночный разрыв +${topOpportunity.gap!.toFixed(1)} п.п.` : 'Определить навыки с наибольшим весом роли и закрепить для них измеримые критерии результата.'}</div></div></div>
          <div className="flex items-start gap-3 pt-1"><AlertTriangle className="w-4 h-4 text-[#B8860B] mt-0.5 shrink-0" /><div className="text-xs text-gray-500">{marketSummary}</div></div>
        </div>
      </div>

      {connections.length > 0 && <div className="mt-7 rounded-2xl border border-gray-100 bg-white p-5">
        <div className="flex items-start gap-3 mb-4"><div className="w-9 h-9 rounded-xl bg-[#000052]/5 flex items-center justify-center shrink-0"><Target className="w-4 h-4 text-[#000052]" /></div><div><h4 className="font-bold text-[#000052]">Связи между навыками</h4><p className="text-sm text-gray-500 mt-1">Показывают, какие навыки являются опорными и какие результаты они поддерживают.</p></div></div>
        <div className="grid md:grid-cols-2 gap-3">{connections.map(connection => <div key={`${connection.from}-${connection.to}`} className="rounded-xl bg-gray-50 border border-gray-100 p-4"><div className="font-semibold text-[#000052] break-words">{connection.from}</div><div className="flex items-center gap-2 my-2 text-xs text-gray-500"><span className="px-2 py-1 rounded-lg bg-white border border-gray-200">{connection.verb}</span><span className="font-bold text-[#B8860B]">{connection.strength}%</span></div><div className="font-semibold text-[#000052] break-words">{connection.to}</div></div>)}</div>
        <div className="mt-4 p-4 rounded-xl bg-[#000052]/5 text-sm text-[#000052]"><strong>Что это значит для роли:</strong> наиболее сильные связи показывают, где развитие одного навыка может поддержать сразу несколько результатов. Поэтому при обучении и найме сначала стоит смотреть на опорные навыки, а не на каждый навык изолированно.</div>
      </div>}
    </div>}
  </section>;
}
